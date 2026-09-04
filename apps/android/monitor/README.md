# 3DH TrackFlow Monitor

Segundo aplicativo Android do TrackFlow.

## Objetivo

Aplicativo somente de observacao operacional:

- mapa ocupa 100% da tela;
- recebe todos os objetos do TrackFlow em tempo real;
- filtro de visibilidade local por objeto;
- sininho com contador de notificacoes nao lidas;
- central de notificacoes offline/online;
- nao envia GPS;
- nao cadastra entregador;
- nao altera dados operacionais.

## Modulo Gradle

```text
:monitor
```

Application ID:

```text
br.com.tresdhmanaus.trackflow.monitor
```

## Build

A partir de `apps/android`:

```powershell
.\gradlew.bat :monitor:assembleDebug
```

APK esperado:

```text
monitor/build/outputs/apk/debug/monitor-debug.apk
```

## Backend necessario

A Central de Notificacoes requer a migration:

```text
20260903223000_add_notification_center
```

O Monitor usa:

- `POST /api/auth/login`;
- `GET /api/delivery-people`;
- `GET /api/notifications`;
- `GET /api/notifications/unread-count`;
- `POST /api/notifications/:id/read`;
- `POST /api/notifications/read-all`;
- Socket.IO `dashboard:join`;
- Socket.IO `location:update`;
- Socket.IO `notification:new`;
- Socket.IO `notification:count`.

## Estado do MVP

O primeiro MVP usa login local legado/hibrido do TrackFlow. Suporte de login OIDC nativo no Android pode ser adicionado depois caso a producao passe para modo OIDC-only.
