# Matriz de rastreabilidade

Baseline: `d2018bfe922d07519c5d0bd49e64954d2141f57d`.

Esta matriz separa quatro fatos: requisito documentado, implementacao localizada, verificacao existente e implantacao. A coluna `Producao` fica `Nao verificada` quando a revisao nao inspecionou o ambiente em execucao.

| Requisitos | Implementacao principal | Teste ou evidencia | Estado na baseline | Producao |
| --- | --- | --- | --- | --- |
| REQ-001 a REQ-004, REQ-006 | `apps/web/src/auth.ts`, `apps/web/src/pages/Login.tsx`, `services/backend/src/auth.ts`, `services/backend/src/routes.ts` | Typecheck; `docs/authentication-oidc.md` | Implementado; integracao do cartao do Portal e externa | Nao verificada |
| REQ-005 | `apps/web/src/socket.ts`, `services/backend/src/realtime.ts` | Typecheck; autenticacao ocorre no `dashboard:join` | Implementado; renovacao/expiracao em conexao longa requer teste | Nao verificada |
| REQ-007 a REQ-011 | `services/backend/src/location-store.ts`, `services/backend/src/heading.ts`, `apps/web/src/components/TrackingMap.tsx`, `SettingsModal.tsx` | `services/backend/test/heading.test.mjs`; simuladores manuais | Implementado | Nao verificada |
| REQ-012 | `services/backend/src/tracking-sessions.ts`, `apps/web/src/pages/PublicTracking.tsx`, `services/backend/src/realtime.ts` | Roteiro manual em `docs/testing.md` | Implementado | Nao verificada |
| REQ-013 | `services/backend/src/offline-monitor.ts`, `notifications.ts`, migrations de notificacao, app `:monitor` | `test/notification-transition.test.mjs`; documentos Android Monitor | Implementado no codigo; validacao completa de dispositivo pendente | Nao verificada |
| REQ-037 | `apps/android/monitor`, `docs/android-monitor-handoff-2026-09-04.md` | Builds e validacoes parciais documentadas; login e transicoes em aparelho permanecem pendentes | Parcial | Nao verificada |
| REQ-014, REQ-015 | `services/backend/src/mobile.ts`, Android `TrackingService.kt`, firmware `src/main.cpp` | Android build/manual; firmware HTTP 202 documentado | REQ-014 implementado; REQ-015 pendente | Nao verificada |
| REQ-016 | `services/backend/src/kafka.ts`, `docs/kafka-security.md`, `infra/portainer/kafka-ui-secure.example.yml` | Compose e roteiro operacional | Broker interno documentado; protecao da UI depende do ambiente | Nao verificada |
| REQ-017, REQ-019 | `firmware/gps-board/src/main.cpp`, `TransportPriority`, `WifiFailover` | Testes nativos; teste de campo 4G documentado | Implementado | Nao verificada |
| REQ-018 | `firmware/gps-board/src/main.cpp` | Auditoria encontrou caminhos sem verificacao de certificado | Pendente | Nao verificada |
| REQ-020 | Branches de estudo e documentos de firmware; nao integrados na baseline | Evidencias de bancada parciais; autonomia e carga nao validadas | Parcial | Nao aplicavel |
| REQ-021 | `delivery-records.ts`, `DeliveryRecordsPanel.tsx`, migration `add_delivery_records` | `delivery-records.test.mjs` | Implementado | Nao verificada |
| REQ-022, REQ-023 | `reports.ts`, `ReportsPanel.tsx`, `routes.ts` | `reports.test.mjs`; typecheck | Implementado | Nao verificada |
| REQ-024, REQ-025 | `bling-validation.ts`, migration Bling, `ReportsPanel.tsx` | `bling-validation.test.mjs`; `docs/bling-validation-n8n.md` | Implementado | Nao verificada |
| REQ-026 | `bling-validation.ts` | Teste atual comprova que a data deriva de `created_at` | Bloqueado por regra de negocio e mudanca de contrato | Nao verificada |
| REQ-027 | `schema.prisma` (`invoice_number @unique`) | Revisao do schema | Bloqueado por decisao de identidade fiscal | Nao verificada |
| REQ-028, REQ-029 | `DeliveryRecord` possui `created_at`, mas nao `delivered_at` ou evidencia geografica | Revisao de schema e rotas | Parcial / pendente | Nao verificada |
| REQ-038 | Nao ha motor de conclusao de fraude na baseline | Decisao de seguranca ainda proposta | Pendente | Nao aplicavel |
| REQ-030 a REQ-032 | `.github/workflows/publish-images.yml`, `docker-compose.producao-vps.yml` | CI de `main` valida e publica tags `${github.sha}` | Implementado no Git | Nao verificada |
| REQ-033 | Testes existem em backend/web/firmware, mas workflow principal executa typecheck/Prisma/compose | Revisao do workflow | Parcial | Nao aplicavel |
| REQ-034 | Nenhuma evidencia de restore automatizado ou politica aprovada localizada | Auditoria documental | Pendente | Nao verificada |
| REQ-035 | `services/backend/Dockerfile`, PR aberto `fix/backend-startup-healthcheck` | CI do PR passou; ainda nao integrado nesta baseline | Parcial | Nao verificada |
| REQ-036 | `services/backend/prisma/seed.ts` e composes possuem fallback legado | Auditoria de configuracao; valor real de producao nao foi lido | Pendente | Nao verificada |

## Verificacoes desta regularizacao

Devem ser registradas antes de qualquer commit:

- `npm run typecheck`
- `npx prisma validate --schema services/backend/prisma/schema.prisma`
- `docker compose --env-file .env.producao-vps.example -f docker-compose.producao-vps.yml config --quiet`
- testes unitarios que podem ser executados sem servicos externos
- verificacao de links e referencias internas da documentacao
- `git -c core.whitespace=cr-at-eol diff --check` no Windows/CRLF

Resultados pertencem ao resumo da alteracao ou ao commit/PR; nao devem ser antecipados como sucesso neste arquivo.
