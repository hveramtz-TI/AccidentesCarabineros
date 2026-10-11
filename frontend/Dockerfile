# Builds the React/Vite SPA and serves the static dist/ with nginx + SPA
# fallback (client-side routes must return index.html). In production this
# artifact goes to Cloudflare Pages; the nginx image only proves the flow
# locally. Build context: ./frontend

FROM node:22-slim AS build
WORKDIR /app
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
