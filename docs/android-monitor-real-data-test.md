# Monitor Android: teste temporario com dados reais

Validacao em 2026-09-04, Samsung SM-T510.

## Escopo

O APK debug pode receber uma sessao OIDC temporaria, autorizada no computador,
para testar dados reais e Socket.IO antes da implementacao do login nativo.
Isso nao cria acesso anonimo, conta local ou excecao no backend. A sessao usa
o cliente publico existente `trackflow-web`, PKCE S256 e as permissoes da conta
autorizada no Portal. Nao ha senha, access token ou refresh token no APK ou Git.

O operador realiza o fluxo de autorizacao no navegador oficial do Keycloak.
Na validacao, foi usado como retorno HTTPS o endpoint existente
`https://rastreio.3dhmanaus.com.br/api/auth/config`, coberto pelo redirect
registrado `https://rastreio.3dhmanaus.com.br/*`. O operador verifica `state` e
issuer e troca o codigo de uso unico com o verifier PKCE. Nao se extrai sessao
do armazenamento privado do navegador. Isso e um procedimento de teste, nao
o fluxo de login definitivo do aplicativo.

## Provisionamento

Somente um aparelho autorizado por USB, com APK debug instalado, recebe o JSON
em `no_backup/monitor-test-session.json`, dentro do diretorio privado do app.
O arquivo deve ser criado com permissao 0600 usando `adb run-as`; nao usar
armazenamento compartilhado, links publicos ou colocar os tokens no comando.

Campos do arquivo, todos provisionados fora do repositorio:

- `access_token`: token OIDC da sessao autorizada;
- `refresh_token`: renovacao da mesma sessao;
- `expires_at`: expiracao do access token, Unix seconds;
- `test_until`: limite absoluto de duracao do teste, Unix seconds.

Na validacao, `test_until` foi definido como duas horas apos o provisionamento.
`expires_at` foi inicialmente zero para exercitar a renovacao real no tablet.

O arquivo e ignorado em builds nao debug. O app renova antes da expiracao,
reconecta o Socket.IO quando o token muda e encerra o teste no limite absoluto.
Sair remove a sessao de teste. A revogacao no Keycloak tambem pode impedir
renovacoes. O bootstrap e a renovacao respeitam cancelamento e geracao de sessao
para evitar reautenticacao depois de Sair.

## Mapa e notificacoes

O mapa carrega `GET /api/delivery-people` e recebe `location:update` apos
`dashboard:join` autenticado. O indicador Ao vivo aparece somente depois de
receber uma mensagem de localizacao valida; desconexoes removem o indicador.

O carregamento do mapa nao depende da Central de Notificacoes. Se suas rotas
falharem, o app mostra a indisponibilidade e preserva os dados do mapa.

## Evidencias

- `:app:assembleDebug` e `:monitor:assembleDebug` aprovados.
- Sessao renovada pelo proprio tablet, confirmada por `expires_at` atualizado.
- Sete objetos reais recebidos em varias mensagens Socket.IO sucessivas.
- Painel web confirmou dois online: Tablet e Teste Carro - Amazonas Shopping.
- Mapa renderizado e indicador Ao vivo exibido no tablet.
- Central de Notificacoes indisponivel no servidor durante este teste.
- Nenhuma migration, deploy ou alteracao de autenticacao em producao executada.

O login nativo Portal/Keycloak, o logout central completo e a validacao da
Central de Notificacoes em producao continuam pendentes. O APK sozinho nao
concede acesso: outro aparelho precisa de provisionamento proprio autorizado.
