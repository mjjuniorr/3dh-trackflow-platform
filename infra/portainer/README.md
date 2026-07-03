# Portainer / Docker Swarm

Ambiente alvo:

- VPS Hostinger;
- Docker Swarm;
- Portainer;
- Traefik ja configurado;
- rede externa `PortainerRede`;
- Kafka interno em `kafka:9092`;
- dominio publico `track.3dhmanaus.com.br`.

Arquivos recomendados da stack:

```text
docker-compose.producao-vps.yml
```

No Portainer, use a opcao de Stack por repositorio Git e informe `docker-compose.producao-vps.yml` como compose path.

Na nomenclatura oficial atual, PC e Homologacao; VPS e Producao.

## Producao com imagens de registry

O arquivo `docker-compose.producao-vps.yml` nao faz build dentro do Swarm. Ele espera imagens ja publicadas:

```env
FRONTEND_IMAGE=ghcr.io/mjjuniorr/3dh-trackflow-web:producao
BACKEND_IMAGE=ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
```

Isso evita inconsistencias do Portainer/Swarm com `build:` e torna o deploy repetivel.

Checklist de producao:

1. Publicar imagens no registry.
2. Subir o codigo para o Git.
3. Criar Stack via Git no Portainer.
4. Usar compose path `docker-compose.producao-vps.yml`.
5. Configurar variaveis a partir de `.env.producao-vps.example`.
6. Confirmar `KAFKA_BROKER=kafka:9092`.
7. Confirmar rede externa `PortainerRede`.
8. Rodar seed no container backend.
9. Testar login, dashboard, Kafka, link publico e WebSocket.
