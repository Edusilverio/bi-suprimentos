# ============================================================
# Atlas BI — Dockerfile (Vite SPA estático servido por nginx)
# Diferente do playbook SSR: aqui NÃO há servidor Node/Nitro.
# `vite build` gera estáticos em dist/, que o nginx serve na 8080.
# ============================================================

# ---- Build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund      # NÃO usar "npm ci" (lock do Lovable vem dessincronizado)
COPY . .
RUN npm run build                          # gera dist/ (as VITE_* sao "assadas" aqui)

# ---- Runtime (estatico via nginx) ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
