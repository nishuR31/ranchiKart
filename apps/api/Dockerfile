# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ─── Stage 2: Production runner ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Only install production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline

# Copy built assets + prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Runtime env (override at deploy time)
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
