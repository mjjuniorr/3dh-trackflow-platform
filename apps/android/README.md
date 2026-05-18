# 3DH TrackFlow Android

Modulo reservado para o aplicativo Android dos entregadores.

Objetivos previstos:

- autenticar ou identificar o entregador/dispositivo;
- capturar localizacao, bateria, velocidade e status;
- capturar direcao da moto pelo `bearing` do GPS e, quando necessario, pela bussola;
- publicar eventos de rastreamento para o backend ou gateway definido;
- operar com tolerancia a conexao instavel.

## Direcao / heading

O app deve enviar `heading` em graus no payload de localizacao:

- `0`: norte;
- `90`: leste;
- `180`: sul;
- `270`: oeste.

Regra recomendada:

- se a velocidade for maior que 5 km/h, usar o `bearing` do GPS;
- se a velocidade for menor ou igual a 5 km/h, usar bussola/sensores como fallback;
- se nenhum valor confiavel estiver disponivel, manter o ultimo `heading` valido.

Payload:

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
