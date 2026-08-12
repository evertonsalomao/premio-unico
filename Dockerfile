# Multi-stage Dockerfile para EasyPanel / Docker
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifesto de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm install --legacy-peer-deps

# Copiar todo o código-fonte
COPY . .

# Executar o build do frontend e do backend (gerando a pasta dist)
RUN npm run build

# Estágio final de execução (Production Runner)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar arquivos necessários para produção
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000

# Executa as migrações do banco Drizzle e inicia o servidor Node.js em produção
CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
