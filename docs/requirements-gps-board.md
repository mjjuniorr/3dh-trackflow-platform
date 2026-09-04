# Requisitos - Firmware GPS Board A7670SA

Ultima revisao: 2026-09-04.

## Objetivo

Permitir que uma placa LILYGO TTGO T-SIM A7670SA envie localizacao para o TrackFlow como dispositivo de rastreio dedicado, preservando a plataforma web, Android, Kafka, Redis, PostgreSQL, rastreamento publico e autenticacoes tecnicas existentes.

## Hardware inicial

- Placa: LILYGO TTGO T-SIM A7670SA.
- USB serial no Windows: `USB Enhanced Serial CH9102`.
- Porta usada em bancada: `COM8`.
- GNSS: interno do modem A7670SA, com antena conectada.
- 4G: modem A7670SA com SIM e APN configurados localmente; validado em campo
  com telemetria aceita pelo TrackFlow.

## Requisitos funcionais

1. A placa deve iniciar sem depender de SIM.
2. A placa deve tentar conectar primeiro em uma rede Wi-Fi salva.
3. Se a rede salva falhar, a placa deve tentar dados 4G pelo SIM.
4. Se o 4G falhar, a placa pode procurar redes Wi-Fi abertas.
5. A placa deve testar conectividade externa antes de usar uma rede aberta.
6. A placa deve ler localizacao real do GNSS interno por comandos AT.
7. A placa deve enviar telemetria por HTTPS para a API tecnica do TrackFlow.
8. A placa deve usar `X-Mobile-Registration-Secret` enquanto nao houver endpoint tecnico proprio para boards.
9. A placa deve permitir associacao temporaria a um `device_id` existente.
10. A placa nao deve publicar direto no Kafka.
11. O backend deve manter o marcador estavel no mapa mesmo quando o dispositivo estiver parado ou sem giroscopio.

## Requisitos de seguranca

1. Segredos de Wi-Fi e `MOBILE_REGISTRATION_SECRET` ficam somente em `firmware/gps-board/include/secrets.h`.
2. `include/secrets.h` nao pode ser commitado.
3. APN, usuario e senha da operadora tambem ficam somente em `include/secrets.h`.
4. O monitor serial deve ocultar comandos que contenham segredos ou credenciais da operadora.
5. Kafka deve continuar interno na VPS; a placa nunca deve usar o broker Kafka publico.
6. O uso de rede Wi-Fi aberta e uma funcao de contingencia e pode ser desativado por build flag.
7. `client.setInsecure()` e aceito apenas nesta fase de bancada; a fase seguinte deve fixar CA raiz.

## Requisitos tecnicos do firmware

- Projeto PlatformIO em `firmware/gps-board`.
- Ambiente principal: `lilygo_a7670sa_wifi`.
- Board PlatformIO: `esp32dev`.
- Serial do modem: `Serial1`.
- RX modem: `GPIO27`.
- TX modem: `GPIO26`.
- PWRKEY modem: `GPIO4`.
- RESET modem: `GPIO5`.
- POWERON board: `GPIO12`.
- Baud do modem: `115200`.
- Intervalo inicial de envio: 30 segundos.

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

- Compilacao PlatformIO do firmware.
- Gravacao USB na porta `COM8`.
- Comunicacao AT com modem `A7670SA-FASE`.
- Leitura real de GNSS com antena conectada.
- Envio HTTPS para `https://rastreio.3dhmanaus.com.br/api/mobile/telemetry`.
- Resposta HTTP `202` da API.
- Visualizacao do dispositivo no dashboard do TrackFlow.
- Registro do SIM na rede 4G e envio HTTPS em teste de campo com resposta HTTP `202`.

## Melhorias futuras

1. Criar cadastro e identidade propria para placas, separando `board` de `mobile`.
2. Criar endpoint tecnico dedicado para placas, mantendo compatibilidade temporaria com `/api/mobile/telemetry`.
3. Adicionar configuracao Wi-Fi simples, preferencialmente via portal local da placa.
4. Adicionar medicao de bateria via GPIO35, calibrada por multimetro.
5. Adicionar fila local para quedas de sinal e politica adaptativa de economia de bateria.
6. Adicionar CA raiz fixa para HTTPS.
7. Registrar modelo, IMEI/identificador tecnico, versao de firmware e tipo de hardware no backend.
