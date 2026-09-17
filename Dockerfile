# ============================================================
# Estagio 1: BUILDER — instala tudo e compila o TypeScript
# ============================================================
FROM node:20-alpine AS builder

# Diretorio de trabalho dentro do contêiner
WORKDIR /app

# Copia primeiro só os manifests de dependencia.
# Assim o Docker reaproveita o cache: se package.json nao mudou,
# ele nao reinstala tudo de novo a cada build.
COPY package*.json ./

# Instala TODAS as dependencias (incluindo devDependencies,
# necessarias para compilar: typescript, @types, etc.)
RUN npm ci

# Agora copia o codigo-fonte e o tsconfig
COPY tsconfig.json ./
COPY src ./src

# Compila TypeScript -> JavaScript (gera a pasta dist/)
RUN npm run build

# ============================================================
# Estagio 2: RUNNER — imagem final, enxuta, so para rodar
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Define ambiente de producao
ENV NODE_ENV=production

COPY package*.json ./

# Instala SOMENTE dependencias de producao (sem as de dev)
RUN npm ci --omit=dev

# Copia apenas o resultado compilado do estagio anterior
COPY --from=builder /app/dist ./dist

# Documenta a porta que a aplicacao usa (informativo)
EXPOSE 3000

# ------------------------------------------------------------
# Healthcheck
#
# O /health so responde depois que o servidor sobe, e o servidor so sobe
# depois que a conexao com o banco e estabelecida (ver src/server.ts). Ou seja:
# este teste passar significa que a API esta de fato PRONTA para atender, nao
# apenas que o processo iniciou.
#
# Isso e o que permite outros servicos declararem
# "depends_on: condition: service_healthy" e so comecarem quando ha o que
# consumir.
#
# start-period de 20s da folga para a primeira conexao com o banco sem que as
# falhas iniciais contem contra o container.
#
# 127.0.0.1 em vez de localhost: nao depende de resolucao de nome.
# ------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/health || exit 1

# Comando que sobe a aplicacao quando o contêiner inicia
CMD ["node", "dist/server.js"]
