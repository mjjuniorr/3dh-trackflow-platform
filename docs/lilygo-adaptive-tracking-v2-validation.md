# LILYGO A7670SA - Adaptive Tracking v2

Ultima revisao: 2026-09-03.

## Objetivo

Documentar a evolucao do firmware da LILYGO TTGO T-SIM A7670SA da baseline v1 validada em campo para a v2 Adaptive Tracking, preservando o que ja funciona e permitindo medir separadamente o ganho obtido apenas por inteligencia de firmware.

## Branches

Baseline validada:

```text
feature/multi-board-firmware-architecture
```

Firmware v2 em desenvolvimento:

```text
feature/lilygo-adaptive-tracking-v2
```

A v1 nao deve ser alterada durante a validacao da v2.

## Baseline v1

Validado:

- placa LILYGO TTGO T-SIM A7670SA;
- modem A7670SA;
- GNSS real;
- Wi-Fi;
- 4G Vivo;
- APN configuravel;
- envio HTTPS para o TrackFlow;
- resposta HTTP `202`;
- visualizacao do dispositivo no dashboard.

Comportamento da v1:

- envio em intervalo fixo de 30 segundos;
- GNSS e modem mantidos ativos;
- prioridade de transporte Wi-Fi salvo -> 4G -> Wi-Fi aberto;
- sem fila persistente;
- sem backoff progressivo;
- sem estrategia de estados.

Benchmark inicial de autonomia:

```text
aproximadamente 2h48
```

Esse numero e apenas referencia experimental. A bateria usada no teste traz marcacao comercial de 9900mAh, mas essa capacidade nao foi validada e nao deve ser usada para estimar corrente media.

## Objetivos da v2

- reduzir transmissao desnecessaria;
- reduzir atividade de rede quando o veiculo estiver parado;
- evitar repeticao excessiva de coordenadas;
- controlar reconexao quando nao houver rede;
- preservar telemetria durante perda temporaria de conectividade;
- manter qualidade de rastreamento quando o veiculo estiver em movimento;
- medir o ganho antes de introduzir deep sleep ou PSM/eDRX.

## Parametros da v2

### GNSS

Amostragem:

```text
15 s
```

### MOVING

Um envio e permitido quando ocorrer qualquer uma destas condicoes:

- 15 segundos desde a ultima telemetria aceita;
- deslocamento >= 50 metros;
- mudanca de direcao >= 30 graus;
- variacao de velocidade >= 10 km/h;
- transicao para MOVING.

O estado MOVING e inferido quando:

- velocidade GNSS >= 5 km/h; ou
- deslocamento entre amostras >= 25 metros.

### IDLE

Enquanto parado por menos de 5 minutos:

```text
envio a cada 60 s
```

### PARKED

Depois de 5 minutos sem movimento:

```text
heartbeat a cada 5 min
```

### OFFLINE

Backoff:

```text
15 s -> 30 s -> 60 s -> 2 min -> 5 min
```

O valor fica limitado a 5 minutos ate que uma transmissao volte a funcionar.

## Fila offline

Implementacao:

- armazenamento em NVS por `Preferences`;
- fila circular persistente;
- capacidade: 24 registros JSON;
- sobrevive a reset;
- overflow: descarta o registro mais antigo;
- drenagem: no maximo 3 registros antigos por ciclo.

O objetivo da fila e preservar uma trilha curta durante perda temporaria de sinal sem permitir crescimento ilimitado da memoria.

## Conectividade

Prioridade:

```text
Wi-Fi salvo -> 4G -> Wi-Fi aberto opcional
```

Na v2:

- Wi-Fi aberto fica desativado por padrao;
- Wi-Fi salvo e testado quanto a acesso externo;
- se o Wi-Fi salvo nao tiver internet, o firmware libera fallback para 4G;
- falhas de rede entram em backoff;
- comandos AT contendo credenciais ou secret deixam de ser impressos integralmente no monitor serial.

## O que nao faz parte da v2

Intencionalmente fora desta fase:

- deep sleep;
- light sleep como estrategia principal;
- PSM;
- eDRX;
- desligamento agressivo do A7670SA;
- desligamento/reducao dinamica do GNSS;
- wake por acelerometro;
- leitura real/calibrada do percentual de bateria;
- mudanca no contrato da API;
- batch de telemetria no backend.

Esses itens so devem ser avaliados depois de medir a v2.

## Codigo principal

```text
firmware/lilygo-a7670sa/src/main.cpp
firmware/lilygo-a7670sa/lib/AdaptiveTracking/src/AdaptiveTracking.h
firmware/lilygo-a7670sa/lib/AdaptiveTracking/src/AdaptiveTracking.cpp
firmware/lilygo-a7670sa/test/test_adaptive_tracking/test_main.cpp
```

## Estado de validacao

Concluido:

- implementacao da logica adaptativa;
- testes C++ puros da maquina de estados;
- testes de gatilho por intervalo;
- testes de gatilho por distancia;
- testes de mudanca de direcao;
- teste de variacao de velocidade;
- teste de transicao IDLE -> PARKED;
- teste de backoff progressivo;
- preservacao da baseline v1.

Pendente:

- build PlatformIO completo no Windows;
- upload para a LILYGO;
- teste Wi-Fi da v2;
- teste 4G da v2;
- confirmacao de HTTP `202`;
- teste de fila offline;
- teste de persistencia da fila apos reset;
- teste de drenagem da fila;
- verificacao dos estados em movimento real;
- teste de autonomia.

## Procedimento de build

No computador:

```powershell
git fetch origin
git checkout feature/lilygo-adaptive-tracking-v2
git pull
cd firmware\lilygo-a7670sa
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi
```

Resultado esperado:

```text
SUCCESS
```

Nao promover a v2 se houver warnings/erros que indiquem incompatibilidade de biblioteca, memoria ou API Arduino.

## Procedimento de upload

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi -t upload
```

Monitor:

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe device monitor -p COM8 -b 115200
```

Mensagem de boot esperada:

```text
3DH TrackFlow LILYGO v2 - Adaptive Tracking
```

## Teste funcional 1 - Wi-Fi

Objetivo: garantir que a v2 nao quebrou o caminho ja validado.

Aceite:

- conecta ao Wi-Fi salvo;
- obtem fix GNSS;
- mostra decisao de tracking;
- envia telemetria;
- backend responde HTTP `202`;
- marcador aparece/atualiza no TrackFlow.

## Teste funcional 2 - 4G

Objetivo: garantir regressao zero no A7670SA.

Procedimento:

- usar SIM Vivo ativo;
- indisponibilizar o Wi-Fi salvo ou forcar o teste celular;
- confirmar registro de rede;
- confirmar APN;
- obter fix GNSS;
- enviar telemetria.

Aceite:

```text
4G conectado
HTTP 4G status=202
```

## Teste funcional 3 - estados adaptativos

### MOVING

Em deslocamento real, verificar no serial:

```text
TRACK state=MOVING
```

Confirmar que o mapa continua fluido e que os envios nao excedem o limite planejado.

### IDLE

Parar o veiculo.

Esperado:

```text
TRACK state=IDLE
```

Telemetria a aproximadamente 60 segundos.

### PARKED

Manter parado por mais de 5 minutos.

Esperado:

```text
TRACK state=PARKED
```

Heartbeat a aproximadamente 5 minutos.

## Teste funcional 4 - fila offline

Procedimento:

1. manter GNSS valido;
2. retirar conectividade;
3. provocar ciclos que deveriam enviar;
4. confirmar crescimento da fila;
5. reiniciar a placa ainda offline;
6. confirmar que a fila reaparece apos boot;
7. restaurar conectividade;
8. confirmar drenagem dos registros antigos;
9. confirmar novos registros no TrackFlow.

Aceite:

- nenhum crash;
- fila sobrevive ao reset;
- contagem nao passa de 24;
- overflow descarta o mais antigo;
- drenagem ocorre em lotes de no maximo 3 por ciclo.

## Teste funcional 5 - backoff

Retirar rede e acompanhar o serial.

Sequencia esperada:

```text
15 s
30 s
60 s
120 s
300 s
300 s
...
```

Ao recuperar a rede, o contador deve zerar.

## Teste de autonomia

Objetivo: comparar v1 e v2 usando o mesmo metodo.

Procedimento recomendado:

1. usar a mesma placa;
2. usar a mesma bateria;
3. carregar ate o mesmo criterio de carga completa;
4. desligar USB;
5. ligar pelo switch da bateria;
6. iniciar cronometro;
7. usar o mesmo SIM, antenas e configuracao;
8. executar roteiro semelhante de uso;
9. registrar hora de inicio;
10. registrar hora de desligamento;
11. registrar quantidade aproximada de tempo em movimento/parado;
12. repetir pelo menos duas vezes por versao se houver grande variacao.

Referencia atual da v1:

```text
~2h48
```

Nao atribuir o ganho apenas a software se a bateria, sinal, temperatura ou perfil de movimento forem diferentes.

## Criterios para considerar a v2 validada

A v2 so pode substituir a baseline quando:

- build PlatformIO passar;
- upload passar;
- Wi-Fi retornar HTTP `202`;
- 4G retornar HTTP `202`;
- GNSS continuar estavel;
- MOVING/IDLE/PARKED forem observados corretamente;
- fila offline funcionar e sobreviver a reset;
- backoff funcionar;
- nenhuma regressao critica aparecer no TrackFlow;
- teste de autonomia for concluido e documentado.

## Fase posterior

Depois da v2 validada, a proxima linha de trabalho pode estudar:

- PSM/eDRX do A7670SA;
- light/deep sleep do ESP32;
- reducao dinamica do GNSS;
- heartbeat ainda mais economico;
- leitura real da bateria;
- medicao de consumo por estado;
- TLS com CA fixa;
- OTA e versionamento de firmware.
