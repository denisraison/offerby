#!/bin/sh
set -e

cd /app/api

PORT=8080 node dist/index.js &
API_PID=$!

caddy run --config /app/Caddyfile &
CADDY_PID=$!

trap "kill $API_PID $CADDY_PID 2>/dev/null" EXIT TERM INT

wait -n
exit $?
