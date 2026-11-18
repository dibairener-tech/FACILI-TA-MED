/**
 * FACILI-TA MED — Cloudflare Worker + D1
 * Configure D1 binding com o nome DB.
 * Mantenha CID_API_KEY como Secret apenas se a rota CID externa for utilizada.
 */
const CID_API_BASE="https://southamerica-east1-no-api-br.cloudfunctions.net/apiCid";
const ALLOWED=new Set(["https://dibairener-tech.github.io"]);
const SESSION_SECONDS=604800,ITERATIONS=100000;
const headers=o=>({"Access-Control-Allow-Origin":ALLOWED.has(o)?o:"https://dibairener-tech.github.io","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization","Access-Control-Max-Age":"86400","Vary":"Origin"});
const json=(d,s=200,o="")=>new Response(JSON.stringify(d),{status:s,headers:{...headers(o),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const error=(m,s,o,c="error")=>json({error:c,message:m},s,o);
const enc=s=>new TextEncoder().encode(s),hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function sha(s){return hex(await crypto.subtle.digest("SHA-256",enc(s)));}
function token(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
async function derive(p,saltHex){const salt=saltHex?Uint8Array.from(saltHex.match(/.{2}/g),x=>parseInt(x,16)):crypto.getRandomValues(new Uint8Array(16));const k=await crypto.subtle.importKey("raw",enc(p),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:ITERATIONS},k,256);return {hash:hex(bits),salt:hex(salt)};}
const getToken=r=>{const h=r.headers.get("Authorization")||"";return h.startsWith("Bearer ")?h.slice(7):"";};
async function auth(r,env){const t=getToken(r);if(!t)return null;return await env.DB.prepare("SELECT d.id,d.email,d.doctor_name,d.crm,d.phone,d.cpf,d.specialty,d.clinic_address FROM sessions s JOIN doctors d ON d.id=s.doctor_id WHERE s.token_hash=? AND s.expires_at>?").bind(await sha(t),Math.floor(Date.now()/1000)).first();}
async function limited(env,email){const n=Math.floor(Date.now()/1000),w=900,r=await env.DB.prepare("SELECT attempts,window_started FROM auth_attempts WHERE email=?").bind(email).first();if(r&&n-r.window_started<w&&r.attempts>=8)return true;if(!r||n-r.window_started>=w)await env.DB.prepare("INSERT INTO auth_attempts(email,attempts,window_started) VALUES(?,1,?) ON CONFLICT(email) DO UPDATE SET attempts=1,window_started=excluded.window_started").bind(email,n).run();else await env.DB.prepare("UPDATE auth_attempts SET attempts=attempts+1 WHERE email=?").bind(email).run();return false;}
const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=254;
async function handler(req,env){
 const o=req.headers.get("Origin")||"",u=new URL(req.url),p=u.pathname;
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(o)});
 if(!env.DB)return error("Configure o binding D1 DB no Worker.",503,o,"d1_not_configured");
 if(p==="/"||p==="/health")return json({app:"FACILI-TA MED",status:"online",database:"D1"},200,o);
 if(p==="/api/cid"&&req.method==="GET"){
  const code=(u.searchParams.get("code")||"").trim(),q=(u.searchParams.get("q")||"").trim();
  if(!env.CID_API_KEY)return error("CID_API_KEY não configurada.",503,o);
  if(!code&&q.length<2)return error("Informe código ou descrição com pelo menos 2 caracteres.",400,o);
  if(code&&!/^[A-Za-z][0-9][0-9A-Za-z](?:\.?[0-9A-Za-z]{1,4})?$/.test(code))return error("Código CID inválido.",400,o);
  try{const path=code?"/v1/cid10/"+encodeURIComponent(code.toUpperCase()):"/v1/busca?q="+encodeURIComponent(q)+"&pagina=1",r=await fetch(CID_API_BASE+path,{headers:{"X-API-Key":env.CID_API_KEY,"Accept":"application/json"}});let d;try{d=JSON.parse(await r.text())}catch{d={message:"Resposta CID inesperada."}}return json(d,r.status,o)}catch{return error("Falha ao consultar a base CID.",502,o);}
 }
 let b={};if(req.method==="POST"||req.method==="PUT"){try{b=await req.json()}catch{return error("JSON inválido.",400,o);}}
 if(p==="/api/auth/register"&&req.method==="POST"){
  const email=String(b.email||"").trim().toLowerCase(),pw=String(b.password||"");
  if(!validEmail(email))return error("Informe um e-mail válido.",400,o);
  if(pw.length<8||pw.length>128)return error("A senha deve ter entre 8 e 128 caracteres.",400,o);
  if(await limited(env,email))return error("Muitas tentativas. Aguarde 15 minutos.",429,o,"rate_limited");
  if(await env.DB.prepare("SELECT id FROM doctors WHERE email=?").bind(email).first())return error("Não foi possível criar a conta com esses dados. Verifique o e-mail.",409,o,"account_exists");
  const x=await derive(pw),id=crypto.randomUUID();
  try{await env.DB.prepare("INSERT INTO doctors(id,email,password_hash,password_salt) VALUES(?,?,?,?)").bind(id,email,x.hash,x.salt).run();}catch{return error("Não foi possível criar a conta.",409,o);}
  await env.DB.prepare("DELETE FROM auth_attempts WHERE email=?").bind(email).run();
  const t=token(),exp=Math.floor(Date.now()/1000)+SESSION_SECONDS;await env.DB.prepare("INSERT INTO sessions(token_hash,doctor_id,expires_at) VALUES(?,?,?)").bind(await sha(t),id,exp).run();return json({token:t,expiresAt:exp},200,o);
 }
 if(p==="/api/auth/login"&&req.method==="POST"){
  const email=String(b.email||"").trim().toLowerCase(),pw=String(b.password||"");if(!validEmail(email)||!pw)return error("Informe e-mail e senha.",400,o);
  if(await limited(env,email))return error("Muitas tentativas. Aguarde 15 minutos.",429,o,"rate_limited");
  const row=await env.DB.prepare("SELECT id,password_hash,password_salt FROM doctors WHERE email=?").bind(email).first(),x=row?await derive(pw,row.password_salt):null;
  if(!row||x.hash!==row.password_hash)return error("E-mail ou senha incorretos.",401,o,"invalid_credentials");
  await env.DB.prepare("DELETE FROM auth_attempts WHERE email=?").bind(email).run();const t=token(),exp=Math.floor(Date.now()/1000)+SESSION_SECONDS;await env.DB.prepare("INSERT INTO sessions(token_hash,doctor_id,expires_at) VALUES(?,?,?)").bind(await sha(t),row.id,exp).run();return json({token:t,expiresAt:exp},200,o);
 }

 // Administração MASTER: autenticação e sessão independentes das contas médicas.
 if(p==="/api/admin/login"&&req.method==="POST"){
  const username=String(b.username||"").trim(),password=String(b.password||"");
  if(!env.ADMIN_USERNAME||!env.ADMIN_PASSWORD)return error("Acesso MASTER ainda não configurado no Worker.",503,o,"admin_not_configured");
  if(!username||!password)return error("Informe usuário e senha.",400,o);
  if(await limited(env,"admin:"+username))return error("Muitas tentativas. Aguarde 15 minutos.",429,o,"rate_limited");
  const [givenUser,expectedUser,givenPass,expectedPass]=await Promise.all([sha(username),sha(env.ADMIN_USERNAME),sha(password),sha(env.ADMIN_PASSWORD)]);
  if(givenUser!==expectedUser||givenPass!==expectedPass)return error("Usuário ou senha inválidos.",401,o,"invalid_credentials");
  await env.DB.prepare("DELETE FROM auth_attempts WHERE email=?").bind("admin:"+username).run();
  const t=token(),exp=Math.floor(Date.now()/1000)+SESSION_SECONDS;
  await env.DB.prepare("INSERT INTO admin_sessions(token_hash,expires_at) VALUES(?,?)").bind(await sha(t),exp).run();
  return json({token:t,expiresAt:exp},200,o);
 }
 const adminToken=getToken(req);
 const adminSession=adminToken?await env.DB.prepare("SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>?").bind(await sha(adminToken),Math.floor(Date.now()/1000)).first():null;
 if(p==="/api/admin/logout"&&req.method==="POST"){
  if(adminToken)await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await sha(adminToken)).run();
  return json({ok:true},200,o);
 }
 if(p==="/api/admin/me"&&req.method==="GET"){
  if(!adminSession)return error("Sessão MASTER inválida ou expirada.",401,o,"unauthorized");
  return json({authenticated:true},200,o);
 }
 if(p.startsWith("/api/admin/")){
  if(!adminSession)return error("Acesso MASTER não autorizado.",401,o,"unauthorized");
  if(p==="/api/admin/doctors"&&req.method==="GET"){
   const rows=await env.DB.prepare("SELECT id,email,doctor_name,crm,phone,cpf,specialty,clinic_address,created_at,updated_at,(SELECT COUNT(*) FROM prescriptions p WHERE p.doctor_id=doctors.id) AS recipes_count FROM doctors ORDER BY created_at DESC").all();
   return json({doctors:rows.results||[]},200,o);
  }
  const am=p.match(/^\/api\/admin\/doctors\/([0-9a-f-]{36})$/i);
  if(am&&req.method==="PUT"){
   const id=am[1],email=String(b.email||"").trim().toLowerCase(),name=String(b.doctor_name||"").trim().slice(0,300),crm=String(b.crm||"").trim().slice(0,100);
   if(!validEmail(email))return error("Informe um e-mail válido.",400,o);
   try{
    const result=await env.DB.prepare("UPDATE doctors SET email=?,doctor_name=?,crm=?,phone=?,cpf=?,specialty=?,clinic_address=?,updated_at=datetime('now') WHERE id=?").bind(email,name,crm,String(b.phone||"").trim().slice(0,100),String(b.cpf||"").trim().slice(0,100),String(b.specialty||"").trim().slice(0,200),String(b.clinic_address||"").trim().slice(0,300),id).run();
    if(!result.meta?.changes)return error("Cadastro não encontrado.",404,o);
    return json({ok:true},200,o);
   }catch(err){if(/unique/i.test(err?.message||""))return error("Este e-mail já está em uso por outra conta.",409,o);throw err;}
  }
  if(am&&req.method==="DELETE"){
   const exists=await env.DB.prepare("SELECT id FROM doctors WHERE id=?").bind(am[1]).first();
   if(!exists)return error("Cadastro não encontrado.",404,o);
   await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE doctor_id=?").bind(am[1]),
    env.DB.prepare("DELETE FROM prescriptions WHERE doctor_id=?").bind(am[1]),
    env.DB.prepare("DELETE FROM doctors WHERE id=?").bind(am[1])
   ]);
   return json({ok:true},200,o);
  }
  return error("Rota administrativa não encontrada.",404,o,"not_found");
 }
 const doctor=await auth(req,env);
 if(p.startsWith("/api/")&&!doctor)return error("Sessão inválida ou expirada. Entre novamente.",401,o,"unauthorized");
 if(p==="/api/auth/me"&&req.method==="GET")return json({doctor},200,o);
 if(p==="/api/auth/logout"&&req.method==="POST"){const t=getToken(req);if(t)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha(t)).run();return json({ok:true},200,o);}
 if(p==="/api/profile"&&req.method==="GET"){const profile=await env.DB.prepare("SELECT doctor_name,crm,phone,cpf,specialty,clinic_address FROM doctors WHERE id=?").bind(doctor.id).first();return json({profile},200,o);}
 if(p==="/api/profile"&&req.method==="PUT"){const f=["doctor_name","crm","phone","cpf","specialty","clinic_address"],v=f.map(k=>String(b[k]||"").trim().slice(0,300));if(!v[0]||!v[1])return error("Nome e CRM/UF são obrigatórios.",400,o);await env.DB.prepare("UPDATE doctors SET doctor_name=?,crm=?,phone=?,cpf=?,specialty=?,clinic_address=?,updated_at=datetime('now') WHERE id=?").bind(...v,doctor.id).run();return json({ok:true},200,o);}
 if(p==="/api/electronic/settings"&&req.method==="GET"){
  let settings=await env.DB.prepare("SELECT signature_method,certificate_subject,certificate_serial,certificate_fingerprint,certificate_valid_until,certificate_status,sncr_status,created_at,updated_at FROM doctor_electronic_settings WHERE doctor_id=?").bind(doctor.id).first();
  if(!settings)settings={signature_method:"icp_brasil",certificate_subject:"",certificate_serial:"",certificate_fingerprint:"",certificate_valid_until:"",certificate_status:"not_configured",sncr_status:"not_connected"};
  return json({settings,professional:{name:doctor.doctor_name||"",crm:doctor.crm||""},integration:{mode:"disabled",api_connected:false,official_issuance_enabled:false,reason:"Ambiente oficial de treinamento e fluxo de assinatura ainda aguardam confirmação técnica."}},200,o);
 }
 if(p==="/api/electronic/settings"&&req.method==="PUT"){
  const subject=String(b.certificate_subject||"").trim().slice(0,300),serial=String(b.certificate_serial||"").trim().slice(0,160),fingerprint=String(b.certificate_fingerprint||"").replace(/[^a-fA-F0-9:]/g,"").slice(0,128),validUntil=String(b.certificate_valid_until||"").slice(0,10);
  if(!doctor.doctor_name||!doctor.crm)return error("Complete primeiro seu nome e CRM no perfil profissional.",400,o);
  if(validUntil&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(validUntil))return error("Data de validade do certificado inválida.",400,o);
  if([subject,serial,fingerprint,validUntil].some(v=>v.length>0)&&(!subject||!serial||!fingerprint||!validUntil))return error("Para registrar os metadados, preencha titular, número de série, impressão digital e validade.",400,o);
  const certStatus=subject&&serial&&fingerprint&&validUntil?"declared_not_verified":"not_configured";
  await env.DB.prepare("INSERT INTO doctor_electronic_settings(doctor_id,signature_method,certificate_subject,certificate_serial,certificate_fingerprint,certificate_valid_until,certificate_status,sncr_status,updated_at) VALUES(?,'icp_brasil',?,?,?,?,?,'not_connected',datetime('now')) ON CONFLICT(doctor_id) DO UPDATE SET certificate_subject=excluded.certificate_subject,certificate_serial=excluded.certificate_serial,certificate_fingerprint=excluded.certificate_fingerprint,certificate_valid_until=excluded.certificate_valid_until,certificate_status=excluded.certificate_status,updated_at=datetime('now')").bind(doctor.id,subject,serial,fingerprint,validUntil,certStatus).run();
  return json({ok:true,certificate_status:certStatus,sncr_status:"not_connected"},200,o);
 }
 if(p==="/api/electronic/simulate"&&req.method==="POST"){
  const id=crypto.randomUUID(),details={mode:"simulation",external_request:false,official_number_created:false,document_signed:false};
  await env.DB.prepare("INSERT INTO electronic_prescription_events(id,doctor_id,prescription_id,event_type,event_details) VALUES(?,?,NULL,'internal_simulation',?)").bind(id,doctor.id,JSON.stringify(details)).run();
  return json({ok:true,simulation:true,legal_validity:false,steps:[
   {status:"passed",message:"Sessão autenticada e vinculada ao profissional."},
   {status:"passed",message:"Isolamento por doctor_id confirmado no servidor."},
   {status:"passed",message:"Nenhuma chamada externa ao SNCR foi realizada."},
   {status:"passed",message:"Nenhum número oficial foi solicitado ou criado."},
   {status:"passed",message:"Nenhum certificado, PIN ou chave privada foi acessado."}
  ],message:"SIMULAÇÃO — NÃO É RECEITA. A API oficial e a assinatura ainda não foram conectadas."},200,o);
 }
 if(p==="/api/electronic/events"&&req.method==="GET"){
  const rows=await env.DB.prepare("SELECT id,event_type,event_details,created_at FROM electronic_prescription_events WHERE doctor_id=? ORDER BY created_at DESC LIMIT 50").bind(doctor.id).all();
  return json({events:rows.results||[]},200,o);
 }
 if(p==="/api/recipes"&&req.method==="GET"){
  const q=(u.searchParams.get("q")||"").trim().slice(0,100),from=(u.searchParams.get("from")||"").slice(0,10),to=(u.searchParams.get("to")||"").slice(0,10);let sql="SELECT id,patient_name,patient_birth,issued_at,created_at FROM prescriptions WHERE doctor_id=?",a=[doctor.id];
  if(q){sql+=" AND patient_name LIKE ?";a.push("%"+q.replace(/[%_\\]/g,"\\$&")+"%");}if(from){sql+=" AND issued_at>=?";a.push(from);}if(to){sql+=" AND issued_at<=?";a.push(to);}sql+=" ORDER BY issued_at DESC,created_at DESC LIMIT 300";const rows=await env.DB.prepare(sql).bind(...a).all();return json({recipes:rows.results||[]},200,o);
 }
 if(p==="/api/recipes"&&req.method==="POST"){
  const patient=String(b.patient_name||"").trim().slice(0,200),birth=String(b.patient_birth||"").slice(0,10),issued=String(b.issued_at||"").slice(0,10),payload=b.payload;
  if(!patient||!/^\d{4}-\d{2}-\d{2}$/.test(issued)||!payload||typeof payload!=="object")return error("Dados da receita incompletos.",400,o);
  const data=JSON.stringify(payload);if(data.length>60000)return error("Receita muito extensa.",413,o);const id=crypto.randomUUID();await env.DB.prepare("INSERT INTO prescriptions(id,doctor_id,patient_name,patient_birth,issued_at,payload) VALUES(?,?,?,?,?,?)").bind(id,doctor.id,patient,birth,issued,data).run();return json({ok:true,id},201,o);
 }
 const m=p.match(/^\/api\/recipes\/([0-9a-f-]{36})$/i);
 if(m&&req.method==="GET"){const row=await env.DB.prepare("SELECT id,patient_name,patient_birth,issued_at,payload FROM prescriptions WHERE id=? AND doctor_id=?").bind(m[1],doctor.id).first();if(!row)return error("Receita não encontrada.",404,o);return json({recipe:{...row,payload:JSON.parse(row.payload)}},200,o);}
 if(m&&req.method==="DELETE"){const r=await env.DB.prepare("DELETE FROM prescriptions WHERE id=? AND doctor_id=?").bind(m[1],doctor.id).run();if(!r.meta?.changes)return error("Receita não encontrada.",404,o);return json({ok:true},200,o);}
 return error("Rota não encontrada.",404,o,"not_found");
}
export default {async fetch(req,env){try{return await handler(req,env);}catch(err){console.error("FACILITA_MED_WORKER_ERROR",JSON.stringify({path:new URL(req.url).pathname,method:req.method,name:err?.name||"Error",message:err?.message||String(err),stack:err?.stack||""}));return json({error:"internal_error",message:"Erro interno. Consulte os logs do Worker."},500,req.headers.get("Origin")||"");}}};
