# PRD - 3DH TrackFlow Platform

## Controle do documento

- Produto: 3DH TrackFlow Platform.
- Repositorio canonico: `https://github.com/mjjuniorr/3dh-trackflow-platform`.
- Baseline desta revisao: `d2018bfe922d07519c5d0bd49e64954d2141f57d` (`main`).
- Estado: documentacao regularizada a partir do codigo, testes, historico e evidencias existentes.
- Legenda de origem: **Confirmada**, **Inferida**, **Proposta** ou **Indefinida**.

Este documento descreve o produto. Ele nao comprova, sozinho, que uma funcionalidade esta implantada em producao. A situacao verificavel de cada requisito fica em [requirements.md](requirements.md) e [traceability.md](traceability.md).

## Problema

Empresas com entregadores e veiculos precisam acompanhar a posicao operacional em tempo real, compartilhar um rastreio temporario com clientes e auditar entregas registradas por nota fiscal, sem misturar sessoes de usuarios com credenciais tecnicas de dispositivos e infraestrutura.

## Publicos

- Equipe operacional que acompanha entregadores e veiculos.
- Administradores que cadastram dispositivos, pessoas e configuracoes.
- Funcionarios que registram e consultam entregas por nota fiscal.
- Clientes que recebem um link publico temporario de rastreio.
- Dispositivos Android e placas GPS que enviam telemetria.

## Objetivos

1. Exibir no mapa o estado mais recente dos dispositivos ativos.
2. Preservar historico de localizacao e auditoria operacional.
3. Controlar o acesso administrativo por autenticacao e permissoes.
4. Oferecer links publicos revogaveis e limitados a um unico objeto.
5. Registrar entregas por NF e consultar relatorios por periodo e entregador.
6. Validar a existencia de NF-e ou NFC-e no Bling sem expor OAuth ao TrackFlow.
7. Permitir telemetria por Android, placas GPS e integracoes de infraestrutura.

## Escopo atual

### Plataforma web e API

- Login local temporario e OIDC em modo configuravel `legacy`, `hybrid` ou `oidc`.
- Dashboard em tempo real com lista, mapa, status e tipos de veiculo.
- Cadastro, edicao e desativacao logica de entregadores/dispositivos.
- Links publicos temporarios por token.
- Registro e cancelamento logico de entregas por numero de NF.
- Relatorio paginado com filtros e resumo por entregador.
- Validacao individual de NF no Bling por webhook n8n.
- Central de notificacoes de perda e recuperacao de sinal.

### Dispositivos e telemetria

- Aplicativo Android de campo para cadastro e telemetria por HTTPS.
- Aplicativo Android Monitor somente leitura, ainda sujeito a validacoes registradas na documentacao especifica.
- Firmware LILYGO TTGO T-SIM A7670SA com GNSS, Wi-Fi e 4G testado em campo.
- Entrada alternativa por Kafka interno para integracoes de infraestrutura.

### Operacao

- PostgreSQL como persistencia principal.
- Redis para estado operacional.
- Socket.IO para atualizacao em tempo real.
- Docker Swarm, Traefik, Portainer e imagens GHCR imutaveis por commit no pipeline atual.

## Fora do escopo aprovado

- Kafka exposto diretamente para aplicativos, placas ou internet publica.
- Uso de token publico ou segredo tecnico como sessao de usuario.
- Emissao, cancelamento ou alteracao fiscal no Bling.
- Importacao automatica de todas as notas do Bling.
- Confirmacao automatica de entrega apenas por proximidade geografica.
- Comissao, fechamento financeiro ou calculo de pagamento de entregadores.
- Declarar que um registro manual de NF comprova a entrega fisica.

## Fluxos principais

### Acesso corporativo

1. O usuario entra pelo Portal ou acessa diretamente o TrackFlow.
2. O frontend inicia Authorization Code com PKCE quando OIDC esta habilitado.
3. A API valida assinatura, issuer, audience, expiracao e permissoes.
4. O Socket.IO autentica o token antes de liberar o painel.
5. Em modo `hybrid`, o login local permanece como caminho explicito de transicao.

### Telemetria tecnica

1. Android ou placa registra/usa um `device_id` conhecido.
2. O dispositivo envia HTTPS com `X-Mobile-Registration-Secret`.
3. O backend valida, normaliza, persiste e emite a atualizacao.
4. Integracoes internas podem usar Kafka sem alterar a autenticacao dos dispositivos.

### Rastreamento publico

1. Usuario autorizado cria uma sessao temporaria.
2. O cliente acessa `/t/:public_token` sem login corporativo.
3. A API e o Socket.IO limitam a resposta ao entregador vinculado.
4. Expiracao ou revogacao encerra o acesso.

### Entregas, relatorio e Bling

1. Usuario autorizado registra uma NF e associa um entregador.
2. O TrackFlow preserva o registro e permite cancelamento logico.
3. O relatorio filtra registros e resume totais.
4. A validacao Bling chama um webhook protegido do n8n.
5. O n8n mantem OAuth, consulta NF-e/NFC-e e devolve resultado sanitizado.

## Seguranca e separacao de credenciais

- Web administrativa: OIDC ou JWT local conforme `AUTH_MODE`.
- API administrativa: Bearer token e permissoes no backend.
- Socket.IO do painel: mesmo contexto autenticado da web.
- Link publico: `public_token` restrito a uma sessao.
- Android e firmware: segredo tecnico de registro, nao sessao humana.
- Kafka: autenticacao e isolamento de infraestrutura.
- Bling: OAuth mantido no n8n; TrackFlow usa segredo tecnico do webhook.
- Segredos reais nao pertencem ao Git nem a esta documentacao.

## Criterios de sucesso

- Usuarios sem permissao recebem negacao no backend, nao apenas ocultacao visual.
- Um link publico nao revela outros entregadores.
- Telemetria continua operando independentemente do login corporativo.
- Relatorios refletem os registros preservados no banco e seus cancelamentos logicos.
- Falha do Bling nao impede o registro operacional da entrega.
- Builds e verificacoes documentadas podem ser repetidos sem depender da conversa com um agente.
- Deploy usa imagem identificada por commit e nao depende de alteracao manual efemera no servico.

## Limitacoes conhecidas

- O registro de entrega representa um lancamento administrativo; nao existe `delivered_at` ou comprovante fisico no modelo atual.
- A validacao Bling usa hoje a data do lancamento da entrega como inicio da consulta, o que falha quando a NF foi emitida em outro dia.
- A identidade de NF e somente `invoice_number`; emitente, serie e tipo fiscal ainda nao fazem parte da chave.
- A autenticacao tecnica movel aceita requisicao quando o segredo nao esta configurado; o ambiente deve configurar a variavel e o comportamento deve ser endurecido em tarefa separada.
- O seed e alguns composes ainda possuem fallback legado de credencial administrativa; producao deve sobrescrever as variaveis e a remocao do fallback exige alteracao separada de codigo/configuracao.
- O firmware de bancada ainda desativa verificacao de certificado em caminhos HTTPS; isso precisa ser corrigido antes de considerar redes abertas seguras.
- Retencao de localizacoes, RPO, RTO, SLO e restauracao de backup ainda nao possuem politica aprovada e evidenciada.

## Documentos relacionados

- [Requisitos](requirements.md)
- [Rastreabilidade](traceability.md)
- [Decisoes](decisions.md)
- [Arquitetura](../architecture.md)
- [Estado atual](../current-state.md)
- [Operacao](../operations.md)
