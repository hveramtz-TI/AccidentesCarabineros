# Production-shaped image for the Fastify API + Excel importer (Cloud Run
# container contract: bind 0.0.0.0 + injected $PORT, default 8080).
# Base is node:22.23.4-slim, NOT alpine: Prisma query engines need glibc.
#
# The build context MUST be the repo root, because the canonical territory
# catalog lives under frontend/src/data/:
#   docker build -f backend/Dockerfile .
# The root .dockerignore governs that context.

FROM node:22.23.4-slim AS build
WORKDIR /app
# The OpenSSL CLI lets Prisma detect/download the matching engine on slim images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npm run db:generate
# Rest of the sources; the root .dockerignore keeps node_modules/dist/.env/xlsx out.
COPY backend/ ./
RUN npm run build

FROM node:22.23.4-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
# Runtime also needs OpenSSL for the Prisma engines (migrate deploy + client).
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
# Full node_modules from the build stage: it must include the `prisma` CLI
# (startup CMD below runs `migrate deploy`) and the generated @prisma/client
# engines. Trade-off: the image ships devDependencies too.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
# Canonical catalog for `node dist/import/cli.js --catalog ...`.
COPY --chown=node:node frontend/src/data/oversio-identifiers.json /app/catalog/oversio-identifiers.json
# Non-root: uid 1000 is the `node` user and what Cloud Run accepts.
USER node
EXPOSE 8080
# Migrate-then-serve is the default COMMAND, not an ENTRYPOINT, so the compose
# `importer` one-shot can override `command:` and reuse this same image.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
