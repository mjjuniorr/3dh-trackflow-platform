# Requisitos — Validacao de NF no Bling

## Objetivo

Permitir que o TrackFlow audite se uma nota fiscal registrada manualmente em uma entrega realmente existe no Bling, sem transformar o Bling na fonte principal de rastreamento e sem expor credenciais fiscais no frontend.

## Escopo

Esta funcionalidade cobre:

- consulta de NF-e e NFC-e no Bling;
- validacao individual a partir do relatorio operacional do TrackFlow;
- armazenamento do resultado da auditoria no lancamento da entrega;
- uso de automacao n8n como camada segura de integracao com OAuth Bling.

Esta funcionalidade nao cobre nesta fase:

- importacao automatica de todas as notas do Bling;
- criacao de entregas automaticamente a partir de notas fiscais;
- cancelamento de NF no Bling;
- emissao fiscal;
- comissao ou fechamento financeiro;
- cruzamento com localizacao do entregador.

O cruzamento com localizacao permanece registrado como evolucao futura.

## Sistemas envolvidos

### TrackFlow

Responsabilidades:

- registrar a entrega por numero unico de NF;
- preservar o numero informado como texto, incluindo zeros a esquerda;
- exibir relatorio operacional;
- acionar a validacao de NF;
- salvar status e metadados minimos da auditoria;
- proteger a operacao com permissao corporativa.

### n8n

Responsabilidades:

- manter a credencial OAuth do Bling;
- expor webhook privado para o TrackFlow;
- validar segredo tecnico recebido no header;
- consultar NF-e e NFC-e no Bling;
- normalizar a resposta para o contrato do TrackFlow;
- omitir dados sensiveis na resposta.

### Bling

Responsabilidades:

- responder consultas fiscais por NF-e e NFC-e;
- informar numero, data, situacao e identificadores fiscais necessarios para auditoria.

## Fluxo funcional

1. Usuario acessa `Relatorios` no TrackFlow.
2. Usuario localiza uma NF registrada.
3. Usuario clica em `Validar NF no Bling`.
4. Backend TrackFlow busca o lancamento pelo ID.
5. Backend monta payload com:
   - ID do lancamento;
   - numero da NF preservando zeros;
   - data do lancamento no fuso de Manaus;
   - data final como o dia seguinte.
6. Backend envia payload ao webhook n8n.
7. n8n consulta:
   - `GET /Api/v3/nfe`;
   - `GET /Api/v3/nfce`.
8. n8n retorna resultado sanitizado.
9. TrackFlow salva o status da validacao.
10. Tela de relatorios atualiza a coluna `Validacao`.

## Requisitos funcionais

### RF-01 — Validar NF individual

O sistema deve permitir validar uma NF individual a partir de um lancamento existente.

### RF-02 — Preservar zeros a esquerda

O sistema deve tratar o numero da NF como texto. O numero `000445` nao pode virar `445`, e `001456` nao pode virar `1456`.

### RF-03 — Consultar NF-e e NFC-e

A automacao n8n deve consultar as duas possibilidades:

```text
GET /Api/v3/nfe
GET /Api/v3/nfce
```

### RF-04 — Usar janela de data segura

Para uma entrega lancada em `2026-08-25`, o TrackFlow deve enviar:

```text
issue_date=2026-08-25
issue_date_end=2026-08-26
```

### RF-05 — Registrar status da auditoria

O TrackFlow deve armazenar:

- `pending`;
- `valid`;
- `not_found`;
- `divergent`;
- `error`.

### RF-06 — Exibir status no relatorio

A tela de relatorios deve exibir o estado de validacao de cada NF.

### RF-07 — Nao bloquear operacao

Falha no Bling ou no n8n nao deve impedir que uma entrega seja registrada manualmente.

## Requisitos de seguranca

### RS-01 — OAuth Bling fora do TrackFlow

O TrackFlow nao deve armazenar access token, refresh token ou client secret do Bling nesta fase.

### RS-02 — Webhook protegido por segredo tecnico

O TrackFlow deve enviar o header:

```text
X-TrackFlow-Bling-Secret: <segredo>
```

O n8n deve rejeitar chamadas sem esse header ou com segredo invalido.

### RS-03 — Segredos fora do Git

Os valores reais de `BLING_VALIDATION_WEBHOOK_URL` e `BLING_VALIDATION_SECRET` devem ficar no Portainer/n8n, nunca versionados no Git.

### RS-04 — Resposta sanitizada

O n8n nao deve devolver CPF/CNPJ completo, endereco, telefone, e-mail, token OAuth, refresh token, client secret ou chave de acesso completa para o TrackFlow.

## Contrato tecnico

### Variaveis do TrackFlow

```env
BLING_VALIDATION_WEBHOOK_URL=https://n8n.3dhmanaus.shop/webhook/trackflow/bling/validate-invoice
BLING_VALIDATION_SECRET=<segredo forte>
```

### Requisicao TrackFlow para n8n

```json
{
  "record_id": "id_do_lancamento",
  "invoice_number": "000445",
  "issue_date": "2026-08-25",
  "issue_date_end": "2026-08-26"
}
```

### Resposta para NF encontrada

```json
{
  "found": true,
  "document_type": "nfe",
  "invoice_number": "000445",
  "issue_date": "2026-08-25",
  "status": "6",
  "divergent": false
}
```

### Resposta para NF nao encontrada

```json
{
  "found": false,
  "message": "NF nao localizada no Bling para o periodo informado."
}
```

### Resposta para NF divergente

```json
{
  "found": true,
  "document_type": "nfce",
  "invoice_number": "001456",
  "issue_date": "2026-08-25",
  "status": "2",
  "divergent": true,
  "message": "NF cancelada ou divergente."
}
```

## Criterios de aceite

- NF-e `000445` emitida em `2026-08-25` deve ser localizada quando consultada com zeros a esquerda.
- NFC-e `001456` emitida em `2026-08-25` deve ser localizada quando consultada com zeros a esquerda.
- Consulta sem zeros a esquerda nao deve ser usada como formato principal.
- Se o Bling retornar documento emitido/autorizado, a coluna deve mostrar `Validada`.
- Se o Bling nao retornar documento, a coluna deve mostrar `Nao encontrada`.
- Se o Bling retornar documento cancelado ou divergente, a coluna deve mostrar `Divergente`.
- Se n8n/Bling falhar, a coluna deve mostrar `Erro`.
- O relatorio deve continuar carregando mesmo quando a automacao n8n estiver fora do ar.
- O registro manual de entregas deve continuar funcionando mesmo sem Bling.

## Evidencia de validacao Bling

Rotas testadas com sucesso no n8n:

```text
GET /Api/v3/nfe?numero=000445&dataEmissaoInicial=2026-08-25&dataEmissaoFinal=2026-08-26&pagina=1&limite=100
GET /Api/v3/nfce?numero=001456&dataEmissaoInicial=2026-08-25&dataEmissaoFinal=2026-08-26&pagina=1&limite=100
```

Campos observados:

```text
id
tipo
situacao
numero
dataEmissao
dataOperacao
chaveAcesso
contato
loja
```

Dados fiscais e pessoais completos nao devem ser versionados.
