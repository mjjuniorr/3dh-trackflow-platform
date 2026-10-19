#!/bin/sh
set -eu

echo '[startup] Aplicando migrations do PostgreSQL...'
if node ../../node_modules/prisma/build/index.js migrate deploy; then
  echo '[startup] Migrations concluidas. Iniciando API.'
else
  status=$?
  echo "[startup] Migration falhou (exit=$status). API nao iniciada." >&2
  exit "$status"
fi

exec node dist/src/server.js
