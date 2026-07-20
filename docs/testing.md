# Testes e simulacoes

## Credenciais locais padrao

```text
Email: admin@3dhmanaus.com.br
Senha: admin123
```

## Subir ambiente PC

```bash
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml up -d --build
```

URLs:

- Web: `http://localhost:8080`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/health`

## Seed

```bash
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml exec backend npm run seed
```

## Simular uma localizacao

No PC, Kafka fica desativado por padrao. Para testar Kafka, informe um broker protegido por VPN, tunel SSH ou rede interna:

```bash
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml exec backend npm run kafka:test:produce
```

## Simular rotacao por heading

```bash
docker compose --env-file .env.homologacao-pc.example -f docker-compose.homologacao-pc.yml exec backend npm run kafka:test:heading
```

## Simular rota de entrega por 30 minutos

```bash
python scripts/simulate_delivery_route.py --broker <broker_protegido> --duration-minutes 30 --interval-seconds 5 --device-id entregador_001
```

Padroes:

- broker: informe `--broker` ou `KAFKA_BROKER` apontando para um broker protegido;
- topico: `rastreamento`;
- intervalo: 5 segundos;
- payload inclui `lat`, `lng`, `speed`, `heading`, `battery`, `accuracy` e `timestamp`.

## Simular todos os entregadores ao mesmo tempo

```bash
python scripts/simulate_multi_delivery_routes.py --broker <broker_protegido> --duration-minutes 30 --interval-seconds 5
```

Esse teste publica rotas simultaneas para:

- `entregador_001`
- `entregador_002`
- `entregador_003`
- `entregador_004`
- `entregador_005`

Use para validar dashboard, memoria, WebSocket, Kafka e renderizacao de multiplos marcadores.

## Testar todos os tipos de veiculo

```bash
python scripts/send_vehicle_icon_test.py --broker <broker_protegido>
```

Esse teste envia:

- moto na 3DH Manaus;
- carro no Amazonas Shopping;
- barco no Roadway Porto Publico de Manaus;
- aviao no Aeroporto Eduardo Gomes;
- onibus no Terminal Rodoviario de Manaus.

Se algum veiculo nao aparecer:

1. Confirmar se o backend de producao foi atualizado.
2. Confirmar se o entregador nao esta desativado.
3. Usar um `device_id` novo para evitar conflito com registro desativado.
4. Conferir se `vehicle_type` e aceito pelo backend.
5. Conferir se o frontend foi atualizado e se o navegador nao esta com cache.

## Roteiro manual

1. Abrir `http://localhost:8080/login`.
2. Entrar com as credenciais locais.
3. Confirmar que a lista mostra 5 entregadores.
4. Rodar uma simulacao Kafka usando broker protegido ou executar o script dentro do backend na VPS.
5. Confirmar que o entregador fica online e colorido.
6. Confirmar que a moto aparece no mapa com PNG transparente.
7. Gerar link de rastreio para o entregador.
8. Abrir o link publico.
9. Confirmar que a pagina publica mostra somente aquele entregador.
10. Deixar a simulacao de rota rodando e acompanhar movimento/heading.