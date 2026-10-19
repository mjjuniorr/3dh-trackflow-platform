#!/bin/sh
set -eu

image=${1:?Informe a imagem local do backend}
prefix=trackflow-health-$$
network=$prefix-network
api=$prefix-api
broken=$prefix-broken
db=$prefix-db
redis=$prefix-redis

cleanup() {
  docker rm -f -v "$api" "$broken" "$db" "$redis" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run -d --name "$db" --network "$network" --network-alias postgres \
  -e POSTGRES_PASSWORD=health-test-only -e POSTGRES_DB=tracking postgres:16-alpine >/dev/null
docker run -d --name "$redis" --network "$network" --network-alias redis redis:7-alpine >/dev/null

attempt=0
until docker exec "$db" pg_isready -h 127.0.0.1 -U postgres -d tracking >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then echo 'PostgreSQL de teste nao iniciou'; exit 1; fi
  sleep 1
done

# A real Prisma failure must terminate, not keep a running but unusable container.
docker run -d --name "$broken" --network "$network" \
  -e DATABASE_URL='postgresql://postgres:wrong-password@postgres:5432/tracking?schema=public' \
  -e REDIS_URL=redis://redis:6379 -e KAFKA_ENABLED=false \
  -e JWT_SECRET=health-test-only-not-for-production -e AUTH_MODE=hybrid \
  -e OIDC_ISSUER=https://auth.example.invalid/realms/test \
  "$image" >/dev/null
attempt=0
while [ "$(docker inspect -f '{{.State.Running}}' "$broken")" = true ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then echo 'Migration com erro nao encerrou'; exit 1; fi
  sleep 1
done
test "$(docker inspect -f '{{.State.ExitCode}}' "$broken")" -ne 0
test "$(docker logs "$broken" 2>&1 | grep -c '\[startup\] Aplicando migrations')" -eq 1
docker logs "$broken" 2>&1 | grep -q '\[startup\] Migration falhou'
if docker logs "$broken" 2>&1 | grep -q 'Tracking API ouvindo'; then
  echo 'API iniciou apesar da migration com erro'; exit 1
fi

docker run -d --name "$api" --network "$network" \
  --health-interval=2s --health-timeout=3s --health-start-period=10s --health-retries=3 \
  -e DATABASE_URL='postgresql://postgres:health-test-only@postgres:5432/tracking?schema=public' \
  -e REDIS_URL=redis://redis:6379 -e KAFKA_ENABLED=false \
  -e JWT_SECRET=health-test-only-not-for-production -e AUTH_MODE=hybrid \
  -e OIDC_ISSUER=https://auth.example.invalid/realms/test \
  "$image" >/dev/null
attempt=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$api")" = healthy ]; do
  if [ "$(docker inspect -f '{{.State.Running}}' "$api")" != true ]; then
    docker logs "$api"; echo 'API encerrou antes de ficar healthy'; exit 1
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 90 ]; then docker logs "$api"; echo 'API nao ficou healthy'; exit 1; fi
  sleep 1
done

# Exercise the actual application, including its middleware order and auth config route.
docker exec "$api" node --input-type=module -e '
  import assert from "node:assert/strict";
  for (const route of ["/health", "/api/health"]) {
    const response = await fetch(`http://127.0.0.1:4000${route}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  }
  const config = await fetch("http://127.0.0.1:4000/api/auth/config");
  assert.equal(config.status, 200);
  for (let i = 0; i < 125; i++) await fetch("http://127.0.0.1:4000/api/missing");
  assert.equal((await fetch("http://127.0.0.1:4000/api/health")).status, 200);
'

# Stop only the test API process; the probe must detect that HTTP no longer responds.
docker kill --signal=STOP "$api" >/dev/null
attempt=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$api")" = unhealthy ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then echo 'Healthcheck nao detectou API travada'; exit 1; fi
  sleep 1
done
docker kill --signal=CONT "$api" >/dev/null
echo 'Smoke test Docker: migration com erro, startup, rotas publicas e API travada validados.'
