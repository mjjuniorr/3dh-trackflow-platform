# Docker

Notas para builds e execucao local da plataforma.

Imagens principais:

- `3dh-trackflow-backend:pc`;
- `3dh-trackflow-web:pc`;
- `seu-registry/3dh-trackflow-backend:homologacao`;
- `seu-registry/3dh-trackflow-web:homologacao`.

Build local:

```bash
docker compose --env-file .env.producao-pc.example -f docker-compose.producao-pc.yml up -d --build
```

Build para registry de homologacao:

```bash
docker build -f services/backend/Dockerfile -t seu-registry/3dh-trackflow-backend:homologacao .
docker build -f apps/web/Dockerfile -t seu-registry/3dh-trackflow-web:homologacao .
docker push seu-registry/3dh-trackflow-backend:homologacao
docker push seu-registry/3dh-trackflow-web:homologacao
```

Para Producao PC, use:

```bash
docker compose --env-file .env -f docker-compose.producao-pc.yml up -d --build
```
