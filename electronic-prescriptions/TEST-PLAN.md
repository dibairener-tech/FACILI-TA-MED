# Plano de testes — Receita Eletrônica / SNCR

**Escopo:** somente ambiente de treinamento, contas e pacientes fictícios. Nenhuma emissão em produção.

## O que a Anvisa disponibiliza

- Portal SNCR de treinamento: https://sncr-treinamento.anvisa.gov.br/
- Manual oficial: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr/instrucoes-de-integracao-api-sncr-v1-0.pdf
- O manual descreve o Gov.br de treinamento e fornece respostas fictícias para as perguntas de validação da conta: mãe MAMAE, mês JANEIRO, dia 01, ano 1980. A conta é ativada por e-mail ou SMS.
- O manual também exige que o prescritor possua inscrição ativa em conselho profissional consultado (CFM, CFMV ou CFO). Ele não apresenta uma lista de médicos/CRMs fictícios fornecidos pela Anvisa.

## Limites que precisamos respeitar

1. Não inventar CPF, CRM, CNPJ, número de conselho ou certificado para tentar passar pela validação do SNCR.
2. Não usar dados de médicos reais sem autorização expressa.
3. Não solicitar nem guardar senha Gov.br, PIN ou chave privada de certificado no FACILI-TA MED.
4. Não chamar a API de produção durante os testes.
5. Não assumir que o login Gov.br equivale a assinatura qualificada ICP-Brasil.
6. Não emitir, imprimir ou compartilhar documentos de teste como se fossem receitas válidas.

## Bloqueios técnicos identificados

- O PDF de integração mostra a URL de API https://sncr-api.apps.anvisa.gov.br como exemplo, mas não informa de forma inequívoca a URL-base equivalente do ambiente de treinamento.
- O manual informa suporte a domínios .br; o GitHub Pages atual está em github.io. Precisamos confirmar se o domínio atual é aceito ou usar um domínio próprio .br para o callback client_url.
- O PDF apresenta o fluxo de login e um exemplo de endpoint de receita branca, mas não especifica nele todo o ciclo de assinatura qualificada ICP-Brasil nem todos os modelos/rotas de receituário.
- A página de treinamento recusou acesso automatizado durante a consulta; o portal precisa ser aberto manualmente no navegador para confirmar a disponibilidade e os passos atuais.

## Fases de teste propostas

### Fase 1 — testes internos sem comunicação externa

- Validar a navegação e a identificação individual do médico na sessão FACILI-TA MED.
- Criar dados totalmente fictícios e marcados visualmente como SIMULAÇÃO — NÃO É RECEITA.
- Simular estados de integração (não conectado, aguardando autenticação, autenticado em sandbox, erro de validação, emissão simulada), sem gerar numeração SNCR real.
- Confirmar que nenhuma chave, senha ou token sensível é persistido no D1.

### Fase 2 — autenticação no Gov.br de treinamento

- Confirmar com a Anvisa se há identidade de prescritor de teste ou procedimento para desenvolvedores sem CRM ativo próprio.
- Se for exigida inscrição ativa, só avançar com profissional voluntário e autorização expressa, usando a conta/identidade dele no ambiente de treinamento. Não compartilhar credenciais com o desenvolvedor.
- Confirmar a URL-base da API de treinamento, a lista de domínios permitidos e o callback autorizado.

### Fase 3 — integração API em sandbox

- Implementar apenas as rotas e payloads confirmados pela documentação oficial do ambiente de treinamento.
- Usar paciente fictício, conferir resposta e registrar apenas metadados técnicos mínimos.
- Testar token expirado, falhas de autenticação, erros de validação e idempotência.

### Fase 4 — assinatura e documento

- Obter a especificação oficial do fluxo de assinatura para cada tipo de receituário.
- Validar certificado e assinatura no ambiente apropriado, sem exportar ou armazenar chave privada/PIN.
- Comparar o documento com o modelo eletrônico oficial vigente e validar QR Code/consulta, se aplicável.

## Critérios para sair do modo de teste

Nenhum uso em produção antes de: confirmação oficial de homologação/credenciamento aplicável; integração testada no ambiente de treinamento; assinatura e validação comprovadas; revisão de segurança, LGPD e auditoria; aprovação explícita do responsável pelo FACILI-TA MED.

## Fonte técnica principal

Anvisa, Instruções de apoio ao processo de integração — JUL/2026 — v1.0, especialmente seções 2 a 4. URL: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr/instrucoes-de-integracao-api-sncr-v1-0.pdf
