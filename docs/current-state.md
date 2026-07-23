# Estado atual do projeto

Ultima revisao desta documentacao: 2026-05-21.

## Produto

O 3DH TrackFlow e uma plataforma de rastreamento em tempo real para frota. Ela possui:

- painel interno da empresa;
- mapa com todos os veiculos ativos;
- cadastro e edicao de entregadores/veiculos;
- registro administrativo de entregas por nota fiscal unica;
- relatorio operacional de entregas por NF com filtros e permissao propria;
- links publicos temporarios para clientes;
- app Android para cadastro e envio de telemetria;
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

## Banco de dados

Modelos principais:

- `User`;
- `DeliveryPerson`;
- `LocationEvent`;
- `TrackingSession`;
- `DeliveryRecord`.

`DeliveryRecord.invoice_number` e unico para sempre. Cancelamentos sao logicos, preservando auditoria.

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





