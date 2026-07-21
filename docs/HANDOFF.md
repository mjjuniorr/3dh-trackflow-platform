# Handoff para nova conversa Codex

Este arquivo existe para continuar o projeto em uma conversa nova sem depender do historico longo da conversa anterior.

## Contexto rapido

Projeto: `3dh-trackflow-platform`

Autenticacao central:

```text
docs/authentication-oidc.md
```

O TrackFlow esta preparado para integrar ao Portal 3DH em modo `hybrid`, preservando temporariamente o login legado.

Repositorio GitHub:

```text
https://github.com/mjjuniorr/3dh-trackflow-platform
```

Guia operacional completo para executar sozinho:

```text
docs/build-run-commit.md
```

Esse guia cobre build web/backend, containers locais, Android, instalacao no aparelho, limpeza do app, teste Kafka e commits.

Ambientes oficiais:

- PC = homologacao local.
- VPS Hostinger = producao.
- Portainer + Docker Swarm + Traefik ja existem na VPS.
- Rede externa Docker: `PortainerRede`.
- Dominio publico: `https://rastreio.3dhmanaus.com.br`.
- Kafka interno na VPS: `kafka:9092`.
- Kafka externo para testes no PC: nao usar porta publica; usar container backend na VPS, VPN ou tunel SSH temporario.
- Kafka UI: `https://kafka.3dhmanaus.com.br` deve usar Keycloak/OIDC e modo somente leitura.
- Topico Kafka: `rastreamento`.

## Estado funcional atual

Ja funciona:

- login no painel web;
- dashboard em tempo real;
- pagina publica de rastreio;
- links temporarios;
- cadastro manual de entregadores pela engrenagem;
- cadastro automatico pelo Android;
- telemetria Android via backend HTTPS;
- Kafka consumindo eventos no topico `rastreamento` pela rede interna;
- registro administrativo de entregas por nota fiscal unica, em homologacao;
- selecao de tipo de veiculo:
  - `motorcycle`;
  - `car`;
  - `boat`;
  - `airplane`;
  - `bus`.

## Seguranca Kafka

- Nao expor broker Kafka diretamente na internet.
- Backend de producao deve usar `KAFKA_BROKER=kafka:9092`.
- A Kafka UI deve ser protegida por Keycloak/OIDC.
- A Kafka UI deve usar modo somente leitura.
- Scripts de simulacao devem receber `--broker <broker_protegido>` ou `KAFKA_BROKER` explicitamente.
- Ver detalhes em `docs/kafka-security.md`.

## Credenciais conhecidas

Usuario seed padrao:

```text
Email: admin@3dhmanaus.com.br
Senha: admin123
```

Essa senha foi usada no desenvolvimento e deve ser trocada em producao quando o projeto estabilizar.

## Regra importante para continuar

Nao processar imagens de icones com remocao automatica de fundo.

O processo degradou os assets. A regra daqui para frente e:

1. O usuario entrega PNG com transparencia real.
2. Codex apenas copia o PNG para `apps/web/public/assets/`.
3. Codex ajusta tamanho do marcador em `apps/web/src/components/TrackingMap.tsx`.
4. Codex roda typecheck, build/push frontend, commit/push.

Nao usar scripts para remover fundo, alpha, halo ou recortar imagens, a menos que o usuario peca explicitamente.

## Arquivos principais

Backend:

```text
services/backend/src/kafka.ts
services/backend/src/location-store.ts
services/backend/src/delivery-people.ts
services/backend/src/mobile.ts
services/backend/prisma/schema.prisma
```

Frontend:

```text
apps/web/src/components/TrackingMap.tsx
apps/web/src/components/SettingsModal.tsx
apps/web/src/types.ts
apps/web/public/assets/
```

Android:

```text
apps/android/app/src/main/java/br/com/tresdhmanaus/trackflow/MainActivity.kt
apps/android/app/src/main/java/br/com/tresdhmanaus/trackflow/MainViewModel.kt
apps/android/app/src/main/java/br/com/tresdhmanaus/trackflow/network/TrackFlowApi.kt
apps/android/app/src/main/java/br/com/tresdhmanaus/trackflow/tracking/TrackingService.kt
```

Deploy:

```text
docker-compose.producao-vps.yml
docker-compose.homologacao-pc.yml
.env.producao-vps.example
.env.homologacao-pc.example
infra/portainer/kafka-ui-secure.example.yml
```

## Estado dos icones no fim da conversa

Asset da moto esta bom e deve ser mantido:

```text
apps/web/public/assets/courier-top.png
```

Carro:

```text
apps/web/public/assets/vehicle-car.png
```

Foi substituido por PNG transparente real fornecido pelo usuario. Foi publicado e commitado:

```text
1cc02e1 Replace car marker with transparent asset
```

Aviao:

```text
apps/web/public/assets/vehicle-airplane.png
```

Havia tentativa anterior com qualidade ruim. Antes de mexer, verificar `git status`. Se houver alteracao pendente nesse arquivo, revisar com o usuario antes de commitar.

Onibus:

```text
apps/web/public/assets/vehicle-bus.png
```

Foi substituido por PNG fornecido pelo usuario e o tamanho foi aumentado no mapa.

Barco:

```text
apps/web/public/assets/vehicle-boat.png
```

Foi substituido por PNG transparente real fornecido pelo usuario, sem processamento automatico. O mapa usa tamanho proporcional ao asset.

## Comandos de validacao

Frontend:

```bash
npm run typecheck --workspace @3dh-trackflow/web
docker build -f apps/web/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-web:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

Backend:

```bash
npm run typecheck --workspace @3dh-trackflow/backend
docker build -f services/backend/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-backend:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
```

Android:

```bash
cd apps/android
.\gradlew.bat assembleDebug
```

Instalar no aparelho conectado:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r apps\android\app\build\outputs\apk\debug\app-debug.apk
```

Limpar cadastro local do app:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell pm clear br.com.tresdhmanaus.trackflow
```

## Reenviar teste de veiculos

Script:

```bash
python scripts/send_vehicle_icon_test.py --broker <broker_protegido>
```

Observacao: esse script pode ser atualizado com coordenadas finais quando os icones forem aprovados.


