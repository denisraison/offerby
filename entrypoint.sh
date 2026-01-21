#!/bin/sh
set -e

cd /app/api

# Start Node.js API in background
PORT=8080 node --import tsx src/index.ts &
API_PID=$!

# Start Caddy
caddy run --config /app/Caddyfile &
CADDY_PID=$!

# Handle shutdown
trap "kill $API_PID $CADDY_PID 2>/dev/null" EXIT TERM INT

# Wait for either process to exit
wait -n
exit $?
