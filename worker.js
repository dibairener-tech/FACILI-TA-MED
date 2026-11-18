/**
 * FACILI-TA MED — Cloudflare Worker
 * Configure CID_API_KEY em Settings > Variables and Secrets como Secret.
 * Nunca coloque a chave no GitHub ou no index.html.
 */
const CID_API_BASE = "https://southamerica-east1-no-api-br.cloudfunctions.net/apiCid";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET") {
      return json({ erro: "metodo_nao_permitido", mensagem: "Use GET." }, 405);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        app: "FACILI-TA MED",
        status: "online",
        recursos: ["consulta CID-10", "consulta CID-11", "calculadora de doses"]
      });
    }

    if (url.pathname === "/api/cid") {
      const code = (url.searchParams.get("code") || "").trim();
      const query = (url.searchParams.get("q") || "").trim();

      if (!env.CID_API_KEY) {
        return json({
          erro: "chave_nao_configurada",
          mensagem: "Configure CID_API_KEY nos Secrets deste Worker no Cloudflare."
        }, 503);
      }

      if (!code && query.length < 2) {
        return json({
          erro: "parametro_invalido",
          mensagem: "Informe um código CID ou uma descrição com pelo menos 2 caracteres."
        }, 400);
      }

      if (code && !/^[A-Za-z][0-9][0-9A-Za-z](?:\.?[0-9A-Za-z]{1,4})?$/.test(code)) {
        return json({
          erro: "codigo_invalido",
          mensagem: "Confira o formato do código CID informado."
        }, 400);
      }

      const path = code
        ? "/v1/cid10/" + encodeURIComponent(code.toUpperCase())
        : "/v1/busca?q=" + encodeURIComponent(query) + "&pagina=1";

      try {
        const upstream = await fetch(CID_API_BASE + path, {
          headers: {
            "X-API-Key": env.CID_API_KEY,
            "Accept": "application/json"
          }
        });

        const body = await upstream.text();
        let data;
        try { data = JSON.parse(body); }
        catch { data = { mensagem: "A API CID retornou uma resposta inesperada." }; }

        return json(data, upstream.status, {
          "X-CID-API-Status": String(upstream.status)
        });
      } catch {
        return json({
          erro: "falha_na_consulta",
          mensagem: "Não foi possível acessar a base CID agora. Tente novamente."
        }, 502);
      }
    }

    return json({
      erro: "rota_nao_encontrada",
      mensagem: "Rota não encontrada. Use /api/cid?code=A00 ou /api/cid?q=diabetes."
    }, 404);
  }
};
