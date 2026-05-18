# Portainer / Docker Swarm

Ambiente alvo:

- VPS Hostinger;
- Docker Swarm;
- Portainer;
- Traefik ja configurado;
- rede externa `PortainerRede`;
- Kafka interno em `kafka:9092`;
- dominio publico `track.3dhmanaus.shop`.

Arquivos recomendados da stack:

```text
docker-compose.homologacao-vps.yml
docker-compose.producao-vps.yml
```

No Portainer, use a opcao de Stack por repositorio Git e informe o arquivo correto como compose path.

A diferenca entre homologacao e producao deve ficar nos routers/entrypoints do Traefik e nas variaveis da stack, mantendo Kafka em `kafka:9092`.

## Homologacao com imagens de registry

O arquivo `docker-compose.homologacao-vps.yml` nao faz build dentro do Swarm. Ele espera imagens ja publicadas:

```env
FRONTEND_IMAGE=ghcr.io/mjjuniorr/3dh-trackflow-web:homologacao
BACKEND_IMAGE=ghcr.io/mjjuniorr/3dh-trackflow-backend:homologacao
```

Isso evita inconsistencias do Portainer/Swarm com `build:` e torna o deploy repetivel.

Checklist de homologacao:

1. Publicar imagens no registry.
2. Subir o codigo para o Git.
3. Criar Stack via Git no Portainer.
4. Usar compose path `docker-compose.homologacao-vps.yml`.
5. Configurar variaveis a partir de `.env.homologacao-vps.example`.
6. Confirmar `KAFKA_BROKER=kafka:9092`.
7. Confirmar rede externa `PortainerRede`.
8. Rodar seed no container backend.
9. Testar login, dashboard, Kafka, link publico e WebSocket.
