# Docker

Notas para builds e execucao local da plataforma.

Imagens principais:

- `3dh-trackflow-backend:pc`;
- `3dh-trackflow-web:pc`;
- `ghcr.io/mjjuniorr/3dh-trackflow-backend:producao`;
- `ghcr.io/mjjuniorr/3dh-trackflow-web:producao`.

Build local:

```bash
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml up -d --build
```

Build para registry de producao:

```bash
docker build -f services/backend/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-backend:producao .
docker build -f apps/web/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-web:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
docker push ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

Para Homologacao PC, use:

```bash
docker compose --env-file .env -f docker-compose.homologacao-pc.yml up -d --build
```
