# Guia de icones de veiculos

Este documento registra como os icones de veiculos funcionam e como devem ser substituidos.

## Arquivos atuais

```text
apps/web/public/assets/courier-top.png          # Moto
apps/web/public/assets/vehicle-car.png          # Carro
apps/web/public/assets/vehicle-boat.png         # Barco
apps/web/public/assets/vehicle-airplane.png     # Aviao
apps/web/public/assets/vehicle-bus.png          # Onibus
```

Tambem existem SVGs antigos:

```text
apps/web/public/assets/vehicle-car.svg
apps/web/public/assets/vehicle-boat.svg
apps/web/public/assets/vehicle-airplane.svg
apps/web/public/assets/vehicle-bus.svg
```

Eles sao legado. O objetivo e migrar tudo para PNG transparente real, se os assets PNG ficarem bons.

## Onde o mapa escolhe o icone

Arquivo:

```text
apps/web/src/components/TrackingMap.tsx
```

Trecho importante:

```ts
const VEHICLE_ICON: Record<VehicleType, string> = {
  motorcycle: "/assets/courier-top.png",
  car: "/assets/vehicle-car.png",
  boat: "/assets/vehicle-boat.png",
  airplane: "/assets/vehicle-airplane.png",
  bus: "/assets/vehicle-bus.png"
};
```

Tamanhos atuais:

```ts
const sizeByType: Record<VehicleType, [number, number]> = {
  motorcycle: [42, 58],
  car: [92, 62],
  boat: [82, 46],
  airplane: [92, 62],
  bus: [110, 32]
};
```

Ao trocar um asset, pode ser necessario ajustar esses tamanhos.

## Regra de ouro

Nao remover fundo automaticamente dentro do Codex quando o asset tiver fundo cinza, glow ou sombra.

Isso degradou os icones.

Fluxo correto:

1. Usuario gera PNG com transparencia real.
2. Codex verifica se existe alpha real.
3. Codex copia o arquivo para `apps/web/public/assets/`.
4. Codex ajusta tamanho em `TrackingMap.tsx`, se necessario.
5. Codex roda typecheck/build/push.

## Como verificar alpha real

Exemplo para verificar se o PNG tem transparencia:

```bash
python -c "from PIL import Image; p=r'C:\caminho\arquivo.png'; im=Image.open(p).convert('RGBA'); a=im.getchannel('A'); print(im.size, a.getextrema())"
```

Resultado esperado:

```text
(largura, altura) (0, 255)
```

Se o minimo do alpha for `255`, a imagem nao tem transparencia real.

## Prompt recomendado para gerar assets

```text
Crie um icone PNG transparente de um [VEICULO] visto exatamente de cima, estilo ilustracao 3D limpa para marcador de mapa/logistica.

Requisitos:
- Fundo 100% transparente com canal alpha real.
- Sem fundo cinza, branco, preto, xadrez ou degradê.
- Sem rua, sem cenario, sem texto e sem moldura.
- Sem halo, glow, brilho externo ou sombra grande.
- Contorno forte e boa leitura sobre mapa claro e escuro.
- Cores vivas, mas profissionais.
- Legivel em tamanho pequeno no mapa.
- Centralizado, recorte justo e pequena margem transparente.
```

## Aplicar novo asset

Exemplo para substituir o carro por um PNG pronto:

```powershell
Copy-Item -LiteralPath "C:\Users\mjjun\Downloads\carro.png" -Destination "apps\web\public\assets\vehicle-car.png" -Force
```

Depois:

```bash
npm run typecheck --workspace @3dh-trackflow/web
docker build -f apps/web/Dockerfile -t ghcr.io/mjjuniorr/3dh-trackflow-web:producao .
docker push ghcr.io/mjjuniorr/3dh-trackflow-web:producao
git add apps/web/public/assets/vehicle-car.png apps/web/src/components/TrackingMap.tsx
git commit -m "Replace car marker asset"
git push origin main
```

Na VPS:

```bash
docker service update --force 3dh-trackflow-platform_frontend
```

No navegador:

```text
Ctrl + F5 ou aba anonima
```

## Estado dos assets por veiculo

### Moto

Status: aprovado.

Arquivo:

```text
apps/web/public/assets/courier-top.png
```

Nao mexer sem motivo.

### Carro

Status: substituido por PNG transparente real fornecido pelo usuario.

Arquivo:

```text
apps/web/public/assets/vehicle-car.png
```

Commit:

```text
1cc02e1 Replace car marker with transparent asset
```

Tamanho atual no mapa:

```ts
car: [92, 62]
```

### Aviao

Status: substituido por PNG transparente real fornecido pelo usuario.

Arquivo esperado:

```text
apps/web/public/assets/vehicle-airplane.png
```

Importante: antes de commitar novo aviao, garantir que e PNG transparente real e que nao foi processado/degradado.

Tamanho atual no mapa:

```ts
airplane: [92, 62]
```

### Barco

Status: substituido por PNG transparente real fornecido pelo usuario.

Arquivo atual:

```text
apps/web/public/assets/vehicle-boat.png
```

Tamanho atual no mapa:

```ts
boat: [82, 46]
```

### Onibus

Status: substituido por PNG fornecido pelo usuario e com tamanho aumentado no mapa.

Arquivo:

```text
apps/web/public/assets/vehicle-bus.png
```

Tamanho atual no mapa:

```ts
bus: [110, 32]
```
