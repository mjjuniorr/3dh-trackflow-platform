# Portainer / Docker Swarm

Ambiente alvo:

- VPS Hostinger;
- Docker Swarm;
- Portainer;
- Traefik ja configurado;
- rede externa `PortainerRede`;
- Kafka interno em `kafka:9092`;
- dominio publico `rastreio.3dhmanaus.com.br`.

Arquivos recomendados da stack:

```text
docker-compose.producao-vps.yml
```

No Portainer, use a opcao de Stack por repositorio Git e informe `docker-compose.producao-vps.yml` como compose path.

Na nomenclatura oficial atual, PC e Homologacao; VPS e Producao.

## Producao com imagens de registry

O arquivo `docker-compose.producao-vps.yml` nao faz build dentro do Swarm. Ele fixa diretamente imagens ja publicadas:

```yaml
image: ghcr.io/mjjuniorr/3dh-trackflow-web:<commit_sha>
image: ghcr.io/mjjuniorr/3dh-trackflow-backend:<commit_sha>
```

O workflow da `main` publica essas imagens com o SHA. O compose atual nao usa variaveis `FRONTEND_IMAGE`/`BACKEND_IMAGE`; um commit de release deve atualizar os campos `image:`. Nao use tags mutaveis como `latest` ou `producao`.

Isso evita inconsistencias do Portainer/Swarm com `build:` e torna o deploy repetivel. Acesso ao Portainer e redeploy exigem autorizacao explicita; nenhuma atualizacao deve remover volumes.

Checklist de producao:

1. Integrar o commit aprovado na `main`.
2. Confirmar que o workflow publicou as duas imagens com o SHA.
3. Preparar, revisar e integrar um commit de release que fixe esse SHA no compose.
4. Com autorizacao explicita, criar ou atualizar a Stack via Git no Portainer.
5. Usar compose path `docker-compose.producao-vps.yml`.
6. Configurar variaveis a partir de `.env.producao-vps.example`.
7. Confirmar `KAFKA_BROKER=kafka:9092`.
8. Confirmar rede externa `PortainerRede`.
9. Confirmar que `SEED_ADMIN_PASSWORD` foi fornecida por secret, sem depender do fallback legado.
10. Rodar seed no container backend somente quando necessario e autorizado.
11. Testar login, dashboard, Kafka, link publico e WebSocket.
