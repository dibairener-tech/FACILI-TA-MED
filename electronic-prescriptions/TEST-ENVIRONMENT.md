# Ambiente isolado de teste — Receita Eletrônica

Este conjunto é separado da aplicação e do Worker de produção. Não mesclar alterações de `index.html` ou `worker.js` de produção para testar.

## 1. Criar D1 exclusivo
No Cloudflare Dashboard:
1. Workers & Pages → D1 SQL Database → Create database.
2. Nome sugerido: `facilita-med-test-db`.
3. Não selecione nem reutilize `facilita-med-db` (produção).

## 2. Preparar o D1 de teste
No console SQL do banco novo, execute, nesta ordem, o conteúdo integral de:
1. `schema.sql` (já existente na raiz do repositório).
2. `admin-migration.sql` (já existente na raiz).
3. `electronic-prescriptions/migration.sql` (incluída neste PR).

Esses scripts criam as tabelas necessárias apenas no banco novo. Não executar no D1 de produção.

## 3. Criar Worker separado
Crie um Worker chamado `facilita-med-api-test` e publique o conteúdo de `worker-test.js`.
Em Settings → Bindings, adicione D1 Database:
- Variable name: `DB`
- Database: `facilita-med-test-db`

Não configure secrets de produção. O CID não é necessário para estes testes.

## 4. Configurar a página de teste
Abra `preview/receita-eletronica-teste.html` e substitua somente:
`https://SUBSTITUA-PELA-URL-DO-WORKER-DE-TESTE`
pela URL `workers.dev` que o Cloudflare mostrar para o Worker de teste.

A página de teste é separada da página principal e só usa a API de teste.

## 5. Testes
1. Criar uma conta com e-mail fictício controlado por você e senha de teste (não reutilizar senha real).
2. Completar perfil com dados claramente fictícios; não usar CRM de terceiros.
3. Abrir Receita Eletrônica, executar a simulação e confirmar os cinco passos aprovados.
4. Salvar metadados fictícios de certificado, sem enviar arquivo, PIN, senha ou chave privada.
5. Atualizar a página e confirmar que os metadados persistem.
6. Criar segunda conta de teste e confirmar que não enxerga configurações/eventos da primeira.

## Limites
- O Worker de teste não chama a API SNCR, Gov.br ou qualquer endpoint de produção.
- A simulação não gera numeração oficial, receita ou assinatura.
- A identificação do certificado é apenas declarada e não verificada.
- Não usar dados reais de pacientes nem credenciais pessoais.
