# Inicializacao e saude do backend

Para retomar a release e a triagem dos alertas de dependencias, veja
[Seguranca e pendencias de release](security-dependencies-followup.md).
O merge foi adiado pelo responsavel; nao ha autorizacao de deploy.

## Escopo e requisitos

- Executar `prisma migrate deploy` uma vez por inicializacao do container.
- Iniciar a API somente depois do sucesso das migrations.
- Preservar o codigo de saida da migration; registrar a falha e encerrar o container.
- Usar o Prisma instalado na imagem, sem downloads via `npx` na inicializacao.
- Deixar o Swarm controlar novas tentativas, com `restart_policy.delay: 10s`.
- Detectar uma API que nao responde, mesmo que o processo/container apareca como Running.
- Manter `/health` e disponibilizar `/api/health` pelo proxy `/api/` existente no frontend.
- Nao alterar autenticacao, usuarios, dados, volumes, telemetria, public_token, Kafka ou integracao Bling.
- Nao executar seed, reset de banco ou comandos destrutivos no startup.

## Fluxo implementado

O CMD da imagem executa `sh scripts/start.sh`. Uma migration bem-sucedida e seguida
por `exec node dist/src/server.js`, deixando a API como processo principal do container.
Uma falha encerra a inicializacao com o mesmo exit code. Nao existe mais um loop
infinito de tentativas dentro de um container aparentemente saudavel.

Uma indisponibilidade temporaria do banco ainda pode gerar novas tentativas pelo
orquestrador. Uma migration permanentemente incorreta exige intervencao: esta
mudanca nao corrige migrations automaticamente nem garante recuperacao de toda falha.

## Liveness, nao prontidao completa

`GET /health` e `GET /api/health` respondem HTTP 200 com:

```json
{"status":"ok"}
```

As rotas sao publicas, nao cacheaveis e ficam fora do limitador compartilhado da API.
Nao revelam versoes, credenciais ou detalhes internos. Elas confirmam apenas que o
servidor HTTP consegue responder; nao consultam PostgreSQL, Redis, Kafka, Keycloak ou n8n.
Assim, uma falha de um provedor externo nao provoca reinicios em cascata por liveness.
HTTP 200 nao comprova login, rastreamento, prontidao do banco ou validacao de notas.

O probe da imagem usa Node.js e consulta `127.0.0.1:${PORT:-4000}/api/health`:

- Intervalo Docker: 20 segundos.
- Prazo total da requisicao HTTP: 2 segundos; timeout externo Docker: 3 segundos.
- Carencia inicial: 120 segundos, permitindo migrations.
- Tres falhas consecutivas apos a carencia marcam o container como unhealthy.
- Respostas diferentes de HTTP 200, conexao recusada e timeout falham o probe.

No Swarm, tarefas unhealthy podem ser substituidas conforme a politica do servico.
No Docker/Compose standalone, o healthcheck apenas sinaliza unhealthy: nao e, sozinho,
um mecanismo de reinicio. Uma migration travada pode consumir a carencia e levar a
unhealthy; ajuste essa carencia conscientemente se uma migration legitima exigir mais tempo.

## Evidencia do incidente

O usuario observou falha em `/api/auth/config`, recebeu HTTP 502 do proxy e recuperou
o acesso apos recriar as tarefas de backend e frontend. Isso nao comprova a causa.
Nao foi demonstrado se o incidente veio de migrations, DNS/rede, runtime Docker ou
outro problema. Esta alteracao remove riscos identificados no codigo e melhora a
observabilidade; nao deve ser descrita como causa-raiz confirmada daquele incidente.

## Validacao automatizada

```bash
npm ci
npm run prisma:generate --workspace @3dh-trackflow/backend
npm run test:health --workspace @3dh-trackflow/backend
```

O teste de startup requer um shell POSIX. No Windows, `TEST_SHELL` pode apontar para
o `sh.exe` do Git for Windows; os testes de CI rodam em Linux com Node 22.

O workflow `backend-health.yml`, acionado em pull requests, executa typecheck,
build, testes existentes, validacao Compose, build Docker e smoke test da imagem.
Ele nao publica imagens nem acessa producao ou Portainer.

```bash
docker build -f services/backend/Dockerfile -t trackflow-backend-health:local .
sh scripts/test-backend-container.sh trackflow-backend-health:local
```

O smoke test cria uma rede, PostgreSQL, Redis e containers descartaveis com nomes
exclusivos. Verifica falha real do Prisma, startup normal, as duas rotas de saude,
`/api/auth/config`, independencia do rate limit e deteccao de processo sem resposta.
Remove apenas seus proprios containers, volumes anonimos e rede ao terminar.
Nao usar esse teste contra banco, volumes ou servicos de producao.

## Publicacao e implantacao separadas

1. Revisar o PR e seus checks. Nao fazer merge sem autorizacao do responsavel.
2. Publicar uma imagem pelo workflow existente, usando a tag imutavel do commit.
3. Confirmar sucesso do build e disponibilidade da imagem no GHCR antes de divulgar a tag como pronta.
4. Em uma alteracao de release separada, fixar a imagem validada no YAML usado pelo deploy.
5. Conferir com o responsavel a origem real da stack e suas variaveis. Nao editar copias
   internas do volume do Portainer como se fossem necessariamente a origem do deploy.
6. Obter autorizacao especifica antes de acessar Portainer ou implantar. GitOps pode
   aplicar mudancas da main automaticamente; merge tambem exige esse cuidado.

Este PR mantem as tags existentes no Compose. A mudanca de Dockerfile so chega a
producao apos build, publicacao e selecao da nova imagem. Um redeploy com a imagem
antiga nao adiciona o healthcheck. O `delay: 10s` e a unica alteracao proposta no
Compose de producao; redes, volumes e demais servicos permanecem iguais.

A imagem construida da main pode incluir funcionalidades alem desta melhoria que
nao estejam na imagem antiga fixada em producao. Revisar o diff completo da release
antes de trocar a tag. Nao usar `latest` ou `producao` como tag de release.

## Checklist apos implantacao autorizada

- Confirmar a imagem e o estado healthy da tarefa, nao apenas Running.
- Consultar `https://rastreio.3dhmanaus.com.br/api/health` com timeout curto.
- Verificar `/api/auth/config`, login local e login central em uma nova sessao.
- Verificar dashboard/Socket.IO, rastreamento publico e telemetria Android/placa.
- Verificar uma consulta Bling e a disponibilidade das dependencias.
- Se houver falha, coletar estado da tarefa e logs com limites antes de reiniciar,
  evitando perder evidencias. Healthcheck nao substitui alertas nem analise de logs.
