# 3DH TrackFlow Android

Aplicativo Android nativo do entregador para cadastro, rastreamento em segundo plano e envio de telemetria para a plataforma 3DH TrackFlow.

## Decisoes de arquitetura

- O aplicativo nao conecta diretamente no Kafka.
- O aplicativo envia dados para o backend via HTTPS.
- O backend valida, persiste e emite atualizacoes em tempo real para dashboard e links publicos.
- O `device_id` e gerado no app e mantido localmente com DataStore.

## Fluxo MVP

1. Entregador abre o app.
2. App gera ou recupera um `device_id`.
3. Entregador informa nome e telefone.
4. Entregador seleciona tipo de veiculo.
5. App registra o entregador:

```http
POST /api/mobile/delivery-people/register
X-Mobile-Registration-Secret: <MOBILE_REGISTRATION_SECRET>
```

5. Entregador inicia rastreamento.
6. App solicita permissoes de localizacao/notificacao.
7. App coleta localizacao, bateria, velocidade, accuracy e heading.
8. App envia telemetria:

```http
POST /api/mobile/telemetry
X-Mobile-Registration-Secret: <MOBILE_REGISTRATION_SECRET>
```

Payload:

```json
{
  "device_id": "android-a1b2c3",
  "lat": -3.119,
  "lng": -60.0217,
  "speed": 32,
  "heading": 145,
  "battery": 87,
  "accuracy": 8,
  "timestamp": "2026-05-20T10:30:00-04:00"
}
```

## Tipo de veiculo

O app permite escolher:

- Moto;
- Carro;
- Barco;
- Aviao;
- Onibus.

Valores enviados ao backend:

```text
motorcycle
car
boat
airplane
bus
```

Esse valor e salvo em `DeliveryPerson.vehicle_type` e usado pelo mapa para escolher o icone.

## Heading

O app deve enviar `heading` em graus:

- `0`: norte;
- `90`: leste;
- `180`: sul;
- `270`: oeste.

Regra recomendada:

- acima de 5 km/h, usar `bearing` do GPS;
- em baixa velocidade, usar bussola/sensores como fallback;
- se nenhum valor confiavel estiver disponivel, manter o ultimo `heading` valido.

## Configuracao inicial

O app usa `BuildConfig` para:

- `TRACKFLOW_API_BASE_URL`: `https://track.3dhmanaus.shop`;
- `MOBILE_REGISTRATION_SECRET`: token configurado tambem no backend.

Para desenvolvimento, abra a pasta `apps/android` no Android Studio e sincronize o Gradle. O projeto foi criado em Kotlin nativo com Jetpack Compose.

Antes de gerar APK de producao, troque `MOBILE_REGISTRATION_SECRET` em `app/build.gradle.kts` para o mesmo valor configurado na stack do backend.

## Primeiras telas

- Cadastro do entregador.
- Campo tipo de veiculo.
- Rastreamento ativo.
- Status de GPS, internet, bateria, velocidade e ultimo envio.
- Botao iniciar/parar rastreamento.
