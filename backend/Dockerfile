FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /monorepo

# Copy shared packages so @fila/shared-types path alias resolves
COPY packages/ ./packages/

# Install backend dependencies
WORKDIR /monorepo/backend
COPY backend/package.json ./
RUN npm install

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/ .

# Build
RUN npm run build && \
    npx tsup prisma/seed.ts --out-dir dist --format cjs --no-splitting

# Runtime
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY backend/package.json ./
RUN npm install --omit=dev

COPY --from=builder /monorepo/backend/dist ./dist
COPY --from=builder /monorepo/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /monorepo/backend/node_modules/@prisma ./node_modules/@prisma
COPY backend/prisma ./prisma
COPY backend/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production
EXPOSE 3001

CMD ["./start.sh"]
