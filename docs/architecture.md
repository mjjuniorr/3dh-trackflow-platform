# Arquitetura

Fluxo principal:

1. Placa GPS ou aplicativo Android envia localizacao.
2. Kafka recebe eventos no topico `rastreamento`.
3. Backend consome eventos, persiste historico e atualiza estado em Redis/PostgreSQL.
4. Dashboard recebe todos os entregadores via Socket.IO.
5. Link publico recebe somente o entregador vinculado a uma TrackingSession ativa.

## Link publico seguro

Ao criar uma TrackingSession, o backend retorna somente:

```json
{
  "public_path": "/t/abc123"
}
```

O frontend monta a URL usando `window.location.origin`. Isso evita expor IP, porta, hostname interno do backend ou qualquer endereco tecnico da API.

Exemplo final para o cliente:

```text
https://track.3dhmanaus.shop/t/abc123
```

## Rotacao do marcador

O marcador da moto no mapa usa o campo `heading` recebido no evento Kafka. O valor deve ser informado em graus:

- `0`: norte;
- `90`: leste;
- `180`: sul;
- `270`: oeste.

Recomendacao para o Android:

- em movimento, preferir o `bearing` do GPS;
- parado ou abaixo de 5 km/h, usar bussola/sensores como fallback;
- enviar sempre o melhor valor disponivel em `heading`.

Payload esperado:

```json
{
  "device_id": "entregador_001",
  "lat": -3.119,
  "lng": -60.0217,
  "speed": 32,
  "heading": 145,
  "battery": 87,
  "accuracy": 8,
  "timestamp": "2026-05-18T10:30:00-04:00"
}
```

Para simular rotacao pelo Kafka:

```bash
npm run kafka:test:heading --workspace @3dh-trackflow/backend
```

O marcador visual do mapa usa o asset:

```text
apps/web/public/assets/courier-top.png
```

O PNG tem transparencia para nao cobrir ruas ou labels do mapa.

Broker de producao dentro do Swarm:

```env
KAFKA_BROKER=kafka:9092
KAFKA_TOPIC=rastreamento
```

Ambientes:

- Homologacao VPS: Portainer baixa o codigo do Git e usa `docker-compose.homologacao-vps.yml`.
- Producao VPS: Portainer baixa o codigo do Git e usa `docker-compose.producao-vps.yml`.
- Producao PC: Docker local usa `docker-compose.producao-pc.yml`.
