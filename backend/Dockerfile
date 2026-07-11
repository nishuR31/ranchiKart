# ---------- Dependencies ----------
FROM oven/bun:1 AS deps

WORKDIR /backend

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile


# ---------- Build ----------
FROM oven/bun:1 AS builder

WORKDIR /backend

COPY --from=deps /backend/node_modules ./node_modules
COPY . .

RUN bunx prisma generate

RUN bun run build


# ---------- Runtime ----------
FROM oven/bun:1-slim

WORKDIR /backend

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./

RUN bun install --production --frozen-lockfile

COPY --from=builder /backend/dist ./dist
COPY --from=builder /backend/prisma ./prisma
COPY --from=builder /backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /backend/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]