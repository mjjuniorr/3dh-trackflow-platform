# Requisitos - Firmware GPS Board A7670SA

Ultima revisao: 2026-09-03.

## Objetivo

Permitir que uma placa LILYGO TTGO T-SIM A7670SA envie localizacao para o TrackFlow como dispositivo de rastreio dedicado, preservando a plataforma web, Android, Kafka, Redis, PostgreSQL, rastreamento publico e autenticacoes tecnicas existentes.

## Hardware inicial

- Placa: LILYGO TTGO T-SIM A7670SA.
- USB serial no Windows: `USB Enhanced Serial CH9102`.
- Porta usada em bancada: `COM8`.
- GNSS: interno do modem A7670SA, com antena conectada.
- 4G: validado com SIM Vivo e APN configuravel.

## Requisitos funcionais

1. A placa deve iniciar sem depender de SIM.
2. A placa deve tentar conectar primeiro em uma rede Wi-Fi salva.
3. Se a rede salva falhar, a placa deve tentar dados 4G quando houver APN configurado.
4. Wi-Fi aberto e apenas contingencia opcional e fica desativado por padrao na v2.
5. A placa deve testar conectividade externa antes de aceitar uma rede Wi-Fi como transporte.
6. A placa deve ler localizacao real do GNSS interno por comandos AT.
7. A placa deve enviar telemetria por HTTPS para a API tecnica do TrackFlow.
8. A placa deve usar `X-Mobile-Registration-Secret` enquanto nao houver endpoint tecnico proprio para boards.
9. A placa deve permitir associacao temporaria a um `device_id` existente.
10. A placa nao deve publicar direto no Kafka.
11. O backend deve manter o marcador estavel no mapa mesmo quando o dispositivo estiver parado ou sem giroscopio.

## Requisitos de seguranca

1. Segredos de Wi-Fi e `MOBILE_REGISTRATION_SECRET` ficam somente em `firmware/lilygo-a7670sa/include/secrets.h`.
2. `include/secrets.h` nao pode ser commitado.
3. Kafka deve continuar interno na VPS; a placa nunca deve usar o broker Kafka publico.
4. O uso de rede Wi-Fi aberta e uma funcao de contingencia e pode ser desativado por build flag.
5. `client.setInsecure()` e aceito apenas nesta fase de bancada; a fase seguinte deve fixar CA raiz.

## Requisitos tecnicos do firmware

- Projeto PlatformIO em `firmware/lilygo-a7670sa`.
- Ambiente principal: `lilygo_a7670sa_wifi`.
- Board PlatformIO: `esp32dev`.
- Serial do modem: `Serial1`.
- RX modem: `GPIO27`.
- TX modem: `GPIO26`.
- PWRKEY modem: `GPIO4`.
- RESET modem: `GPIO5`.
- POWERON board: `GPIO12`.
- Baud do modem: `115200`.
- Amostragem GNSS v2: 15 segundos.
- Envio adaptativo: MOVING ate 15 s / 50 m / 30 graus / 10 km/h de variacao; IDLE 60 s; PARKED 5 min.

## Telemetria esperada

Endpoint:

```text
POST /api/mobile/telemetry
```

Header:

```text
X-Mobile-Registration-Secret: <MOBILE_REGISTRATION_SECRET>
```

Payload:

```json
{
  "device_id": "final_test_carro_amazonas",
  "lat": -3.046266,
  "lng": -60.014286,
  "speed": 0,
  "heading": 58,
  "battery": 100,
  "accuracy": 2
}
```

## Validacao ja realizada

Baseline v1 validada:

- compilacao PlatformIO;
- gravacao USB na porta `COM8`;
- comunicacao AT com modem A7670SA;
- leitura real de GNSS com antena conectada;
- Wi-Fi funcional;
- 4G Vivo funcional;
- envio HTTPS para `https://rastreio.3dhmanaus.com.br/api/mobile/telemetry`;
- resposta HTTP `202` da API;
- visualizacao do dispositivo no dashboard do TrackFlow;
- autonomia observada de aproximadamente `2h48` no teste inicial, sem capacidade real da bateria validada.

A v2 ainda nao deve ser considerada validada em campo ate completar o protocolo em `docs/lilygo-adaptive-tracking-v2-validation.md`.

## Rastreamento adaptativo v2

Implementado na branch `feature/lilygo-adaptive-tracking-v2`, pendente de build PlatformIO e teste fisico:

- estados `MOVING`, `IDLE` e `PARKED` por velocidade/deslocamento GNSS;
- heartbeat de 5 minutos quando estacionado;
- backoff 15 s -> 30 s -> 60 s -> 2 min -> 5 min;
- fila persistente NVS com 24 registros, descartando o mais antigo no overflow;
- drenagem de ate tres registros antigos por ciclo;
- Wi-Fi aberto desativado por padrao;
- sem deep sleep, PSM/eDRX ou desligamento de GNSS nesta etapa.

## Melhorias futuras

1. Criar cadastro e identidade propria para placas, separando `board` de `mobile`.
2. Criar endpoint tecnico dedicado para placas, mantendo compatibilidade temporaria com `/api/mobile/telemetry`.
3. Adicionar configuracao Wi-Fi simples, preferencialmente via portal local da placa.
4. Adicionar CA raiz fixa para HTTPS.
5. Registrar modelo, IMEI/identificador tecnico, versao de firmware e tipo de hardware no backend.
6. Avaliar deep sleep, PSM/eDRX e reducao do tempo de GNSS somente depois da validacao completa da v2.
7. Implementar leitura real de bateria e calibracao do percentual.
