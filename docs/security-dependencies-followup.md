# Retomada: seguranca das dependencias e release

Registro em 2026-10-19 (America/Manaus). Estado: PENDENTE, sem autorizacao de merge ou deploy.

## Ponto de parada

- Repositorio: `mjjuniorr/3dh-trackflow-platform`.
- PR de startup/healthcheck: [#5](https://github.com/mjjuniorr/3dh-trackflow-platform/pull/5).
- Branch: `fix/backend-startup-healthcheck`; nao esta incorporada a main.
- Codigo validado: `5c69fbf0386116d9d7db466d94e216f844380128`.
- [CI aprovado](https://github.com/mjjuniorr/3dh-trackflow-platform/actions/runs/39328595044): 24 testes, typecheck, build web/backend, Compose, build Docker e smoke test com PostgreSQL/Redis descartaveis.
- [Requisitos de startup/healthcheck](backend-startup-health.md) implementados; causa-raiz do incidente anterior continua nao comprovada.
- Imagem de teste compilada no runner. Nenhuma nova imagem publicada no GHCR; tags de producao preservadas.
- Usuario decidiu deixar o merge para outro momento. Nao fazer merge, deploy ou acessar Portainer sem autorizacao explicita; consultar especificamente antes de usar Portainer.
- GitOps pode aplicar alteracoes da main automaticamente. Merge nao deve ser tratado como uma operacao sem impacto operacional.

## Evidencia da auditoria

Auditoria somente leitura executada na copia do lockfile da branch:

```bash
npm audit --package-lock-only --ignore-scripts --json --fetch-timeout=10000 --fetch-retries=0
```

Resultado: 27 pacotes sinalizados, sendo 3 criticos, 16 altos, 5 moderados e 3 baixos.
O exit code 1 corresponde aos alertas encontrados. A contagem coincide com o npm no CI.
No build backend, o npm informou 14 (3 criticos, 7 altos, 2 moderados, 2 baixos).
Essas contagens NAO devem ser somadas e nao representam necessariamente falhas independentes.
O relatorio JSON bruto nao foi versionado; os resultados e referencias estao resumidos abaixo.

Nao houve alteracao de dependencias ou lockfile no PR #5. A auditoria e da branch,
nao da imagem em execucao na VPS. Nao ha evidencia de exploracao ou nexo com a indisponibilidade anterior.
Severidade do advisory nao comprova que o caminho vulneravel seja alcancavel no TrackFlow.

## Inventario registrado

| Severidade | Pacotes sinalizados |
| --- | --- |
| Critica (3) | `proxy-addr`, `shell-quote`, `concurrently` |
| Alta (16) | `@prisma/config`, `braces`, `browserslist`, `chokidar`, `deepmerge-ts`, `engine.io`, `fast-glob`, `micromatch`, `nanoid`, `postcss`, `prisma`, `socket.io-parser`, `source-map-js`, `tailwindcss`, `vite`, `ws` |
| Moderada (5) | `baseline-browser-mapping`, `engine.io-client`, `postcss-selector-parser`, `qs`, `socket.io-adapter` |
| Baixa (3) | `@babel/core`, `body-parser`, `esbuild` |

## Alertas prioritarios e contexto

| Pacote no lockfile | Alerta | Contexto e limite da conclusao |
| --- | --- | --- |
| `proxy-addr 2.0.7` | [IP spoofing em sub-redes IPv4-mapped IPv6](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) | Dependencia do Express. O codigo usa `trust proxy = 1`, diferente da configuracao de sub-rede descrita no advisory. Avaliar cadeia de proxies e exposicao real; nao afirmar bypass confirmado. |
| `shell-quote 1.8.3` | [Injecao de comandos com valores maliciosos](https://github.com/advisories/GHSA-w7jw-789q-3m8p) e [DoS no parser](https://github.com/advisories/GHSA-395f-4hp3-45gv) | Entra por ferramenta de desenvolvimento. Nao foi identificada rota da API chamando esse componente. |
| `concurrently 9.2.1` | Herda o alerta de `shell-quote` | Usado no script raiz `dev`. Nao e uma terceira falha critica independente. |
| `socket.io-parser 4.2.6` | [Esgotamento de memoria](https://github.com/advisories/GHSA-2m8v-j782-fhvr) | Priorizar: integra a comunicacao em tempo real do servidor. |
| `engine.io 6.6.7` | [DoS por incompatibilidade de revisao do protocolo](https://github.com/advisories/GHSA-2gc4-cqfq-p2gv) | Priorizar junto ao Socket.IO; validar compatibilidade com clientes existentes. |
| `ws 8.18.3` | [DoS por fragmentacao e consumo de memoria](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) e [exposicao de memoria nao inicializada](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) | Dependencia de tempo real; avaliar alcancabilidade e atualizar com testes. |
| `nanoid 5.1.11` | [Loop com tamanhos negativos em geradores nao seguros](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | O projeto importa `customAlphabet` do pacote seguro em tracking-sessions; confirmar argumentos e caminhos antes de atribuir impacto. Ha tambem uma copia transitiva em PostCSS sinalizada pelo audit. |
| `prisma 6.19.3` / `deepmerge-ts 7.1.5` | [Exaustao de pilha ao mesclar objetos recursivos](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | Cadeia do CLI/configuracao Prisma; nao e evidencia de falha de autenticacao ou vazamento do banco. |

Vite, Babel, PostCSS, Tailwind e demais ferramentas tambem precisam de triagem.
Separar uso no build/desenvolvimento de caminhos executados no servidor. O Dockerfile
atual copia node_modules para a imagem final, inclusive ferramentas: marcar algo como
"dev" no package.json nao prova que esteja ausente da imagem. O Prisma CLI e necessario
para as migrations atuais; nao executar `npm prune --omit=dev` sem revisar esse contrato.

## Ordem sugerida para retomar

1. Ler este documento, o PR #5 e os requisitos de startup. Conferir main, branch, novos commits e checks antes de agir; preservar trabalho de outros agentes.
2. Reexecutar audit, pois advisories e versoes corrigidas podem mudar. Salvar o JSON como evidencia da nova analise; comparar monorepo, backend e imagem candidata, sem presumir que correspondam a VPS.
3. Priorizar Socket.IO/Engine.IO/ws e proxy-addr. Investigar alcancabilidade/configuracao, escolher versoes corrigidas compativeis e propor uma branch/PR de seguranca separado.
4. Tratar concurrently/shell-quote e as cadeias Prisma/build. Revisar diferencas de major version antes de qualquer atualizacao; o audit sugeriu inclusive Tailwind 4 para parte da cadeia. Nao usar `npm audit fix --force` indiscriminadamente.
5. Repetir typecheck, build, suite completa e smoke test Docker. Validar login local/OIDC, autorizacao Socket.IO, public_token, telemetria Android/firmware, relatórios e auditoria Bling em homologacao. Usar dados de teste e preservar autenticacoes tecnicas.
6. Comparar auditorias antes/depois, registrar riscos residuais e obter aprovacao para merge/release. Aprovar PR #5 nao equivale a autorizar correcoes amplas de dependencias ou implantacao.
7. Na release autorizada, publicar imagem com tag imutavel, conferir disponibilidade e fixar a tag no YAML permanente da origem correta do deploy. Revisar tambem outras diferencas entre main e a imagem antiga da VPS.
8. Somente depois de autorizacao especifica, orientar ou executar deploy e verificacoes. Nunca remover volumes ou publicar segredos.

## Criterio de encerramento futuro

- Inventario atualizado e cada alerta prioritario corrigido ou justificado com evidencia de alcance e risco residual.
- Dependencias/lockfile revisados; testes de regressao e container aprovados.
- PR(s) aprovados pelo responsavel; imagem publicada e tag identificada, quando a release for autorizada.
- Documentacao com evidencias, configuracao permanente e roteiro de reversao para a imagem anterior, considerando compatibilidade do banco.
- Nenhuma afirmacao de que o incidente foi causado por estes advisories sem prova adicional.
