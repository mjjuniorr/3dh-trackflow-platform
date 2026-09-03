# ZX908 — Firmware TrackFlow

Este diretorio pertence exclusivamente ao firmware da placa/rastreador ZX908.

O projeto e independente do firmware da LILYGO A7670SA. Nenhum codigo de `firmware/lilygo-a7670sa` deve ser importado ou linkado aqui.

## Estado

**Fase atual: validacao de hardware antes da implementacao.**

Existem ZX908 comercializados com diferentes variantes de modem/firmware. Por isso, o codigo de producao so deve ser criado depois de confirmar a unidade fisica que sera usada pela 3DH.

QuecPython e a stack preferida quando a variante adquirida possuir um modulo Quectel suportado e ambiente compativel.

## Primeiro objetivo funcional

A primeira versao deve implementar apenas o caminho minimo:

```text
GNSS -> conectividade -> HTTPS -> TrackFlow
```

Sem OTA, geofence, ignition detection ou modos avancados de economia de energia nesta primeira etapa.

## Contrato com a plataforma

Endpoint:

```http
POST /api/mobile/telemetry
X-Mobile-Registration-Secret: <secret>
Content-Type: application/json
```

Payload esperado:

```json
{
  "device_id": "zx908-868123456789012",
  "lat": -3.119,
  "lng": -60.0217,
  "speed": 42.6,
  "heading": 127,
  "battery": 86,
  "accuracy": 7.5,
  "timestamp": "2026-09-03T16:20:00-04:00"
}
```

O IMEI e o identificador preferido para compor `device_id` quando estiver disponivel de forma estavel:

```text
zx908-<imei>
```

## Checklist de validacao da unidade fisica

Antes de escrever o firmware de producao, registrar neste README ou em documento tecnico:

- modelo exato do modulo Quectel;
- versao do firmware/baseband;
- suporte ou nao a QuecPython;
- metodo de gravacao e recuperacao do firmware;
- interface USB/UART disponivel para debug;
- API/comandos para GNSS;
- API/comandos para obter IMEI;
- bandas LTE e comportamento do APN;
- disponibilidade real de Wi-Fi na variante;
- API para nivel/estado da bateria;
- pinos, sensores e acelerometro existentes;
- memoria persistente disponivel para buffer offline;
- comportamento de watchdog e reset.

## Politica de conectividade desejada

Se a variante de hardware suportar Wi-Fi e LTE:

1. usar primeiro o Wi-Fi configurado, incluindo Starlink do veiculo;
2. usar LTE Cat-1 como fallback;
3. se ambos falharem, guardar telemetria localmente;
4. reenviar o historico quando a conectividade retornar.

A implementacao deve refletir apenas capacidades verificadas na placa fisica.

## Seguranca

- nunca versionar APN privado, senhas Wi-Fi ou segredo real do TrackFlow;
- fornecer apenas arquivos de configuracao de exemplo;
- usar HTTPS;
- validar certificado do servidor em builds de producao;
- modos TLS inseguros devem existir somente para bring-up/debug explicitamente identificado.

## Estrutura prevista apos validacao

Se QuecPython for confirmado, a estrutura inicial recomendada e:

```text
firmware/zx908/
  README.md
  config.example.py
  main.py
  trackflow/
    device.py
    gnss.py
    network.py
    telemetry.py
    storage.py
  tests/
```

Os modulos serao criados somente quando as APIs reais da variante ZX908 estiverem confirmadas, para evitar codigo baseado em suposicoes de hardware.
