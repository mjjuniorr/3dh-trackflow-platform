# Operacao e deploy

Para login central, roles e ordem de deploy do Portal/TrackFlow, veja:

```text
docs/authentication-oidc.md
```

Para um passo a passo completo de build web, backend, Android, containers locais, instalacao no aparelho e commits, veja:

```text
docs/build-run-commit.md
```

Para gravar e testar a placa LILYGO TTGO T-SIM A7670SA, veja:

```text
firmware/gps-board/README.md
docs/requirements-gps-board.md
```

## Fonte permanente do deploy

A definicao versionada da stack e `docker-compose.producao-vps.yml` na `main`. O Git define servicos e imagens; valores de ambiente e secrets reais permanecem fora do repositorio na configuracao da stack.

Uma alteracao feita apenas no servico em execucao nao atualiza essa fonte e pode ser perdida no proximo redeploy GitOps. Por isso, diagnostico, alteracao do Git e deploy devem ser tratados como etapas distintas.

## Publicar imagens de producao

O workflow `.github/workflows/publish-images.yml` publica automaticamente, depois da validacao da `main`:

```text
ghcr.io/mjjuniorr/3dh-trackflow-backend:<commit_sha>
ghcr.io/mjjuniorr/3dh-trackflow-web:<commit_sha>
```

Nao publique nem fixe `latest` ou `producao`. Para um build local de verificacao, use uma tag local que nao sera enviada ao GHCR:

```bash
docker build -f services/backend/Dockerfile -t trackflow-backend:local .
docker build -f apps/web/Dockerfile -t trackflow-web:local .
```

## Atualizar na VPS

Deploy nao e automatico apenas porque houve push. Depois que o commit e as imagens forem aprovados:

1. confirmar o SHA exato publicado pelo workflow;
2. preparar um commit de release alterando diretamente os campos `image:` de `docker-compose.producao-vps.yml`;
3. revisar e integrar o diff do YAML; o compose atual ignora `FRONTEND_IMAGE` e `BACKEND_IMAGE` do ambiente;
4. obter autorizacao explicita para acessar o Portainer e fazer o redeploy;
5. preservar volumes de PostgreSQL, Redis e Kafka;
6. aguardar replicas e executar o checklist.

Nao use `docker service update --force` como configuracao permanente: a mudanca pode se perder no proximo deploy GitOps.

## Migracoes Prisma em producao

O Dockerfile do backend ja executa:

```bash
npx prisma migrate deploy
```

no start do container.

Se precisar rodar manualmente dentro do container backend:

```bash
npm run prisma:deploy
```

O nome correto do script e `prisma:deploy`, nao `prisma:migrate:deploy`.

## Seed em producao

Dentro do container backend:

```bash
npm run seed
```

Recuperacao de credencial deve usar valor fornecido de forma segura e procedimento auditavel. Nao coloque senha em comando, documentacao, historico do shell ou Git.

## Kafka

Producao dentro da VPS:

```env
KAFKA_BROKER=kafka:9092
KAFKA_TOPIC=rastreamento
```

Teste externo no PC somente com rede protegida, VPN ou tunel SSH:

```env
KAFKA_BROKER=<broker_protegido>
KAFKA_TOPIC=rastreamento
```

Nunca usar `kafka.3dhmanaus.com.br` como broker da aplicacao. Esse dominio e apenas Kafka UI.

## Enviar teste rapido por Kafka

```bash
python scripts/send_vehicle_icon_test.py
```

Esse script envia um marcador de cada tipo de veiculo.

## Coordenadas de teste usadas

```text
Moto - 3DH Manaus:
lat=-3.0448937
lng=-60.0154582

Carro - Amazonas Shopping:
lat=-3.0898
lng=-60.0269

Barco - Roadway Porto Publico de Manaus:
lat=-3.13724
lng=-60.02948

Aviao - Aeroporto Eduardo Gomes:
lat=-3.0386
lng=-60.0497

Onibus - Terminal Rodoviario de Manaus:
lat=-3.07465
lng=-60.02548
```

## Android

Build debug:

```powershell
cd apps\android
.\gradlew.bat assembleDebug
```

Listar dispositivos:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices -l
```

Instalar APK:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r apps\android\app\build\outputs\apk\debug\app-debug.apk
```

Limpar cadastro local:

```powershell
& 'C:\Users\mjjun\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell pm clear br.com.tresdhmanaus.trackflow
```

## Firmware GPS Board

Compilar:

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi
```

Gravar na placa conectada em `COM8`:

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi -t upload
```

Abrir monitor serial:

```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe device monitor -p COM8 -b 115200
```

O arquivo `firmware/gps-board/include/secrets.h` e local, contem Wi-Fi e `MOBILE_REGISTRATION_SECRET`, e nunca deve ser commitado.

## Checklist apos deploy

1. Abrir `https://rastreio.3dhmanaus.com.br` em aba anonima.
2. Login com admin.
3. Abrir engrenagem.
4. Confirmar tipos de veiculo:
   - Moto;
   - Carro;
   - Barco;
   - Aviao;
   - Onibus.
5. Rodar `python scripts/send_vehicle_icon_test.py`.
6. Confirmar um marcador de cada tipo no mapa.
7. Gerar link publico para um veiculo.
8. Confirmar que o link publico mostra apenas aquele veiculo.
