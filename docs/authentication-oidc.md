# Autenticacao central OIDC

O TrackFlow integra com o Portal 3DH usando Keycloak e OpenID Connect Authorization Code com PKCE.

## Cliente

```text
Client ID: trackflow-web
Issuer: https://auth.3dhmanaus.com.br/realms/3dh
Audience: trackflow-web
```

O cliente e publico e nao possui `client_secret` no frontend.

## Permissoes

```text
trackflow:view
trackflow:manage-delivery-people
trackflow:create-public-links
trackflow:revoke-public-links
trackflow:manage-settings
trackflow:manage-deliveries
trackflow:view-reports
trackflow:admin
```

- `view`: visualizar dashboard, mapa e veiculos;
- manage-delivery-people: cadastrar, editar e desativar entregadores;
- create-public-links: criar links publicos;
- revoke-public-links: revogar links publicos;
- manage-settings: administrar configuracoes tecnicas, incluindo Kafka;
- manage-deliveries: registrar e cancelar entregas por nota fiscal;
- view-reports: consultar relatorios operacionais de entregas por NF;
- admin: reservado para operacoes futuras de alto impacto.

## Modos

```text
legacy
hybrid
oidc
```

- `legacy`: aceita apenas login local antigo;
- `hybrid`: aceita login local e Portal 3DH;
- `oidc`: aceita somente Portal 3DH.

Use `hybrid` durante homologacao. Troque para `oidc` somente depois de validar todos os criterios.

## Fluxo

1. Usuario abre o TrackFlow.
2. Frontend redireciona para o Keycloak.
3. Keycloak autentica o usuario.
4. Frontend recebe access token usando PKCE.
5. Frontend guarda sessao em `sessionStorage`.
6. API e Socket.IO recebem `Authorization: Bearer`.
7. Backend valida assinatura, issuer, audience e expiracao pelo JWKS.
8. Backend verifica a role exigida.

## Identidade local

O banco local continua guardando uma referencia do usuario para auditoria e autoria de links publicos.

Campos:

```text
users.oidc_sub
users.email
users.name
```

Usuarios legados continuam com `password_hash`. Usuarios OIDC podem ter `password_hash` nulo.

Migration:

```text
services/backend/prisma/migrations/20260625090000_add_oidc_identity
```

## Variaveis

Producao:

```env
AUTH_MODE=hybrid
OIDC_ISSUER=https://auth.3dhmanaus.com.br/realms/3dh
OIDC_CLIENT_ID=trackflow-web
OIDC_AUDIENCE=trackflow-web
OIDC_JWKS_URL=
OIDC_DEFAULT_COMPANY_ID=
PORTAL_URL=https://portal.3dhmanaus.com.br
```

Homologacao local:

```env
AUTH_MODE=hybrid
OIDC_ISSUER=http://localhost:8080/realms/3dh
OIDC_CLIENT_ID=trackflow-web
OIDC_AUDIENCE=trackflow-web
OIDC_JWKS_URL=http://host.docker.internal:8080/realms/3dh/protocol/openid-connect/certs
PORTAL_URL=http://localhost:4180
```

Na homologacao conjunta, o TrackFlow usa `http://localhost:4181` porque a porta `8080` pertence ao Keycloak.

## Ordem de deploy

1. Publicar Portal API/Web/Keycloak atualizados.
2. Aguardar a Portal API verificar/criar `trackflow-web` e suas roles.
3. No Portal, atribuir ao usuario pelo menos `trackflow:view`.
4. Publicar backend TrackFlow para aplicar migration e validar OIDC.
5. Publicar frontend TrackFlow.
6. Manter `AUTH_MODE=hybrid`.
7. Validar login central, API, Socket.IO e logout.
8. Depois de estabilizar, mudar para `AUTH_MODE=oidc`.

## Criterios de aceite

- usuario sem `trackflow:view` nao ve o card no Portal;
- acesso direto sem sessao redireciona ao login central;
- usuario sem `trackflow:view` recebe `403` no dashboard;
- Socket.IO rejeita usuario sem `view`;
- comandos da UI acompanham as roles;
- usuarios com `trackflow:manage-deliveries` registram e cancelam entregas por NF;
- usuarios com `trackflow:view-reports` consultam relatorios operacionais;
- API bloqueia chamadas diretas sem role;
- links publicos continuam sem login;
- Android e placas continuam usando os endpoints de telemetria;
- logout encerra a sessao no Keycloak;
- login legado funciona durante `hybrid`;
- dados existentes permanecem intactos.






