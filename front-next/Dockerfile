# Frontend Next.js para probar Softflyer en cualquier equipo (docker-compose.yml en la raíz).
# Node 24 LTS. Build de producción: es lo que más se parece a lo que verá el cliente.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
# Las NEXT_PUBLIC_* se incrustan en el JavaScript del navegador al compilar.
ARG NEXT_PUBLIC_REVERB_KEY=""
ARG NEXT_PUBLIC_REVERB_HOST=""
ARG NEXT_PUBLIC_REVERB_PORT="8080"
ARG NEXT_PUBLIC_REVERB_SCHEME="http"
ENV NEXT_PUBLIC_REVERB_KEY=$NEXT_PUBLIC_REVERB_KEY \
    NEXT_PUBLIC_REVERB_HOST=$NEXT_PUBLIC_REVERB_HOST \
    NEXT_PUBLIC_REVERB_PORT=$NEXT_PUBLIC_REVERB_PORT \
    NEXT_PUBLIC_REVERB_SCHEME=$NEXT_PUBLIC_REVERB_SCHEME \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
