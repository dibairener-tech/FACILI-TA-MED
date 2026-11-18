# Plano de testes — Receita Eletrônica / SNCR

Este plano é exclusivo da branch `feature/receita-eletronica-foundation`. Não habilita emissão em produção e não deve ser usado com pacientes reais.

## 1. O que a documentação oficial confirma

A instrução oficial da Anvisa (API SNCR v1.0, julho/2026) informa:

- Ambiente de treinamento do SNCR: https://sncr-treinamento.anvisa.gov.br/
- O cadastro de prescritor no treinamento começa com “Entrar com gov.br”.
- O fluxo descrito utiliza o ambiente de treinamento do Gov.br; o manual apresenta respostas de demonstração para a etapa de validação cadastral.
- O cadastro só é concluído se o profissional tiver inscrição ativa em conselho consultado (CFM, CFMV ou CFO).
- O credenciamento prévio da plataforma não é necessário, segundo a versão 1.0 do manual.
- A API descrita no manual usa autenticação integrada e token Bearer; o exemplo de URL base publicado é https://sncr-api.apps.anvisa.gov.br.

Documento oficial: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr/instrucoes-de-integracao-api-sncr-v1-0.pdf

## 2. Limite para testes sem médico real

O manual não apresenta um prescritor fictício com registro profissional válido, nem confirma a distribuição de certificado ICP-Brasil de teste. Como o SNCR valida a inscrição ativa no conselho, não devemos inventar CRM/CPF nem usar dados de terceiros para tentar contornar essa validação.

Portanto, sem um médico voluntário com inscrição ativa, podemos testar a interface, os fluxos internos, os estados, a montagem dos dados, o tratamento de erros e a assinatura simulada. Não podemos afirmar que uma chamada real de emissão no SNCR foi homologada.

## 3. Fases de teste

### Fase A — simulador local (sem comunicação externa)
- Usar somente prescritor e paciente fictícios, claramente marcados como TESTE.
- Não chamar qualquer domínio da Anvisa.
- Gerar identificadores fictícios com prefixo `TEST-`; nunca apresentá-los como numeração SNCR.
- Simular sucesso, falha de validação, sessão expirada, indisponibilidade e duplicidade.
- Simular assinatura apenas para testar o fluxo da aplicação; o documento deve conter marca d'água “SIMULAÇÃO — SEM VALIDADE LEGAL”.
- Não gerar QR Code de consulta SNCR nem documento que possa ser confundido com receita oficial.

### Fase B — treinamento oficial SNCR
Somente quando houver um prescritor de teste autorizado pelo próprio ambiente e as condições oficiais estiverem disponíveis:
- Entrar pelo portal de treinamento indicado pela Anvisa.
- Concluir o cadastro de prescritor conforme as instruções oficiais.
- Confirmar com a Anvisa/ambiente de treinamento se há credenciais de teste e se é exigido certificado para cada operação.
- Configurar a URL de treinamento confirmada em configuração isolada; nunca inferir ou reutilizar a URL de produção.
- Executar primeiro consultas e validações não emissoras, se a API disponibilizar essas operações.
- Fazer qualquer emissão de treinamento apenas com dados fictícios e dentro das regras expressas do ambiente.

### Fase C — assinatura
- A documentação consultada descreve o login Gov.br e a obtenção de token, mas não comprova que esse login substitua a assinatura qualificada exigida para os receituários abrangidos.
- Não tratar autenticação Gov.br como assinatura ICP-Brasil.
- Não armazenar certificado, chave privada, PIN ou senha do Gov.br no Worker, D1 ou navegador.
- A integração com assinatura qualificada real só será implementada após confirmação do mecanismo aceito pela Anvisa e escolha de um fluxo compatível com o controle da chave pelo prescritor.

## 4. Barreiras obrigatórias

- O modo de simulação deve ser explicitamente identificado na interface.
- Simulação nunca chama a API real e nunca usa números reais.
- O modo de treinamento deve usar configuração separada da produção e falhar fechado se a URL não estiver explicitamente configurada.
- Não aplicar a migração ao D1 de produção durante esta fase.
- Não alterar `main`, o Worker de produção ou secrets do Cloudflare sem autorização explícita.
- Não mesclar o PR antes da revisão e aprovação do usuário.

## 5. Próximo passo técnico

Implementar um adaptador de simulação isolado e testes automatizados para os fluxos internos. Em paralelo, obter a especificação completa da API e confirmar com a Anvisa a URL exata do backend de treinamento, os dados de prescritor de teste e os requisitos de assinatura. Só então implementar o adaptador SNCR de treinamento.
