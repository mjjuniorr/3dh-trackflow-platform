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
