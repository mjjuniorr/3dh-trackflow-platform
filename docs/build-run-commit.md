# Guia rapido: build, Android, containers e commits

Este guia existe para executar o projeto sozinho, inclusive quando a conversa com o Codex nao estiver disponivel.

> Observacao importante: sem internet, os comandos so funcionam se as dependencias ja estiverem baixadas no PC. Isso inclui `node_modules`, cache do Gradle, imagens Docker base e login no GHCR ja feito.

## Pasta do projeto

Abra o PowerShell e entre no repositorio:

```powershell
cd C:\Users\mjjun\Documents\Codex\2026-05-17\refine-a-aplica-o-fullstack-de
```

Confirme que esta na pasta certa:

```powershell
git status
```

## Web/frontend

### Validar TypeScript

```powershell
npm run typecheck --workspace @3dh-trackflow/web
```

### Buildar a imagem Docker do frontend

```powershell
docker build -f apps/web/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-web:producao .
```

### Enviar imagem para o GHCR

Precisa de internet e login Docker/GHCR ja configurado:

```powershell
docker push ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

### Atualizar frontend na VPS

No terminal da VPS:

```bash
docker service update --with-registry-auth --force 3dh-trackflow-platform_frontend
```

Pelo Portainer:

1. Abra a stack `3dh-trackflow-platform`.
2. Entre no servico `frontend`.
3. Use `Force update`, ou use `Pull and redeploy` na stack.
4. Aguarde a replica ficar `1 / 1`.
5. Abra `https://track.3dhmanaus.com.br` em aba anonima ou use `Ctrl + F5`.

## Backend

### Validar TypeScript

```powershell
npm run typecheck --workspace @3dh-trackflow/backend
```

### Buildar a imagem Docker do backend

```powershell
docker build -f services/backend/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-backend:producao .
```

### Enviar imagem para o GHCR

```powershell
docker push ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
```

### Atualizar backend na VPS

No terminal da VPS:

```bash
docker service update --with-registry-auth --force 3dh-trackflow-platform_backend
```

## Buildar e rodar no container local

Use isso para homologacao no PC.

### Subir tudo localmente com build

```powershell
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml up -d --build
```

Depois abra:

```text
http://localhost:8080
```

Backend local:

```text
http://localhost:4000
```

### Ver containers locais

```powershell
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml ps
```

### Ver logs do backend

```powershell
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml logs -f backend
```

### Ver logs do frontend

```powershell
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml logs -f frontend
```

### Parar ambiente local

```powershell
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml down
```

## Android

O app Android usa:

```text
applicationId = br.com.tresdhmanaus.trackflow
TRACKFLOW_API_BASE_URL = https://track.3dhmanaus.com.br
```

### Conferir aparelho conectado

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices -l
```

Se nao aparecer um device, confira no celular:

- cabo USB conectado;
- modo desenvolvedor ativo;
- depuracao USB ativa;
- permissao de depuracao aceita na tela do aparelho.

### Limpar dados do app no aparelho

Use quando quiser resetar cadastro/local storage do app:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell pm clear br.com.tresdhmanaus.trackflow
```

### Compilar APK debug

```powershell
cd apps\android
.\gradlew.bat assembleDebug
cd ..\..
```

APK gerado:

```text
apps\android\app\build\outputs\apk\debug\app-debug.apk
```

### Instalar APK debug no aparelho

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r apps\android\app\build\outputs\apk\debug\app-debug.apk
```

### Fluxo completo Android: limpar, compilar e instalar

Rode a partir da raiz do repositorio:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices -l
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell pm clear br.com.tresdhmanaus.trackflow
cd apps\android
.\gradlew.bat assembleDebug
cd ..\..
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r apps\android\app\build\outputs\apk\debug\app-debug.apk
```

## Testar Kafka depois de publicar

Este script envia um marcador de cada tipo:

```powershell
python scripts\send_vehicle_icon_test.py
```

Broker usado por padrao:

```text
72.60.245.62:19092
```

Topico:

```text
rastreamento
```

## Conferir producao depois do deploy

Abra:

```text
https://track.3dhmanaus.com.br
```

Checklist:

1. Use aba anonima ou `Ctrl + F5`.
2. Login: `admin@3dhmanaus.com.br`.
3. Abra a engrenagem.
4. Confira tipos: Moto, Carro, Barco, Aviao, Onibus.
5. Rode `python scripts\send_vehicle_icon_test.py`.
6. Confirme um marcador de cada tipo no mapa.
7. Gere um link publico de rastreio.
8. Confirme que o link publico mostra apenas aquele veiculo.

## Commits

### Ver o que mudou

```powershell
git status
git diff
```

Para ver um resumo:

```powershell
git diff --stat
```

### Adicionar arquivos alterados

Adicione apenas arquivos relacionados ao que foi feito.

Exemplo para alteracao de icones:

```powershell
git add apps\web\public\assets\vehicle-airplane.png apps\web\src\components\TrackingMap.tsx docs\vehicle-icons.md
```

Exemplo para alteracao de documentacao:

```powershell
git add docs\build-run-commit.md docs\operations.md docs\HANDOFF.md
```

### Criar commit

Use uma mensagem curta e objetiva:

```powershell
git commit -m "Update build and deploy documentation"
```

Outros exemplos:

```powershell
git commit -m "Replace airplane marker asset"
git commit -m "Increase car and airplane marker size"
git commit -m "Fix Android telemetry registration"
```

### Enviar para GitHub

```powershell
git push origin main
```

### Conferir historico recente

```powershell
git log --oneline -5
```

## Ordem recomendada para uma alteracao simples no frontend

1. Fazer a alteracao.
2. Rodar:

```powershell
npm run typecheck --workspace @3dh-trackflow/web
```

3. Buildar e publicar imagem:

```powershell
docker build -f apps/web/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-web:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

4. Commitar e enviar:

```powershell
git status
git diff --stat
git add <arquivos>
git commit -m "Mensagem curta"
git push origin main
```

5. Atualizar VPS:

```bash
docker service update --with-registry-auth --force 3dh-trackflow-platform_frontend
```

6. Testar:

```powershell
python scripts\send_vehicle_icon_test.py
```

## Ordem recomendada para uma alteracao no Android

1. Fazer a alteracao no codigo Android.
2. Compilar:

```powershell
cd apps\android
.\gradlew.bat assembleDebug
cd ..\..
```

3. Instalar no aparelho:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r apps\android\app\build\outputs\apk\debug\app-debug.apk
```

4. Se precisar resetar cadastro:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell pm clear br.com.tresdhmanaus.trackflow
```

5. Testar no aparelho.
6. Commitar:

```powershell
git status
git diff --stat
git add apps\android
git commit -m "Update Android app"
git push origin main
```

## Problemas comuns

### Docker nao esta rodando

Abra o Docker Desktop.

Depois confira:

```powershell
docker info
```

### Build Android falha sem internet

O Gradle pode tentar baixar dependencias. Sem internet, isso so funciona se o cache do Gradle ja tiver tudo.

Para aumentar a chance de funcionar offline, rode pelo menos uma vez com internet:

```powershell
cd apps\android
.\gradlew.bat assembleDebug
cd ..\..
```

### Build Docker falha sem internet

O Docker pode tentar baixar imagens base como `node:22-alpine` ou `nginx:1.27-alpine`.

Para preparar antes de ficar sem internet, rode com internet:

```powershell
docker pull node:22-alpine
docker pull nginx:1.27-alpine
docker pull postgres:16-alpine
docker pull redis:7-alpine
```

### NPM falha sem internet

Se `node_modules` nao existir, `npm install` precisa de internet. Deixe `node_modules` pronto antes.

Com internet:

```powershell
npm install
```

