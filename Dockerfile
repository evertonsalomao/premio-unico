# Dockerfile otimizado para EasyPanel / VPS
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Ativar pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copiar arquivos de dependências e patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar arquivos pré-compilados (dist) e banco de dados (drizzle)
COPY dist ./dist
COPY drizzle ./drizzle
COPY drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000

# Executa migrações Drizzle e inicia o servidor Node.js
CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
