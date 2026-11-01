# Registro de decisoes do produto

Este documento evita transformar inferencias tecnicas em requisitos aprovados.

## Decisoes confirmadas

| ID | Decisao | Consequencia |
| --- | --- | --- |
| DEC-001 | Acesso corporativo usa Keycloak/OIDC; durante a transicao, `AUTH_MODE=hybrid` preserva login local explicito. | O login legado nao pode ser removido antes da validacao autorizada. |
| DEC-002 | Android e placa usam HTTPS e autenticacao tecnica; nao publicam diretamente no Kafka. | Kafka continua uma integracao interna de infraestrutura. |
| DEC-003 | Rastreamento publico usa token temporario e nao uma sessao corporativa. | O token deve limitar dados ao objeto vinculado. |
| DEC-004 | O Bling e consultado pelo n8n, que mantem OAuth fora do TrackFlow. | O TrackFlow armazena somente resultado sanitizado da auditoria. |
| DEC-005 | Numero de NF e unico para sempre no comportamento atual; cancelamento e logico. | Reutilizacao de uma NF cancelada permanece impedida ate nova decisao. |
| DEC-006 | `trackflow:manage-deliveries` e `trackflow:view-reports` sao permissoes distintas. | Lancar/cancelar nao concede automaticamente acesso ao relatorio. |
| DEC-007 | 4G da placa A7670SA foi validado em campo e nao e experimental por engano. | Documentacao nao deve rebaixar o transporte a uma fase futura. |

## Decisoes pendentes

| ID | Questao | Impacto |
| --- | --- | --- |
| PEND-001 | Qual data deve iniciar a busca Bling quando emissao e entrega ocorrerem em dias diferentes? | Contrato TrackFlow-n8n, UI, banco e testes. |
| PEND-002 | A identidade fiscal deve incluir emitente, serie, tipo e/ou chave de acesso alem do numero? | Restricao unica, migracao e prevencao de colisao. |
| PEND-003 | Qual evento comprova entrega: lancamento manual, horario informado, geolocalizacao, aceite ou combinacao? | Relatorios, auditoria e risco de fraude. |
| PEND-004 | Quais branches experimentais de firmware adaptativo, multiboard e bateria devem ser integradas? | Firmware de producao e testes de campo. |
| PEND-005 | Qual politica de retencao de localizacoes, notificacoes e auditoria deve vigorar? | Custo, privacidade e capacidade de investigacao. |
| PEND-006 | Quais RPO, RTO e frequencia de teste de restauracao sao exigidos? | Backup, recuperacao e operacao. |
| PEND-007 | Quando `AUTH_MODE` pode mudar de `hybrid` para `oidc`? | Continuidade de acesso e retirada do login local. |

## Propostas nao aprovadas

- `REQ-038`: usar proximidade geografica como sinal de auditoria, nunca como acusacao automatica de fraude.
- Criar identidade e endpoint proprios para boards, mantendo compatibilidade temporaria com a API movel.
- Executar todos os testes unitarios relevantes no pipeline de `main` antes da publicacao de imagens.
- Falhar de forma fechada quando `MOBILE_REGISTRATION_SECRET` nao estiver configurado.

Uma proposta so muda de secao depois de decisao explicita e registro da evidencia.
