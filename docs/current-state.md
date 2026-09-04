# Estado atual do projeto

Ultima revisao desta documentacao: 2026-09-03.

## Produto

O 3DH TrackFlow e uma plataforma de rastreamento em tempo real para frota. Ela possui:

- painel interno da empresa;
- mapa com todos os veiculos ativos;
- cadastro e edicao de entregadores/veiculos;
- registro administrativo de entregas por nota fiscal unica;
- relatorio operacional de entregas por NF com filtros e permissao propria;
- auditoria de NF no Bling via webhook n8n, mantendo OAuth fora do TrackFlow;
- links publicos temporarios para clientes;
- app Android para cadastro e envio de telemetria;
- firmware LILYGO TTGO T-SIM A7670SA com GNSS, Wi-Fi, 4G e v2 adaptativa em desenvolvimento;
- consumo de telemetria via Kafka;
- suporte a multiplos tipos de veiculo.

## Tipos de veiculo suportados

Valores tecnicos aceitos em `vehicle_type`:

```text
motorcycle
car
boat
airplane
bus
```

Labels usadas na interface:

```text
Moto
Carro
Barco
Aviao
Onibus
```

## Fluxo de dados

### Kafka

Produtores externos publicam no topico:

```text
rastreamento
```

Payload aceito:

```json
{
  "device_id": "final_test_carro_amazonas",
  "delivery_person_name": "Teste Carro - Amazonas Shopping",
  "vehicle_type": "car",
  "lat": -3.0898,
  "lng": -60.0269,
  "speed": 10,
  "heading": 80,
  "battery": 92,
  "accuracy": 8,
  "timestamp": "2026-05-21T07:19:19.006615+00:00"
}
```

Aliases aceitos:

- `deviceId` para `device_id`;
- `latitude` para `lat`;
- `longitude` ou `lon` para `lng`;
- `name` ou `driver_name` para `delivery_person_name`;
- `vehicleType` para `vehicle_type`.

### Android

O Android nao publica direto no Kafka.

Fluxo:

1. App registra entregador em `/api/mobile/delivery-people/register`.
2. App envia telemetria em `/api/mobile/telemetry`.
3. Backend salva e emite Socket.IO.

### Placa A7670SA

A placa LILYGO TTGO T-SIM A7670SA tambem nao publica direto no Kafka nesta fase.

Fluxo validado:

1. firmware conecta primeiro em Wi-Fi salvo;
2. se falhar, tenta 4G por SIM/APN;
3. Wi-Fi aberto e contingencia opcional e fica desativado por padrao na v2;
4. le GNSS interno do modem A7670SA por comandos AT;
5. envia telemetria por HTTPS para `/api/mobile/telemetry`;
6. backend persiste e emite Socket.IO usando o mesmo fluxo tecnico do Android.

A v1 foi validada com GNSS real, Wi-Fi e 4G Vivo, recebendo HTTP `202`. A branch `feature/lilygo-adaptive-tracking-v2` adiciona envio adaptativo, backoff e fila persistente e ainda precisa de build/teste fisico antes de substituir a baseline.

Requisitos completos:

```text
docs/requirements-gps-board.md
```

### Estado da v2 Adaptive Tracking

Branch de desenvolvimento:

```text
feature/lilygo-adaptive-tracking-v2
```

Implementado:

- estados MOVING, IDLE e PARKED;
- amostragem GNSS a cada 15 segundos;
- envio por tempo, distancia, mudanca de direcao e mudanca de velocidade;
- heartbeat em PARKED;
- backoff progressivo de rede;
- fila offline persistente em NVS;
- Wi-Fi aberto desativado por padrao;
- redacao de comandos AT sensiveis no monitor serial.

Pendente antes de promover a v2:

- build PlatformIO completo;
- upload para a placa;
- confirmacao de HTTP 202 via Wi-Fi e 4G;
- teste real da fila offline com perda/restauracao de rede;
- confirmacao dos estados MOVING/IDLE/PARKED em campo;
- repeticao do teste de autonomia contra o benchmark de aproximadamente 2h48.

Protocolo:

```text
docs/lilygo-adaptive-tracking-v2-validation.md
```

## Banco de dados

Modelos principais:

- `User`;
- `DeliveryPerson`;
- `LocationEvent`;
- `TrackingSession`;
- `DeliveryRecord`.

`DeliveryRecord.invoice_number` e unico para sempre. Cancelamentos sao logicos, preservando auditoria.

`DeliveryRecord` tambem guarda o resultado da validacao Bling:

```text
bling_validation_status
bling_document_type
bling_issue_date
bling_validated_at
bling_error
```

O TrackFlow nao armazena token OAuth do Bling. A API protegida chama um webhook n8n usando `BLING_VALIDATION_WEBHOOK_URL` e `BLING_VALIDATION_SECRET`. O n8n consulta Bling com sua credencial OAuth e retorna somente o resultado sanitizado.

Requisitos completos:

```text
docs/requirements-bling-validation.md
```

`DeliveryPerson.vehicle_type` e texto com default `motorcycle`.

Migration que criou a coluna:

```text
services/backend/prisma/migrations/20260521090000_add_vehicle_type/migration.sql
```

Nao ha enum no banco para `vehicle_type`, entao adicionar um novo tipo geralmente exige:

1. atualizar validacoes Zod no backend;
2. atualizar tipos TypeScript no frontend;
3. atualizar UI web/Android;
4. adicionar asset e tamanho do marcador.

Nao precisa migration se continuar usando a mesma coluna `vehicle_type` como texto.

## Deploy atual

Producao usa imagens GHCR:

```text
ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

Stack de producao:

```text
docker-compose.producao-vps.yml
```

Rede:

```text
PortainerRede
```

Traefik publica:

```text
https://rastreio.3dhmanaus.com.br
```

## Observacoes de producao

- Kafka UI: `https://kafka.3dhmanaus.com.br`, obrigatoriamente protegida por Keycloak/OIDC e modo somente leitura.
- Esse dominio e somente Kafka UI.
- Backend em producao deve usar `kafka:9092`, nunca `kafka.3dhmanaus.com.br`.
- Testes externos no PC nao devem usar porta publica do broker. Use container backend na VPS, VPN ou tunel SSH temporario.

## Problemas conhecidos

### Icones

Os icones gerados com fundo cinza/glow ficaram ruins quando processados localmente. O fluxo correto e usar PNG transparente real ja pronto.

### Cache

O navegador pode manter assets antigos. Sempre validar com:

- aba anonima;
- `Ctrl + F5`;
- ou novo navegador.

### Tags Docker

As tags `producao` sao sobrescritas. Depois de publicar nova imagem, e preciso forcar update no Swarm:

```bash
docker service update --force 3dh-trackflow-platform_frontend
docker service update --force 3dh-trackflow-platform_backend
```
