# 3DH TrackFlow Platform

Plataforma 3DH para rastreamento em tempo real, operacao de entregadores, links publicos temporarios, aplicativo Android e firmware de placas GPS.

## Estrutura do monorepo

```text
3dh-trackflow-platform/
  apps/
    web/               # Painel interno e pagina publica de rastreio
    android/           # Aplicativo Android dos entregadores
  services/
    backend/           # API, WebSocket, Kafka, Prisma, Redis e JWT
  firmware/
    gps-board/         # Firmware das placas GPS
  infra/
    docker/            # Arquivos e notas de Docker
    portainer/         # Notas de deploy no Portainer/Swarm
  docs/                # Documentacao do produto e arquitetura
```

## Stack

- Backend: Node.js, TypeScript, Express, Socket.IO, KafkaJS, Prisma, PostgreSQL, Redis e JWT.
- Web: React, Vite, TypeScript, TailwindCSS, Leaflet e Socket.IO Client.
- Android: aplicativo nativo dos entregadores para cadastro e telemetria.
- Firmware: modulo reservado para placas GPS.
- Deploy: Docker Swarm/Portainer com Traefik e rede externa `PortainerRede`.

## Ambientes oficiais

| Ambiente | Arquivo | Onde roda | Kafka |
| --- | --- | --- | --- |
| Homologacao PC | `docker-compose.homologacao-pc.yml` | Docker local no Windows | Kafka desativado por padrao; informe broker protegido quando necessario |
| Producao VPS | `docker-compose.producao-vps.yml` | Portainer / Docker Swarm / VPS Hostinger | `kafka:9092` |

`docker-compose.producao-pc.yml` e `docker-compose.homologacao-vps.yml` existem como legado do desenvolvimento inicial, mas a nomenclatura oficial do projeto agora e: PC = Homologacao, VPS = Producao.

Para operacao diaria, prefira os arquivos oficiais acima.

## Funcionalidades implementadas

- Login interno com JWT.
- Dashboard protegido em `/dashboard`.
- Lista dinamica de entregadores cadastrados.
- Cadastro, edicao e desativacao de entregadores pelo painel administrativo.
- Cadastro automatico de entregadores pelo aplicativo Android.
- Mapa com marcador PNG transparente da moto.
- Rotacao da moto pelo campo Kafka `heading`.
- Status visual: online colorido, sem sinal e offline.
- Criacao de links publicos temporarios em `/t/:public_token`.
- Link publico somente leitura, sem listar outros entregadores.
- Backend retorna apenas `public_path` para nao expor endereco interno de servidor.
- Configuracao Kafka pelo painel administrativo.
- Simulador Python de rota de entrega.

## Cadastro Android

Antes de publicar localizacao no Kafka, o aplicativo Android deve registrar o entregador:

```http
POST /api/mobile/delivery-people/register
X-Mobile-Registration-Secret: <MOBILE_REGISTRATION_SECRET>
```

```json
{
  "name": "Maria Silva",
  "device_id": "android-a1b2c3",
  "phone": "+5592999999999",
  "vehicle_type": "motorcycle"
}
```

Depois do cadastro, o app envia telemetria usando o mesmo `device_id`. A dashboard mostra o nome real cadastrado, e administradores podem editar ou desativar o entregador pela engrenagem.

O app nao publica direto no Kafka. Ele envia telemetria por HTTPS:

```http
POST /api/mobile/telemetry
X-Mobile-Registration-Secret: <MOBILE_REGISTRATION_SECRET>
```

O backend persiste o evento e emite as atualizacoes em tempo real para o dashboard e links publicos.

## Homologacao PC via Docker local

1. Copie o ambiente de exemplo:

```bash
copy .env.homologacao-pc.example .env
```

2. Suba a stack local:

```bash
docker compose --env-file .env -f docker-compose.homologacao-pc.yml up -d --build
```

3. Acesse:

- Web: `http://localhost:8080`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/health`

4. O backend do PC sobe com Kafka desativado por padrao. Para testar Kafka, use um broker protegido via rede interna, VPN ou tunel SSH:

```env
KAFKA_ENABLED=true
KAFKA_BROKER=<broker_protegido>
KAFKA_TOPIC=rastreamento
```

## Producao VPS via Portainer e Git

1. Garanta que a rede externa ja existe no Swarm:

```bash
docker network ls | grep PortainerRede
```

2. No Portainer, crie uma Stack usando a opcao de repositorio Git.

3. Configure:

- Repository URL: URL do repositorio `3dh-trackflow-platform`;
- Compose path: `docker-compose.producao-vps.yml`;
- Branch: branch principal do projeto.

4. Configure as variaveis a partir de `.env.producao-vps.example`.

5. Publique as imagens em um registry antes do deploy. A stack de producao nao faz build no Swarm; ela baixa imagens prontas.

Exemplo:

```bash
docker build -f services/backend/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-backend:producao .
docker build -f apps/web/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-web:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
docker push ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

Depois configure no Portainer:

```env
BACKEND_IMAGE=ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
FRONTEND_IMAGE=ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

6. O dominio publico deve apontar para a VPS: `rastreio.3dhmanaus.com.br`.
7. O Traefik ja existente publicara o frontend em `https://rastreio.3dhmanaus.com.br`.
8. O frontend acessa a API por `/api` e Socket.IO por `/socket.io`, ambos roteados pelo Nginx do frontend para o backend.
9. Kafka nao e exposto publicamente. O backend consome `kafka:9092` no topico `rastreamento`.
10. Depois do primeiro deploy, execute o seed no container backend pelo console do Portainer:

```bash
npm run seed
```

O Kafka da Producao VPS tambem deve ser interno:

```env
KAFKA_BROKER=kafka:9092
```

### Comunicacao entre containers

- Frontend publica somente a porta 80 interna para o Traefik.
- Nginx do frontend encaminha `/api` e `/socket.io` para `http://backend:4000`.
- Backend acessa PostgreSQL por `postgres:5432`.
- Backend acessa Redis por `redis:6379`.
- Backend acessa Kafka por `kafka:9092`, usando `KAFKA_BROKER=kafka:9092`.
- `https://kafka.3dhmanaus.com.br` e apenas Kafka UI. Nao use esse dominio no backend.
- Nenhum servico da aplicacao usa `localhost` para conversar com outro container.
- Testes externos no Windows nao devem usar broker publico. Use container backend na VPS, VPN ou tunel SSH temporario.

### Kafka de producao

Variaveis esperadas:

```env
KAFKA_BROKER=kafka:9092
KAFKA_EXTERNAL_BROKER=<somente_com_vpn_tunel_ou_firewall_restrito>
KAFKA_TOPIC=rastreamento
KAFKA_CLIENT_ID=trackflow-backend
KAFKA_GROUP_ID=trackflow-consumer-group
KAFKA_ENABLED=true
```

Mensagem esperada no topico `rastreamento`:

```json
{
  "device_id": "entregador_001",
  "lat": -3.119,
  "lng": -60.0217,
  "speed": 0,
  "heading": 120,
  "battery": 87,
  "accuracy": 8,
  "timestamp": "2026-05-17T18:00:00-04:00"
}
```

Para publicar uma mensagem de teste dentro do container backend na VPS:

```bash
npm run kafka:test:produce
```

Para simular a rotacao da moto pelo campo `heading`:

```bash
npm run kafka:test:heading
```

Para simular uma rota de entrega de 30 minutos a partir do PC:

```bash
python scripts/simulate_delivery_route.py --duration-minutes 30 --interval-seconds 5 --device-id entregador_001
```

Esse script publica no broker definido por `KAFKA_BROKER` ou `--broker`; ele nao possui mais broker publico padrao.

## Desenvolvimento local

```bash
npm install
cp services/backend/.env.example services/backend/.env
cp apps/web/.env.example apps/web/.env
npm run prisma:generate --workspace @3dh-trackflow/backend
npm run prisma:migrate --workspace @3dh-trackflow/backend
npm run dev
```

## Seed

```bash
npm run seed --workspace @3dh-trackflow/backend
```

Usuario padrao configuravel por ambiente:

- `SEED_ADMIN_EMAIL=admin@3dhmanaus.com.br`
- `SEED_ADMIN_PASSWORD=admin123`

## Rotas

- `POST /api/auth/login`
- `GET /api/delivery-people`
- `POST /api/tracking-sessions`
- `POST /api/tracking-sessions/:id/revoke`
- `GET /api/public/:publicToken`
- `GET /health`

## Tempo real

- Dashboard autenticado entra na sala `dashboard` e recebe `location:update` com todos os entregadores ativos.
- Link publico entra na sala `tracking:{public_token}` e recebe apenas o entregador vinculado.

## Documentacao complementar

- `docs/architecture.md`: fluxo tecnico, payload Kafka, heading e seguranca do link publico.
- `docs/testing.md`: simulacoes Kafka e roteiro de validacao manual.
- `docs/HANDOFF.md`: resumo para continuar em outra conversa Codex.
- `docs/current-state.md`: estado atual do produto, deploy e problemas conhecidos.
- `docs/vehicle-icons.md`: fluxo correto para trocar assets de veiculos.
- `docs/operations.md`: comandos operacionais de deploy, Android e Kafka.
- `infra/portainer/README.md`: deploy VPS com Portainer, Swarm, Traefik e registry.
- `infra/docker/README.md`: builds Docker e execucao local.
- `apps/android/README.md`: requisitos iniciais do app Android.
