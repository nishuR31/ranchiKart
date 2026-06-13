# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source
COPY index.html vite.config.ts tsconfig*.json ./
COPY src ./src
COPY public ./public 2>/dev/null || true

# Build
ARG VITE_API_URL=https://api.mudrakart.in
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─── Stage 2: Serve with nginx ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
