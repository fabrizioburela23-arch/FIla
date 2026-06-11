#!/bin/sh
set -e

echo "▶ Running Prisma migrations..."
npx prisma migrate deploy

echo "▶ Running database seed (idempotent)..."
node dist/seed.js

echo "▶ Starting API server..."
exec node dist/server.js
