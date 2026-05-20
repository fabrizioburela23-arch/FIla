#!/bin/sh
set -e

echo "▶ Running Prisma migrations..."
npx prisma migrate deploy

echo "▶ Checking if seed is needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.plan.count().then(count => {
  console.log('Plans in DB:', count);
  prisma.\$disconnect();
  process.exit(count === 0 ? 1 : 0);
}).catch(() => { prisma.\$disconnect(); process.exit(1); });
" && echo "✓ DB already seeded, skipping." || (echo "▶ Seeding database..." && node dist/seed.js)

echo "▶ Starting API server..."
exec node dist/server.js
