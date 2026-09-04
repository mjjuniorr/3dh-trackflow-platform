# Roadmap

## Concluido

- Backend Node/TypeScript com Express, Socket.IO, KafkaJS, Prisma, PostgreSQL e Redis.
- Frontend React/Vite/Tailwind com dashboard, mapa e pagina publica.
- Deploy Docker Swarm/Portainer/Traefik.
- Kafka em producao com broker interno `kafka:9092`.
- Cadastro manual de entregadores no painel.
- Cadastro automatico pelo Android.
- Telemetria Android via backend HTTPS.
- Tipo de veiculo por entregador:
  - Moto;
  - Carro;
  - Barco;
  - Aviao;
  - Onibus.
- Links publicos temporarios.
- Simuladores Kafka.

## Em andamento

### LILYGO Adaptive Tracking v2

- baseline v1 preservada e validada com GNSS, Wi-Fi e 4G;
- v2 implementada em `feature/lilygo-adaptive-tracking-v2`;
- pendente build PlatformIO completo;
- pendente upload para a placa;
- pendente validacao de Wi-Fi/4G, fila offline e estados adaptativos;
- pendente comparacao de autonomia contra o benchmark de aproximadamente 2h48;
- deep sleep, PSM/eDRX e controle agressivo de GNSS ficam para fase posterior.



- Padronizacao visual dos icones de veiculos.
- Substituicao dos icones por PNGs transparentes reais, sem processamento local.
- Ajuste fino de tamanho de cada marcador no mapa.

## Proximas tarefas recomendadas

1. Finalizar assets de veiculos:
   - confirmar carro;
   - confirmar onibus;
   - substituir aviao por PNG aprovado;
   - substituir barco por PNG aprovado;
   - revisar tamanhos em `TrackingMap.tsx`.
2. Melhorar UX Android:
   - tela de status real;
   - exibir ultimo envio;
   - exibir veiculo escolhido;
   - controle de start/stop mais confiavel;
   - build release assinado.
3. Historico de rotas:
   - timeline por entregador;
   - replay de rota;
   - filtros por data.
4. Operacao:
   - tela de sessoes publicas ativas;
   - revogacao de link pela UI;
   - auditoria de usuario.
5. Seguranca:
   - trocar senha admin padrao;
   - configurar secrets via Portainer;
   - rate limit por rota;
   - politica de retencao de eventos.

## Backlog de relatorios e auditoria

- Relatorio operacional de entregas:
  - criar permissao `trackflow:view-reports`;
  - consultar entregas por API;
  - filtrar por periodo, entregador, status e numero da NF;
  - exibir total por periodo e por entregador;
  - exportar dados operacionais quando a primeira tela estiver validada.
- Cruzamento com localizacao:
  - registrar como evolucao futura do relatorio;
  - cruzar NF registrada com eventos de localizacao do entregador;
  - permitir auditoria por data/hora de entrega e posicao aproximada;
  - definir antes da implementacao qual regra confirma uma entrega por localizacao.
- Integracao Bling para auditoria de NF:
  - consultar a NF no Bling pelo numero informado via webhook n8n;
  - preservar zeros a esquerda no numero da NF;
  - usar data inicial do lancamento e data final no dia seguinte;
  - armazenar apenas o resultado necessario para auditoria, sem transformar o Bling em fonte principal do rastreio;
  - tratar falhas do Bling sem bloquear o registro operacional da entrega, salvo decisao futura em contrario.
