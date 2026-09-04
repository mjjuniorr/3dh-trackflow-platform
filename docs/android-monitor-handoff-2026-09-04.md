# Monitor Android — continuidade em 2026-09-04

## Objetivo e arquitetura

Aplicativo de acompanhamento em `apps/android/monitor`, pacote
`br.com.tresdhmanaus.trackflow.monitor`. Interface Jetpack Compose e mapa osmdroid
com tiles OpenStreetMap; nao incorpora o site nem usa WebView.
Os dados reais vem da API do TrackFlow e do Socket.IO autenticado.

O usuario adiou o login nativo Portal/Keycloak para testar funcionalidades.
O teste usa uma sessao OIDC temporaria autorizada no computador, provisionada
por USB somente no APK debug. Nao existe acesso anonimo ao backend. Consulte
[o procedimento e suas limitacoes](android-monitor-real-data-test.md).
Nao commitar, compartilhar ou embutir tokens, senhas ou verificadores PKCE.

## Alteracoes implementadas

- Parametro `id` da rota de leitura de notificacao tipado para Express 5.
- Campos de login legiveis no tema escuro e preservados na rotacao.
- Diagnostico de erro de login sem registrar credenciais.
- Sessao temporaria com renovacao, limite absoluto de teste e limpeza ao sair.
- Mapa independente da disponibilidade da Central de Notificacoes.
- Icones originais do portal, copiados sem recorte ou alteracao dos PNGs:
  moto (`courier-top.png`), carro, aviao, onibus e barco.
- Aparencia por `computed_status`: online em cores; offline em cinza com 76%
  de opacidade; sem sinal com sepia, saturacao e rotacao de matiz do CSS web.
- Rotacao dos marcadores adaptada ao sentido horario usado pelo portal.
- Consulta adicional de `GET /api/delivery-people` a cada 15 segundos mais o
  tempo da requisicao. Respostas antigas sao descartadas apos troca de sessao
  ou recebimento de dados novos pelo socket.
- Contadores separados para online, sem sinal e offline.

## Regra de status e problema reportado

Em `services/backend/src/location-store.ts`, a idade da ultima posicao define:

| Idade da posicao | Estado |
| --- | --- |
| Ate 90 segundos | online |
| Mais de 90 segundos, ate 5 minutos | sem sinal |
| Mais de 5 minutos, ou sem posicao | offline |

O usuario relatou demora e icones ainda coloridos quando julgava os objetos
offline. A rotina `offline-monitor.ts` verifica a cada 30 segundos, mas nao
publica `location:update` ao reconciliar objetos silenciosos. Isso explica
uma fonte de atraso; a consulta periodica do Monitor reduz essa dependencia.
O contador anterior de zero online tambem podia incluir objetos em sem sinal,
cuja aparencia sepia ainda tem cor. Isso e uma hipotese para o relato visual,
nao uma confirmacao da causa. O filtro offline nao foi alterado no ultimo ajuste.

Os limites do servidor nao foram reduzidos. A consulta periodica nao transforma
um objeto em offline antes dos cinco minutos e nao substitui o teste visual.

## Evidencias e pendencias

- Builds `:app:assembleDebug` e `:monitor:assembleDebug` aprovados.
- Prisma generate, typecheck e test:notifications aprovados durante o trabalho.
- No Samsung SM-T510, recebidos sete objetos reais, com dois online; o usuario
  confirmou o funcionamento. Icones originais foram instalados e observados.
- A revisao posterior de consulta periodica compilou, mas NAO foi instalada:
  o tablet ficou offline na conexao USB e depois aguardando autorizacao ADB.
- Pendente testar a transicao online -> sem sinal -> offline -> online,
  comparando contadores, status recebido e aparencia de cada icone.
- Pendente confirmar renovacao/reabertura da sessao de teste: ela precisou ser
  reprovisionada durante uma atualizacao, e a causa nao foi isolada.
- Pendente implementar login nativo Keycloak/PKCE e logout central.
- Central de Notificacoes estava indisponivel no servidor; testes locais
  aprovados nao equivalem a validacao em producao.
- Nenhuma migration ou alteracao de autenticacao em producao foi executada.
  Migration em producao exige confirmacao explicita do usuario.

## Retomada e reproducao

1. Atualizar a `main` do repositorio e ler este documento.
2. Com Java 17 e Android SDK configurados, executar em `apps/android`:
   `./gradlew :app:assembleDebug :monitor:assembleDebug` (Windows: `gradlew.bat`).
3. Na raiz, executar `npm run prisma:generate --workspace @3dh-trackflow/backend`,
   `npm run typecheck` e `npm run test:notifications --workspace @3dh-trackflow/backend`.
4. Autorizar depuracao USB no tablet e instalar com `adb install -r`
   o arquivo `apps/android/monitor/build/outputs/apk/debug/monitor-debug.apk`.
   Nao limpar os dados do aplicativo para atualizar.
5. Se necessario, provisionar nova sessao autorizada conforme o documento de
   teste. Uma sessao anterior pode ter expirado; nao reutilizar refresh tokens
   antigos que ja tenham sido rotacionados.
6. Testar desligando um rastreador e mantendo o Monitor conectado a internet.
   Observar o status apos 90 segundos e apos cinco minutos. Os logs debug
   `TrackFlowMonitor` mostram contagens por status, sem tokens ou coordenadas.
7. Religar o rastreador e confirmar retorno das cores com nova posicao.

O workflow de `main` valida e publica imagens no GHCR; nao executa migration
nem atualiza a stack de producao. APKs e pastas de build ficam fora do Git.

## Referencias dos commits locais de origem

Base: `c9b12ec6c70c679e2c45ffa2521680f707103cf0`.
Correcoes e implementacoes: `c4a3767`, `33891f6`, `4ea6387`, `f51f5ad`,
`a3c8db6`, `aca9bd3`, `a5746bb`.
Esses identificadores documentam a sequencia local; a integracao pelo conector
GitHub pode consolidar o conteudo em outro commit. Use a `main` e o PR de
integracao como referencia compartilhada, nao um hash local isolado.
