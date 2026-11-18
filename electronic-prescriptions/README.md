# FACILI-TA MED — Receita eletrônica (fundação isolada)

Esta branch prepara a área de Receita eletrônica sem alterar a branch `main` nem o Worker de produção.

## O que foi preparado
- Nova aba autenticada **Receita eletrônica** na interface.
- Identificação do prescritor carregada da conta atualmente autenticada.
- Estados visuais explícitos para certificado e integração SNCR ainda não configurados.
- Links para documentação técnica e avisos oficiais da Anvisa.
- Migração D1 separada para configurações individuais, prescrições eletrônicas e eventos de auditoria.
- Dados e registros sempre vinculados a `doctor_id`.

## O que NÃO está implementado
- Não há emissão real de receituário eletrônico.
- Não há chamadas à API do SNCR.
- Não há autenticação Gov.br.
- Não há captura, upload ou armazenamento de certificado ou chave privada.
- Não há assinatura digital nem validação de documentos.

A interface informa essas limitações para impedir que uma prévia seja confundida com uma receita oficial.

## Regras de segurança da arquitetura
1. Nunca armazenar chave privada, PIN, senha do certificado ou senha Gov.br.
2. Usar assinatura qualificada ICP-Brasil no fluxo apropriado, com a chave privada sob controle do médico (por exemplo, dispositivo/serviço de assinatura compatível).
3. Manter credenciais técnicas da integração SNCR somente em Secrets do Worker, nunca no frontend.
4. Vincular toda configuração, receita e evento ao `doctor_id` autenticado no servidor. Nunca aceitar `doctor_id` enviado pelo navegador como autoridade.
5. Não personalizar os modelos eletrônicos oficiais da Anvisa.
6. Separar emissão simples em PDF de receituário eletrônico oficial integrado ao SNCR.
7. Antes de produção: revisar documentação, termos de acesso, ambiente de treinamento, requisitos de homologação, regras de cada tipo de receituário, LGPD e controles de auditoria.

## Testes SNCR
Consulte [`TESTING.md`](./TESTING.md) para o plano de testes em três fases: simulador isolado, ambiente oficial de treinamento e validação de assinatura. A documentação da Anvisa confirma o ambiente SNCR de treinamento e descreve cadastro com Gov.br de treinamento, mas exige inscrição profissional ativa para concluir o cadastro do prescritor. Não há, no material consultado, confirmação de certificado ICP-Brasil fictício fornecido pela Anvisa. Sem prescritor de teste autorizado, a validação real da API fica limitada; usaremos simulação claramente identificada, sem validade legal.

## Migração D1
`migration.sql` é uma proposta ainda não aplicada. Não executar no D1 de produção até a implementação dos endpoints, revisão técnica e aprovação explícita.

## Fontes oficiais
- Portal SNCR: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr
- Documentação para serviços de prescrição eletrônica: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr
- Modelos eletrônicos: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/receituario-eletronico
- Situação e ocorrências do SNCR: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/situacao-do-sncr-ocorrencias-e-orientacoes

## Observação regulatória
A Anvisa informa que prescritores utilizam a plataforma de prescrição integrada e não fazem login diretamente no SNCR. Para Notificações de Receita eletrônicas, a numeração é vinculada ao prescritor pela Vigilância Sanitária; para RCE/RET eletrônicas, a numeração é gerada no fluxo integrado. Os modelos eletrônicos oficiais não podem ser personalizados.
