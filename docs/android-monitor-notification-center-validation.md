# Android Monitor + Central de Notificacoes - Validacao

Ultima revisao: 2026-09-03.

## Branch

```text
feature/android-monitor-notification-center
```

## Componentes

Backend:

```text
services/backend/src/notifications.ts
services/backend/src/notification-transition.ts
services/backend/src/offline-monitor.ts
services/backend/prisma/migrations/20260903223000_add_notification_center/
```

Android:

```text
apps/android/monitor/
```

## Contrato de status

A Central de Notificacoes reaproveita a regra existente:

```text
online      <= 90 s
sem sinal   > 90 s e <= 5 min
offline     > 5 min
```

Eventos do MVP:

```text
DEVICE_OFFLINE
DEVICE_ONLINE
```

## API

Requer autenticacao e permissao `trackflow:view`.

```text
GET  /api/notifications
GET  /api/notifications/unread-count
POST /api/notifications/:id/read
POST /api/notifications/read-all
```

Socket.IO:

```text
notification:new
notification:count
```

## Migration

Antes de subir o backend:

```bash
npm run prisma:generate --workspace @3dh-trackflow/backend
npm run prisma:deploy --workspace @3dh-trackflow/backend
```

Confirmar que foram criadas:

```text
notifications
notification_reads
```

## Backend - build e teste

```bash
npm run prisma:generate --workspace @3dh-trackflow/backend
npm run typecheck --workspace @3dh-trackflow/backend
npm run test:notifications --workspace @3dh-trackflow/backend
```

O teste deve confirmar:

- online -> offline = DEVICE_OFFLINE;
- sem sinal -> offline = DEVICE_OFFLINE;
- offline -> offline = nenhum novo evento;
- offline -> online = DEVICE_ONLINE;
- online -> sem sinal = nenhum alerta.

## Android - build

A partir de `apps/android`:

```powershell
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :monitor:assembleDebug
```

Os dois builds devem passar. O build do `:app` serve como teste de regressao do aplicativo dos entregadores.

APK Monitor:

```text
apps/android/monitor/build/outputs/apk/debug/monitor-debug.apk
```

## Teste funcional do Monitor

1. instalar o APK Monitor;
2. efetuar login;
3. confirmar mapa em tela cheia;
4. confirmar todos os objetos com localizacao;
5. mover um dispositivo e confirmar atualizacao em tempo real;
6. mover/zoom manualmente o mapa e confirmar que a camera nao e reposicionada a cada evento;
7. abrir engrenagem;
8. ocultar um objeto;
9. fechar e reabrir o app;
10. confirmar que o objeto continua oculto localmente;
11. usar Mostrar todos e Ocultar todos.

## Teste de offline

1. manter um dispositivo online;
2. interromper telemetria;
3. aguardar mais de 5 minutos;
4. confirmar apenas uma notificacao DEVICE_OFFLINE;
5. manter o dispositivo offline por mais ciclos;
6. confirmar que nao aparecem notificacoes repetidas;
7. restaurar telemetria;
8. confirmar uma notificacao DEVICE_ONLINE.

## Teste do sininho

Confirmar:

- badge aumenta com notificacao nova;
- abrir a lista nao marca automaticamente todas;
- tocar numa notificacao marca apenas aquela;
- Marcar todas zera o badge;
- um segundo usuario continua vendo sua propria contagem de nao lidas.

## Concorrencia

O backend usa atualizacao condicional do status para reivindicar a transicao. Em ambiente com multiplas replicas, somente a instancia que conseguir alterar o estado anterior deve gerar o alerta.

Validar em staging com mais de uma replica antes de escalar o backend em producao.

## Fora do MVP

- FCM/push do Android com app fechado;
- alertas de bateria baixa;
- geofence;
- excesso de velocidade;
- falha de GNSS;
- configuracao remota de quais alertas cada usuario deseja receber;
- login OIDC nativo quando o backend operar exclusivamente em OIDC.
