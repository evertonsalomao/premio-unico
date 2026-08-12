# Multi-stage Dockerfile para EasyPanel / Docker
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Ativar pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copiar manifesto de dependências, lockfile e patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instalar dependências de forma ultra-rápida e eficiente em memória
RUN pnpm install --frozen-lockfile

# Copiar todo o código-fonte
COPY . .

# Executar o build do frontend e do backend
RUN pnpm run build

# Estágio final de execução (Production Runner)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar arquivos necessários para produção
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000

# Executa as migrações do banco Drizzle e inicia o servidor Node.js em produção
CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
