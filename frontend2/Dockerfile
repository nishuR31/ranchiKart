# ---------- Dependencies ----------
FROM oven/bun:1 AS deps

WORKDIR /frontend

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile


# ---------- Build ----------
FROM oven/bun:1 AS builder

WORKDIR /frontend

COPY --from=deps /frontend/node_modules ./node_modules
COPY . .

RUN bun run build


# ---------- Runtime ----------
FROM oven/bun:1-slim

WORKDIR /frontend

ENV NODE_ENV=production
ENV PORT=5173

COPY package.json bun.lock ./

RUN bun install --production --frozen-lockfile

COPY --from=builder /frontend/dist ./dist

EXPOSE 5173

CMD ["bun", "run", "dev"]