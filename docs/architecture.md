# Arquitetura

Fluxo principal:

1. Placa GPS ou aplicativo Android envia localizacao.
2. Kafka recebe eventos no topico `rastreamento`.
3. Backend consome eventos, persiste historico e atualiza estado em Redis/PostgreSQL.
4. Dashboard recebe todos os entregadores via Socket.IO.
5. Link publico recebe somente o entregador vinculado a uma TrackingSession ativa.

## Cadastro dinamico de entregadores

O aplicativo Android registra o entregador antes de iniciar o envio de telemetria:

```http
POST /api/mobile/delivery-people/register
X-Mobile-Registration-Secret: <MOBILE_REGISTRATION_SECRET>
```

Body:

```json
{
  "name": "Maria Silva",
  "device_id": "android-a1b2c3",
  "phone": "+5592999999999",
  "vehicle_type": "motorcycle"
}
```

O backend cria ou reativa o `DeliveryPerson` pelo `device_id`. Depois disso, o dashboard passa a exibir o nome real cadastrado no Android. Funcionarios administradores tambem podem criar, editar e desativar entregadores pela engrenagem do painel.

Entregadores desativados nao aparecem no dashboard e nao podem gerar novos links de rastreio. A desativacao e preferida em vez de exclusao fisica para preservar historico e evitar perda de auditoria.

O Android envia telemetria por HTTPS para o backend:

```http
POST /api/mobile/telemetry
X-Mobile-Registration-Secret: <MOBILE_REGISTRATION_SECRET>
```

O backend usa o mesmo fluxo interno de persistencia e Socket.IO usado pelo consumidor Kafka. Kafka continua isolado da aplicacao Android.

## Tipos de veiculo

O campo `vehicle_type` define qual marcador aparece no mapa.

Valores aceitos:

```text
motorcycle
car
boat
airplane
bus
```

Fluxos que aceitam `vehicle_type`:

- cadastro manual pelo painel;
- cadastro Android;
- eventos Kafka;
- payloads usando alias `vehicleType`.

O backend persiste esse valor em `DeliveryPerson.vehicle_type`.

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
https://track.3dhmanaus.com.br/t/abc123
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

O consumidor tambem aceita aliases uteis para o Android:

- `deviceId` como alternativa a `device_id`;
- `latitude` como alternativa a `lat`;
- `longitude` ou `lon` como alternativa a `lng`;
- `name`, `driver_name` ou `delivery_person_name` para atualizar o nome quando necessario.
- `vehicleType` como alternativa a `vehicle_type`.

Para simular rotacao pelo Kafka:

```bash
npm run kafka:test:heading --workspace @3dh-trackflow/backend
```

O marcador visual do mapa usa o asset:

```text
apps/web/public/assets/courier-top.png
```

O PNG tem transparencia para nao cobrir ruas ou labels do mapa.

Os demais assets ficam em:

```text
apps/web/public/assets/vehicle-car.png
apps/web/public/assets/vehicle-boat.svg
apps/web/public/assets/vehicle-airplane.png
apps/web/public/assets/vehicle-bus.png
```

Ver tambem:

```text
docs/vehicle-icons.md
```

Broker de producao dentro do Swarm:

```env
KAFKA_BROKER=kafka:9092
KAFKA_TOPIC=rastreamento
```

Ambientes:

- Homologacao PC: Docker local usa `docker-compose.homologacao-pc.yml`.
- Producao VPS: Portainer baixa o codigo do Git e usa `docker-compose.producao-vps.yml`.
