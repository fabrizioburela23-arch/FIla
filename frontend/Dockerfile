FROM node:20-alpine AS builder
WORKDIR /app

# Copy shared-types package (required by frontend)
COPY packages/shared-types ./packages/shared-types

# Copy frontend package.json and install deps
COPY frontend/package.json ./frontend/
WORKDIR /app/frontend
RUN npm install

# Copy all frontend source
COPY frontend/ .

ARG VITE_API_URL=https://fila-production-3062.up.railway.app
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Runtime: serve with nginx
FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY --from=builder /app/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
