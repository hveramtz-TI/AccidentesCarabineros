# Builds the React/Vite SPA and serves the static dist/ with nginx + SPA
# fallback (client-side routes must return index.html). In production this
# artifact goes to Cloudflare Pages; the nginx image only proves the flow
# locally. Build context: ./frontend

FROM node:22-slim AS build
WORKDIR /app
# Vite embeds VITE_* at build time; compose (or CI) passes local values here.
# Defaults keep the image buildable without secrets; the backend token must
# match UUID_CONNECTION of the target API for /api/dashboard calls to pass.
ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_UUID_CONNECTION=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_UUID_CONNECTION=$VITE_UUID_CONNECTION
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# Write the SPA server block without extra files (single-Dockerfile surface).
# printf keeps this compatible with the classic builder (no heredoc support).
# Single-quoted args protect nginx's $uri from shell expansion.
RUN printf '%s\n' \
    'server {' \
    '    listen       80;' \
    '    server_name  _;' \
    '    root         /usr/share/nginx/html;' \
    '    index        index.html;' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '}' \
    > /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
