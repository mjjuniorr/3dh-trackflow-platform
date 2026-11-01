# Roadmap

## Concluido

- Backend Node/TypeScript com Express, Socket.IO, KafkaJS, Prisma, PostgreSQL e Redis.
- Frontend React/Vite/Tailwind com dashboard, mapa e pagina publica.
- Deploy Docker Swarm/Portainer/Traefik.
- Kafka em producao com broker interno `kafka:9092`.
- Cadastro manual de entregadores no painel.
- Cadastro automatico pelo Android.
- Telemetria Android via backend HTTPS.
- Relatorio operacional por periodo, entregador, NF e status.
- Permissao `trackflow:view-reports` no backend.
- Validacao individual de NF-e/NFC-e no Bling por webhook n8n.
- Firmware A7670SA com GNSS e transporte 4G validado em campo.
- Tipo de veiculo por entregador:
  - Moto;
  - Carro;
  - Barco;
  - Aviao;
  - Onibus.
- Links publicos temporarios.
- Simuladores Kafka.

## Em andamento

### Android Monitor / Central de Notificacoes

- backend de notificacoes implementado;
- deteccao de offline e recuperacao implementada;
- leitura por usuario implementada;
- segundo APK Android `:monitor` implementado;
- mapa full-screen, filtro local, sininho e badge implementados;
- pendente build, migration e validacao em aparelho real;
- push notification Android/FCM fica fora do primeiro MVP.



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

- Corrigir a regra da janela fiscal quando emissao e entrega ocorrerem em dias diferentes.
- Definir a identidade fiscal, avaliando emitente, serie, tipo e chave de acesso.
- Diferenciar data de lancamento, data de emissao e data/hora de entrega comprovada.
- Exportar dados operacionais quando formato e permissao forem aprovados.
- Cruzamento com localizacao:
  - registrar como evolucao futura do relatorio;
  - cruzar NF registrada com eventos de localizacao do entregador;
  - permitir auditoria por data/hora de entrega e posicao aproximada;
  - definir antes da implementacao qual regra confirma uma entrega por localizacao.
- Auditoria deve apresentar evidencias e anomalias, sem acusar fraude automaticamente.

## Backlog de confiabilidade e seguranca

- Falhar fechado quando o segredo tecnico movel estiver ausente.
- Fixar e validar CA raiz no firmware.
- Integrar testes funcionais relevantes ao pipeline de `main`.
- Aprovar retencao, backup/restore, RPO e RTO.
- Avaliar e integrar separadamente branches de firmware adaptativo, multiboard e bateria.
