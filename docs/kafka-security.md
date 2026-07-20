# Seguranca do Kafka

## Objetivo

Kafka deve ser infraestrutura interna. O TrackFlow em producao consome o broker por `kafka:9092` dentro da `PortainerRede`.

Nao publicar o broker Kafka diretamente na internet. Portas externas como `19092` devem ficar fechadas, salvo janela temporaria de manutencao com firewall restrito por IP e autenticacao SASL/TLS.

## Estado desejado

- Backend TrackFlow: `KAFKA_BROKER=kafka:9092`.
- Android: continua enviando HTTPS para `/api/mobile/*` com `X-Mobile-Registration-Secret`.
- Links publicos: continuam usando `/api/public/:publicToken`.
- Kafka UI: pode ser publicada em `https://kafka.3dhmanaus.com.br`, mas deve exigir Keycloak/OIDC.
- Kafka UI: deve ficar em modo somente leitura.
- Broker Kafka: nao deve expor porta publica para clientes anonimos.

## Kafka UI com Keycloak

Use o arquivo de referencia:

```text
infra/portainer/kafka-ui-secure.example.yml
```

Variaveis esperadas no Portainer:

```env
KAFKA_UI_HOST=kafka.3dhmanaus.com.br
KAFKA_UI_CLUSTER_NAME=3DHKafka
KAFKA_UI_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_UI_OIDC_ISSUER=https://auth.3dhmanaus.com.br/realms/3dh
KAFKA_UI_OIDC_CLIENT_ID=kafka-ui
KAFKA_UI_OIDC_CLIENT_SECRET=<secret_do_client_confidential_no_keycloak>
TRAEFIK_ENTRYPOINTS=websecure
TRAEFIK_CERTRESOLVER=letsencryptresolver
```

No Keycloak, criar um client confidential:

```text
Client ID: kafka-ui
Valid redirect URIs: https://kafka.3dhmanaus.com.br/login/oauth2/code/keycloak
Valid post logout redirect URIs: https://kafka.3dhmanaus.com.br/*
Web origins: https://kafka.3dhmanaus.com.br
Standard flow: enabled
Direct access grants: disabled
Client authentication: enabled
```

## API da Kafka UI

A API HTTP da Kafka UI usa a mesma seguranca da aplicacao web. Com `AUTH_TYPE=OAUTH2`, endpoints como estes devem exigir sessao Keycloak:

```text
https://kafka.3dhmanaus.com.br/api/clusters
https://kafka.3dhmanaus.com.br/api/clusters/3DHKafka/topics
```

Depois do deploy, validar em aba anonima:

1. Abrir `https://kafka.3dhmanaus.com.br`.
2. Confirmar redirecionamento para Keycloak.
3. Abrir `/api/clusters` sem sessao.
4. Confirmar que nao retorna JSON do cluster.
5. Entrar com usuario autorizado.
6. Confirmar que a UI abre e que o cluster esta em `readOnly`.

## Testes sem porta publica

Para testes de telemetria, preferir um destes caminhos:

1. Rodar os scripts dentro do container backend na VPS.
2. Abrir um tunel SSH temporario para `kafka:9092` com firewall restrito.
3. Criar futuramente um endpoint administrativo protegido no backend para publicar cargas de teste.

Nao usar `kafka.3dhmanaus.com.br` como broker. Esse dominio e somente console web da Kafka UI.