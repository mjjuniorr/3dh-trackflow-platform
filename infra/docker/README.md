# Docker

Notas para builds e execucao local da plataforma.

Imagens principais:

- `3dh-trackflow-backend:pc`;
- `3dh-trackflow-web:pc`;
- `ghcr.io/mjjuniorr/3dh-trackflow-backend:<commit_sha>`;
- `ghcr.io/mjjuniorr/3dh-trackflow-web:<commit_sha>`.

Build local:

```bash
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml up -d --build
```

Build local individual:

```bash
docker build -f services/backend/Dockerfile -t trackflow-backend:local .
docker build -f apps/web/Dockerfile -t trackflow-web:local .
```

Imagens de producao sao publicadas pelo GitHub Actions depois da validacao da `main`, sempre com a tag imutavel do commit.

Para Homologacao PC, use:

```bash
docker compose --env-file .env -f docker-compose.homologacao-pc.yml up -d --build
```
