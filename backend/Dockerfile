# Production-shaped image for the Fastify API + Excel importer (Cloud Run
# container contract: bind 0.0.0.0 + injected $PORT, default 8080).
# Base is node:24.22.1-slim, NOT alpine: Prisma query engines need glibc.
#
# The build context MUST be the repo root, because the canonical territory
# catalog lives under frontend/src/data/:
#   docker build -f backend/Dockerfile .
# The root .dockerignore governs that context.

FROM node:24.22.1-slim AS build
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
# Keep the generated @prisma/client and the `prisma` CLI (a production
# dependency for Fly's release command), but drop the build-only toolchain.
RUN npm prune --omit=dev

FROM node:24.22.1-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
# Runtime also needs OpenSSL for the Prisma engines (migrate deploy + client).
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
# Production node_modules from the build stage: `npm prune --omit=dev` ran
# after the build, so build-only tooling (tsx, @types/node, @flydotio/dockerfile)
# is gone. The generated @prisma/client engines and the `prisma` CLI (Fly release
# command) remain; `typescript` stays only as a Prisma transitive dependency.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
# Canonical catalog for `node dist/import/cli.js --catalog ...`.
COPY --chown=node:node frontend/src/data/oversio-identifiers.json /app/catalog/oversio-identifiers.json
# Non-root: uid 1000 is the `node` user and what Cloud Run accepts.
USER node
EXPOSE 8080
# Serve only. Fly runs migrations from `[deploy] release_command`; local compose
# keeps migrate-then-serve via the backend service `command:` override. CMD (not
# ENTRYPOINT) lets the compose `importer` one-shot reuse this image.
CMD ["node", "dist/server.js"]
