# Firmwares do 3DH TrackFlow

O TrackFlow suporta multiplos hardwares de rastreamento. Cada modelo de placa possui um projeto de firmware independente, com sua propria linguagem, toolchain, dependencias, testes e processo de gravacao.

## Regra principal

```text
uma placa = um firmware independente
```

Um firmware nao deve importar ou reutilizar codigo embarcado de outro firmware de placa. O ponto comum entre eles e o contrato de comunicacao com o backend TrackFlow.

## Placas

### LILYGO TTGO T-SIM A7670SA

Diretorio:

```text
firmware/lilygo-a7670sa/
```

Stack atual: PlatformIO + Arduino/C++.

Este e o firmware originalmente criado em `firmware/gps-board`. A reorganizacao para o diretorio especifico da placa nao altera seu comportamento.

### ZX908

Diretorio:

```text
firmware/zx908/
```

O ZX908 sera implementado como um projeto separado. QuecPython e a stack preferida caso a unidade fisica adquirida use uma variante Quectel compativel e permita esse ambiente de firmware.

Nao considere o ZX908 homologado antes da identificacao fisica do modem e da validacao de GNSS, LTE, Wi-Fi, IMEI, bateria e interface de gravacao/debug.

## Contrato TrackFlow

Os firmwares enviam telemetria para:

```http
POST /api/mobile/telemetry
X-Mobile-Registration-Secret: <secret>
Content-Type: application/json
```

Payload atual:

```json
{
  "device_id": "<id-estavel-do-dispositivo>",
  "lat": -3.119,
  "lng": -60.0217,
  "speed": 42.6,
  "heading": 127,
  "battery": 86,
  "accuracy": 7.5,
  "timestamp": "2026-09-03T16:20:00-04:00"
}
```

Campos obrigatorios nesta fase:

- `device_id`
- `lat`
- `lng`
- `speed`
- `heading`
- `battery`
- `accuracy`
- `timestamp`

## Adicionando uma nova placa

Crie um novo diretorio dentro de `firmware/` usando um nome especifico para o hardware, por exemplo:

```text
firmware/nova-placa/
```

O novo projeto deve:

1. ser compilavel/testavel independentemente;
2. manter suas dependencias dentro do proprio projeto;
3. possuir documentacao de hardware e gravacao;
4. nao depender do codigo de outra placa;
5. implementar o contrato HTTPS do TrackFlow;
6. manter credenciais reais fora do Git.

Mudancas no backend so devem ocorrer quando uma necessidade real de uma nova placa nao puder ser atendida pelo contrato existente.
