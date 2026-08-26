# Validacao Bling via n8n

O TrackFlow nao guarda credenciais OAuth do Bling. A validacao de NF usa um webhook n8n autenticado por segredo tecnico.

## Variaveis do backend

```env
BLING_VALIDATION_WEBHOOK_URL=https://n8n.3dhmanaus.shop/webhook/trackflow/bling/validate-invoice
BLING_VALIDATION_SECRET=<segredo forte configurado tambem no n8n>
```

## Requisicao enviada pelo TrackFlow

Metodo:

```text
POST
```

Header:

```text
X-TrackFlow-Bling-Secret: <BLING_VALIDATION_SECRET>
```

Body:

```json
{
  "record_id": "id_do_lancamento_trackflow",
  "invoice_number": "000445",
  "issue_date": "2026-08-25",
  "issue_date_end": "2026-08-26"
}
```

Regras:

- `invoice_number` e texto e deve preservar zeros a esquerda;
- `issue_date` e o dia do lancamento da entrega no fuso de Manaus;
- `issue_date_end` e sempre o dia seguinte;
- a automacao deve consultar NF-e e NFC-e.

## Consultas Bling validadas

Exemplos reais ja validados no n8n:

```text
GET /Api/v3/nfe?numero=000445&dataEmissaoInicial=2026-08-25&dataEmissaoFinal=2026-08-26&pagina=1&limite=100
GET /Api/v3/nfce?numero=001456&dataEmissaoInicial=2026-08-25&dataEmissaoFinal=2026-08-26&pagina=1&limite=100
```

As consultas sem zeros a esquerda nao localizaram as mesmas notas.

## Resposta esperada pelo TrackFlow

NF encontrada e aceita:

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

NF nao encontrada:

```json
{
  "found": false,
  "message": "NF nao localizada no Bling para o periodo informado."
}
```

NF encontrada, mas com divergencia:

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

## Status aceitos pelo TrackFlow

O TrackFlow considera validada quando:

- `found=true`;
- `divergent` nao e `true`;
- `status` e `authorized`, `autorizada`, `5`, `6` ou `emitida danfe`.

Qualquer outro status de documento encontrado entra como `divergent`.

## Workflow n8n recomendado

Nome sugerido:

```text
38. TrackFlow - Validar NF no Bling
```

Nós:

```text
Webhook TrackFlow
Validar segredo
Consultar NF-e
NF-e encontrada?
Consultar NFC-e
Montar resposta
Respond to Webhook
```

### 1. Webhook TrackFlow

Tipo:

```text
Webhook
```

Metodo:

```text
POST
```

Path sugerido:

```text
trackflow/bling/validate-invoice
```

Response mode:

```text
Using Respond to Webhook node
```

### 2. Validar segredo

O workflow deve comparar:

```text
{{$json.headers["x-trackflow-bling-secret"]}}
```

com o segredo configurado no n8n.

Se o segredo estiver ausente ou invalido, responder:

```json
{
  "found": false,
  "message": "Nao autorizado."
}
```

com HTTP `401`.

### 3. Consultar NF-e

URL:

```text
https://api.bling.com.br/Api/v3/nfe
```

Query parameters:

```text
numero={{$json.body.invoice_number}}
dataEmissaoInicial={{$json.body.issue_date}}
dataEmissaoFinal={{$json.body.issue_date_end}}
pagina=1
limite=100
```

Autenticacao:

```text
OAuth2 API: Bling - Teste Credencial
```

### 4. Consultar NFC-e

Executar somente quando a NF-e nao for encontrada.

URL:

```text
https://api.bling.com.br/Api/v3/nfce
```

Query parameters:

```text
numero={{$json.body.invoice_number}}
dataEmissaoInicial={{$json.body.issue_date}}
dataEmissaoFinal={{$json.body.issue_date_end}}
pagina=1
limite=100
```

Autenticacao:

```text
OAuth2 API: Bling - Teste Credencial
```

### 5. Montar resposta

Quando encontrar documento, retornar somente:

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

Exemplo para um node `Code` depois das consultas:

```js
const inputInvoice = String($json.body?.invoice_number ?? "").trim();
const issueDate = String($json.body?.issue_date ?? "").slice(0, 10);

function firstDocument(response) {
  const data = response?.data;
  return Array.isArray(data) ? data[0] : null;
}

const nfe = firstDocument($items("Consultar NF-e")[0]?.json);
const nfce = firstDocument($items("Consultar NFC-e")[0]?.json);
const document = nfe ?? nfce;
const documentType = nfe ? "nfe" : nfce ? "nfce" : null;

if (!document) {
  return [{
    json: {
      found: false,
      message: "NF nao localizada no Bling para o periodo informado."
    }
  }];
}

const invoiceNumber = String(document.numero ?? "");
const documentIssueDate = String(document.dataEmissao ?? "").slice(0, 10);
const status = String(document.situacao ?? "");
const divergent = invoiceNumber !== inputInvoice || documentIssueDate !== issueDate;

return [{
  json: {
    found: true,
    document_type: documentType,
    invoice_number: invoiceNumber,
    issue_date: documentIssueDate,
    status,
    divergent
  }
}];
```

Quando nao encontrar em NF-e nem NFC-e:

```json
{
  "found": false,
  "message": "NF nao localizada no Bling para o periodo informado."
}
```

### 6. Teste rapido do webhook

Depois de ativar o workflow:

```bash
curl -X POST "https://n8n.3dhmanaus.shop/webhook/trackflow/bling/validate-invoice" \
  -H "Content-Type: application/json" \
  -H "X-TrackFlow-Bling-Secret: <segredo>" \
  -d "{\"record_id\":\"teste\",\"invoice_number\":\"000445\",\"issue_date\":\"2026-08-25\",\"issue_date_end\":\"2026-08-26\"}"
```

Resultado esperado:

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
