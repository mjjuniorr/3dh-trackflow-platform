# 3DH TrackFlow GPS Board Firmware

Firmware para a placa LILYGO TTGO T-SIM A7670SA, com GNSS interno e envio de
telemetria HTTPS para o TrackFlow por Wi-Fi ou 4G.

O firmware de conectividade foi validado na placa real: obteve fix GNSS e a
API do TrackFlow aceitou a telemetria com `HTTP 202` por Wi-Fi e por 4G. A
placa nunca se conecta diretamente ao Kafka.

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
#define TRACKFLOW_CELLULAR_APN "APN_DA_OPERADORA"
#define TRACKFLOW_CELLULAR_USER "USUARIO_DA_OPERADORA"
#define TRACKFLOW_CELLULAR_PASSWORD "SENHA_DA_OPERADORA"
#define TRACKFLOW_API_URL "https://rastreio.3dhmanaus.com.br/api/mobile/telemetry"
#define TRACKFLOW_MOBILE_SECRET "COLOQUE_O_MOBILE_REGISTRATION_SECRET"
#define TRACKFLOW_DEVICE_ID "final_test_carro_amazonas"
```

O arquivo `include/secrets.h` fica fora do Git.

`TRACKFLOW_DEVICE_ID` associa a placa a um dispositivo ja existente no painel.
Se ficar vazio, a firmware gera um ID automatico a partir do MAC da placa.

## Ordem de conectividade

Em cada ciclo, a placa tenta os transportes nesta ordem:

1. rede Wi-Fi salva em `TRACKFLOW_WIFI_SSID`;
2. dados 4G pelo SIM, usando `TRACKFLOW_CELLULAR_APN`;
3. redes Wi-Fi abertas, quando esse fallback estiver habilitado;
4. se nenhum transporte estiver disponivel, nao envia uma posicao parcial e
   tenta novamente no proximo ciclo.

Para usar somente o Wi-Fi, deixe `TRACKFLOW_CELLULAR_APN` vazio. Para forcar
um teste 4G e ignorar o Wi-Fi salvo durante aquele boot, adicione ao
`platformio.ini` local:

```ini
-D TRACKFLOW_FORCE_CELLULAR_TEST=1
```

O monitor serial oculta comandos que contenham o segredo mobile ou
credenciais da operadora.

O fallback para redes abertas pode ser desligado no build com:

```ini
-D TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK=0
```

Diagnosticos detalhados do modem podem ser ligados temporariamente com:

```ini
-D TRACKFLOW_MODEM_DIAGNOSTICS=1
```

O firmware usa HTTPS no modem A7670SA e possui um segundo caminho de socket
TLS quando o cliente HTTP do modem nao consegue concluir a requisicao.

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
3DH TrackFlow GPS Board
Board=LILYGO_A7670SA
Device ID=final_test_carro_amazonas
Wi-Fi salvo conectado. IP=...
GNSS ativado. Aguardando fix da antena.
GNSS fix lat=... lng=...
POST Wi-Fi https://rastreio.3dhmanaus.com.br/api/mobile/telemetry
HTTP Wi-Fi status=202
```

Em conexao celular, o sucesso aparecera como `HTTP 4G status=202` ou
`Socket TLS status=202`.

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

## Estado de testes

- Compilacao ESP32: validada localmente.
- Telemetria por Wi-Fi e GNSS: validada na placa real com `HTTP 202`.
- Telemetria por 4G e GNSS: validada em teste de campo com SIM Vivo e
  `HTTP 202`.
- Testes nativos de C++: pendentes neste computador, pois `gcc/g++` nao estao
  instalados. Isso nao impede a compilacao nem a gravacao para ESP32.

## Proximas etapas

- Medicao de bateria por GPIO35, com calibracao por multimetro.
- Fila persistente para perda de sinal e politica adaptativa de economia de
  bateria, ainda em branch experimental separada.
- Substituir `client.setInsecure()` do caminho Wi-Fi por uma CA raiz fixa.
- Modo de configuracao Wi-Fi local.
- Criar tipo operacional proprio para `board`, sem tratar a placa como Android
  na interface.
