# Operacao e deploy

Para login central, roles e ordem de deploy do Portal/TrackFlow, veja:

```text
docs/authentication-oidc.md
```

Para um passo a passo completo de build web, backend, Android, containers locais, instalacao no aparelho e commits, veja:

```text
docs/build-run-commit.md
```

## Publicar imagens de producao

Backend:

```bash
docker build -f services/backend/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-backend:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-backend:producao
```

Frontend:

```bash
docker build -f apps/web/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-web:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-web:producao
```

## Atualizar na VPS

Pelo terminal da VPS:

```bash
docker service update --with-registry-auth --force 3dh-trackflow-platform_backend
docker service update --with-registry-auth --force 3dh-trackflow-platform_frontend
```

Se a alteracao for apenas frontend/assets:

```bash
docker service update --with-registry-auth --force 3dh-trackflow-platform_frontend
```

Pelo Portainer:

1. Abrir stack `3dh-trackflow-platform`.
2. Usar `Pull and redeploy`, ou entrar no servico e fazer `Force update`.
3. Aguardar replicas `1 / 1`.
4. Testar em aba anonima.

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

Se precisar resetar senha admin rapidamente dentro do container:

```bash
node -e "const bcrypt=require('bcryptjs'); const { PrismaClient }=require('@prisma/client'); const prisma=new PrismaClient(); bcrypt.hash('admin123',12).then(hash=>prisma.user.update({where:{email:'admin@3dhmanaus.com.br'},data:{password_hash:hash,role:'admin'}})).then(()=>console.log('Senha atualizada: admin123')).finally(()=>prisma.$disconnect())"
```

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
