# Requisitos do produto

## Convencoes

Origem:

- **Confirmada**: declarada pelo usuario ou documentacao aprovada.
- **Inferida**: deduzida do codigo, banco, teste ou historico.
- **Proposta**: recomendacao ainda nao aprovada como comportamento do produto.
- **Indefinida**: depende de decisao humana.

Estado:

- **Implementado**: existe no codigo da baseline.
- **Parcial**: parte existe, mas faltam comportamento ou verificacao relevante.
- **Pendente**: nao foi localizado no codigo da baseline.
- **Bloqueado**: depende de decisao ou servico externo.
- **Nao verificado**: pode existir em ambiente, mas nao ha evidencia suficiente nesta revisao.

`Implementado` nao significa necessariamente `implantado em producao`. Consulte [traceability.md](traceability.md).

## Acesso e autorizacao

| ID | Requisito e criterio de aceite | Origem | Estado |
| --- | --- | --- | --- |
| REQ-001 | A interface web deve suportar OIDC Authorization Code com PKCE e cliente publico, sem `client_secret` no frontend. | Confirmada | Implementado |
| REQ-002 | `AUTH_MODE=hybrid` deve preservar login local explicito enquanto o SSO e validado; `oidc` deve desativar login local. | Confirmada | Implementado |
| REQ-003 | A API deve validar assinatura JWKS, issuer, audience, expiracao e permissoes do access token. | Confirmada | Implementado |
| REQ-004 | Rotas administrativas devem validar permissoes no backend e retornar 403 quando ausentes. | Confirmada | Implementado |
| REQ-005 | O Socket.IO do painel deve autenticar o Bearer token antes de liberar dados administrativos. | Confirmada | Implementado |
| REQ-006 | O Portal deve exibir o TrackFlow apenas a usuarios com `trackflow:view`; as demais acoes usam roles especificas. | Confirmada | Parcial |

## Rastreamento e operacao

| ID | Requisito e criterio de aceite | Origem | Estado |
| --- | --- | --- | --- |
| REQ-007 | O dashboard deve listar dispositivos ativos e atualizar suas localizacoes em tempo real. | Confirmada | Implementado |
| REQ-008 | O sistema deve preservar eventos de localizacao com posicao, instante e telemetria disponivel. | Inferida | Implementado |
| REQ-009 | O marcador deve usar heading estabilizado e nao girar falsamente quando parado. | Confirmada | Implementado |
| REQ-010 | Entregadores/dispositivos devem ser cadastraveis, editaveis e desativados sem apagar o historico. | Confirmada | Implementado |
| REQ-011 | Deve haver suporte aos tipos `motorcycle`, `car`, `boat`, `airplane` e `bus`. | Confirmada | Implementado |
| REQ-012 | Uma sessao publica deve mostrar somente o dispositivo vinculado, expirar e poder ser revogada. | Confirmada | Implementado |
| REQ-013 | Notificacoes devem registrar transicoes offline/online e leituras por usuario. | Inferida | Implementado |
| REQ-037 | O Android Monitor deve oferecer mapa somente leitura, filtros locais e central de notificacoes; autenticacao e comportamento em aparelho real devem ser validados antes de producao. | Inferida | Parcial |

## Dispositivos e integracoes tecnicas

| ID | Requisito e criterio de aceite | Origem | Estado |
| --- | --- | --- | --- |
| REQ-014 | Android e firmware devem enviar telemetria por HTTPS usando autenticacao tecnica, sem publicar diretamente no Kafka. | Confirmada | Implementado |
| REQ-015 | A API movel deve rejeitar requisicoes quando o segredo tecnico nao estiver configurado ou estiver incorreto. | Proposta | Pendente |
| REQ-016 | O broker Kafka deve permanecer interno; Kafka UI, quando publicada, deve usar OIDC e modo somente leitura. | Confirmada | Parcial |
| REQ-017 | A placa A7670SA deve obter GNSS e priorizar Wi-Fi salvo, 4G e contingencia Wi-Fi conforme configuracao. | Confirmada | Implementado |
| REQ-018 | O firmware deve validar o certificado HTTPS com uma CA confiavel em todos os transportes. | Confirmada | Pendente |
| REQ-019 | Segredos de Wi-Fi, APN e TrackFlow devem permanecer fora do Git. | Confirmada | Implementado |
| REQ-020 | Economia de bateria adaptativa, fila offline e medicao calibrada de carga devem ser validadas antes de integrar branches experimentais. | Confirmada | Parcial |

## Entregas e auditoria fiscal

| ID | Requisito e criterio de aceite | Origem | Estado |
| --- | --- | --- | --- |
| REQ-021 | Usuario com `trackflow:manage-deliveries` deve registrar uma entrega por NF e cancelar logicamente sem apagar auditoria. | Confirmada | Implementado |
| REQ-022 | A API de relatorios deve filtrar por periodo, entregador, NF e status, paginar e resumir totais. | Confirmada | Implementado |
| REQ-023 | A consulta de relatorios e a validacao Bling devem exigir `trackflow:view-reports`. | Confirmada | Implementado |
| REQ-024 | A validacao Bling deve preservar zeros a esquerda, consultar NF-e/NFC-e pelo n8n e armazenar apenas resultado sanitizado. | Confirmada | Implementado |
| REQ-025 | Falha de n8n/Bling nao deve impedir registro manual nem carregamento do relatorio. | Confirmada | Implementado |
| REQ-026 | A janela Bling deve considerar a data real de emissao, inclusive quando anterior ao lancamento da entrega. | Confirmada | Bloqueado |
| REQ-027 | A identidade fiscal deve evitar colisao entre documentos com mesmo numero, considerando os campos que forem aprovados. | Indefinida | Bloqueado |
| REQ-028 | O produto deve distinguir lancamento administrativo, emissao fiscal e entrega fisica comprovada. | Confirmada | Parcial |
| REQ-029 | O relatorio deve evoluir para cruzar o registro da NF com eventos de localizacao segundo regra ainda a aprovar. | Confirmada | Pendente |
| REQ-038 | A auditoria por localizacao deve apresentar evidencia ou anomalia e nao concluir fraude automaticamente. | Proposta | Pendente |

## Operacao, qualidade e continuidade

| ID | Requisito e criterio de aceite | Origem | Estado |
| --- | --- | --- | --- |
| REQ-030 | Imagens de producao devem usar tags imutaveis baseadas no commit; o compose deve fixar a versao aprovada. | Confirmada | Implementado |
| REQ-031 | O deploy deve manter PostgreSQL, Redis, Kafka e seus volumes; nenhum procedimento normal deve recriar volumes. | Confirmada | Implementado |
| REQ-032 | O pipeline deve validar TypeScript, Prisma e compose antes de publicar imagens. | Inferida | Implementado |
| REQ-033 | Testes funcionais relevantes devem participar do pipeline de `main`, e nao apenas existir no repositorio. | Proposta | Parcial |
| REQ-034 | Devem existir politicas aprovadas e testadas de backup/restore, retencao, RPO e RTO. | Proposta | Pendente |
| REQ-035 | Health checks e inicializacao devem falhar de forma observavel, sem repeticao infinita silenciosa de migracoes. | Proposta | Parcial |
| REQ-036 | Producao deve exigir credencial administrativa fornecida por secret, sem fallback conhecido no codigo ou compose. | Proposta | Pendente |

## Permissoes conhecidas

- `trackflow:view`
- `trackflow:manage-delivery-people`
- `trackflow:manage-deliveries`
- `trackflow:view-reports`
- `trackflow:create-public-links`
- `trackflow:revoke-public-links`
- `trackflow:manage-settings`
- `trackflow:admin`

O Portal/Keycloak e responsavel por atribuir e expor as roles OIDC. O TrackFlow continua responsavel por valida-las no backend.
