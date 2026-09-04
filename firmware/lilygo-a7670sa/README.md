# 3DH TrackFlow GPS Board Firmware

Firmware da placa LILYGO TTGO T-SIM A7670SA para o TrackFlow, com GNSS interno, Wi-Fi, 4G e rastreamento adaptativo.

Esta primeira versao valida a placa, a gravacao via USB, a conexao Wi-Fi, a
leitura do GNSS interno do A7670SA, o fallback para dados 4G com SIM/APN e o
envio HTTPS para a API tecnica de telemetria do TrackFlow.

## Hardware

- Placa: LILYGO TTGO T-SIM A7670SA
- Serial USB detectada no Windows: `USB Enhanced Serial CH9102`
- Porta usada neste projeto: `COM8`
- Baud rate do monitor serial: `115200`
- Modem A7670SA: `Serial1`, RX `GPIO27`, TX `GPIO26`
- GNSS: via comandos AT no modem, depois de conectar a antena GPS/GNSS

## Configurar segredos locais

Copie o modelo:

```powershell
Copy-Item include\secrets.example.h include\secrets.h
```

Edite `include/secrets.h`:

```cpp
#define TRACKFLOW_WIFI_SSID "NOME_DA_REDE"
#define TRACKFLOW_WIFI_PASSWORD "SENHA_DA_REDE"
#define TRACKFLOW_CELLULAR_APN "zap.vivo.com.br"
#define TRACKFLOW_CELLULAR_USER "vivo"
#define TRACKFLOW_CELLULAR_PASSWORD "vivo"
#define TRACKFLOW_API_URL "https://rastreio.3dhmanaus.com.br/api/mobile/telemetry"
#define TRACKFLOW_MOBILE_SECRET "COLOQUE_O_MOBILE_REGISTRATION_SECRET"
#define TRACKFLOW_DEVICE_ID "final_test_carro_amazonas"
```

O arquivo `include/secrets.h` fica fora do Git.

`TRACKFLOW_DEVICE_ID` associa a placa a um dispositivo ja existente no painel.
Se ficar vazio, a firmware gera um ID automatico a partir do MAC da placa.

## Ordem de conectividade

A prioridade permanece:

1. rede salva em `TRACKFLOW_WIFI_SSID`;
2. 4G usando `TRACKFLOW_CELLULAR_APN`;
3. Wi-Fi aberto apenas quando `TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK=1`;
4. sem conectividade, aplica backoff progressivo e guarda telemetria em fila persistente.

Na v2, o fallback para Wi-Fi aberto fica **desativado por padrao** para evitar scans desnecessarios de radio.

O fallback para redes abertas pode ser desligado no build com:

```ini
-D TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK=0
```

Diagnosticos detalhados do modem podem ser ligados temporariamente com:

```ini
-D TRACKFLOW_MODEM_DIAGNOSTICS=1
```

Para forcar o teste 4G sem alterar `secrets.h`, compile temporariamente com:

```ini
-D TRACKFLOW_FORCE_CELLULAR_TEST=1
```

Se o APN estiver vazio ou como `XXXX`, o 4G e ignorado. Para Vivo Brasil, use:

```cpp
#define TRACKFLOW_CELLULAR_APN "zap.vivo.com.br"
#define TRACKFLOW_CELLULAR_USER "vivo"
#define TRACKFLOW_CELLULAR_PASSWORD "vivo"
```

## Teste 4G com SIM

1. Confirme que o SIM possui pacote de dados ativo em um celular.
2. Coloque o SIM na placa desligada.
3. Ligue a placa e acompanhe pelo monitor serial.
4. Preencha `TRACKFLOW_CELLULAR_APN` em `include/secrets.h`.
5. Compile e grave novamente.
6. Desligue temporariamente o Wi-Fi salvo ou use uma rede inexistente para forcar o caminho 4G.
7. Verifique no monitor:

```text
Iniciando conexao 4G pelo modem A7670SA...
4G conectado.
POST 4G https://rastreio.3dhmanaus.com.br/api/mobile/telemetry
```

## Compilar

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi
```

## Gravar na placa

Conecte a placa na porta `COM8` e rode:

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi -t upload
```

Se a gravacao travar aguardando boot, segure `BOOT`, aperte `RST/EN`, solte
`RST/EN` e depois solte `BOOT`.

## Monitor serial

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe device monitor -p COM8 -b 115200
```

Saida esperada:

```text
3DH TrackFlow LILYGO v2 - Adaptive Tracking
Board=LILYGO_A7670SA
Device ID=final_test_carro_amazonas
Wi-Fi salvo conectado. IP=...
GNSS ativado. Aguardando fix da antena.
GNSS fix lat=... lng=...
POST https://rastreio.3dhmanaus.com.br/api/mobile/telemetry
HTTP status=202
```

Se `AT+CGNSSINFO` retornar `ERROR`, a firmware tenta automaticamente
`AT+CGPSINFO`, que tambem e comum nos modems SIMCom A76XX.

## Contrato enviado ao TrackFlow

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
  "lat": -3.10194,
  "lng": -60.025,
  "speed": 0,
  "heading": 0,
  "battery": 100,
  "accuracy": 25
}
```

## Rastreamento adaptativo v2

A v2 substitui o envio fixo de 30 segundos por decisao adaptativa. O GNSS e consultado a cada 15 segundos e a telemetria segue estes criterios iniciais:

| Estado | Regra de envio |
| --- | --- |
| MOVING | no maximo 15 s, ou 50 m, ou 30 graus de direcao, ou 10 km/h de variacao |
| IDLE | 60 s |
| PARKED | 5 min |
| OFFLINE | backoff 15 s, 30 s, 60 s, 2 min, 5 min |

Movimento e inferido por velocidade GNSS >= 5 km/h ou deslocamento entre amostras. Depois de 5 minutos sem movimento, o estado passa para `PARKED`.

Quando a rede falha, o JSON pronto para envio e armazenado em NVS (`Preferences`) em uma fila circular de 24 registros. A fila sobrevive a reset. Ao encher, o registro mais antigo e descartado. No maximo tres registros antigos sao drenados por ciclo.

Esta fase ainda nao usa deep sleep, PSM/eDRX nem desliga o GNSS. O objetivo e medir primeiro o ganho obtido apenas com logica adaptativa e menor atividade de rede.

## Proximas etapas

- Substituir `client.setInsecure()` por CA raiz fixa.
- Adicionar modo de configuracao Wi-Fi via portal local.
- Validar APN real de operadora brasileira no A7670SA.
- Criar tipo operacional proprio para `board`, sem tratar a placa como Android na interface.
