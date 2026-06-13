# MudraKart — Production Deployment Guide

> Custom stamps, office name boards & stationery — made to order

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Browser)                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
           ┌───────────────┴───────────────────┐
           │        Traefik (Reverse Proxy)    │  Auto SSL via Let's Encrypt
           └───────┬───────────────────┬───────┘
                   │                   │
    ┌──────────────▼───────┐  ┌───────▼────────────────┐
    │  mudrakart-web       │  │  mudrakart-api         │
    │  Nginx + React SPA   │  │  Fastify + Prisma      │
    │  :3000 (→ 80)        │  │  :4000                 │
    └──────────────────────┘  └────────────┬───────────┘
                                           │ SSL Postgres
                              ┌────────────▼───────────┐
                              │  NeonDB PostgreSQL     │
                              └────────────────────────┘
```

---

## Quick Start (Local Dev)

```bash
# 1. Clone and install
git clone <repo> mudrakart && cd mudrakart
npm install

# 2. Set up API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — add your DATABASE_URL and JWT_SECRET

# 3. Push schema to database
cd apps/api && npx prisma db push

# 4. Seed data
npm run db:seed

# 5. Start both services
cd ../..
npm run dev          # starts api:4000 + web:5173 in parallel
```

**Test accounts (after seed):**

| Email | Password | Role |
|---|---|---|
| admin@mudrakart.in | Admin@MudraKart#2025 | ADMIN |
| manager@mudrakart.in | Manager@MudraKart#2025 | MANAGER |
| user@mudrakart.in | User@MudraKart#2025 | USER |

---

## Production Deployment

### Option A — Docker Compose (Recommended)

```bash
# 1. On your server (Ubuntu 22.04+)
git clone <repo> mudrakart && cd mudrakart

# 2. Set API environment
cp apps/api/.env.example apps/api/.env
nano apps/api/.env      # fill in DATABASE_URL, JWT_SECRET, Razorpay keys

# 3. Run migrations
docker compose -f docker-compose.prod.yml run --rm api \
  npx prisma db push

# 4. Seed data (first deploy only)
docker compose -f docker-compose.prod.yml run --rm api \
  npx prisma db seed

# 5. Build and start
VITE_API_URL=https://api.mudrakart.in \
  docker compose -f docker-compose.prod.yml up -d --build
```

### Option B — Build Separately

#### API
```bash
cd apps/api
docker build -t mudrakart-api .
docker run -d \
  --name mudrakart-api \
  -p 4000:4000 \
  --env-file .env \
  -e NODE_ENV=production \
  mudrakart-api
```

#### Web
```bash
cd apps/web
docker build \
  --build-arg VITE_API_URL=https://api.mudrakart.in \
  -t mudrakart-web .
docker run -d \
  --name mudrakart-web \
  -p 80:80 \
  mudrakart-web
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | NeonDB/Postgres connection string |
| `JWT_SECRET` | ✅ | Min 32 char random string |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay live key |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay live secret |
| `CORS_ORIGIN` | ✅ | Comma-separated allowed origins |
| `SMTP_HOST` | ⚠️ | For order confirmation emails |
| `PORT` | ❌ | Default: 4000 |

### Web (`apps/web/.env` or Docker build arg)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full API URL (e.g. `https://api.mudrakart.in`) |

> ⚠️ `VITE_*` variables are **baked into the JS bundle at build time**. You must rebuild the web image if this changes.

---

## DNS Setup

Point your domain registrar:
```
A     mudrakart.in        → <server-ip>
A     www.mudrakart.in    → <server-ip>
A     api.mudrakart.in    → <server-ip>
```

Traefik automatically provisions Let's Encrypt SSL for all three.

---

## Database Migrations

```bash
# After schema changes
cd apps/api
npx prisma db push          # dev (no migration history)
npx prisma migrate deploy   # prod (with migration history)

# Generate Prisma client
npx prisma generate
```

---

## RBAC Roles

| Role | Permissions |
|---|---|
| USER | Browse, buy, wishlist, manage own orders/reviews |
| MANAGER | All USER + view orders/products/users/logs |
| ADMIN | All MANAGER + create/delete products, manage coupons, promote users |

---

## API Documentation

Swagger UI available at `http://localhost:4000/docs` in development.

**Key endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | — | Register |
| POST | /auth/login | — | Login |
| GET | /products | — | List products |
| GET | /products/:slug | — | Product detail |
| GET | /categories | — | All categories |
| POST | /orders | USER | Create order |
| GET | /admin/dashboard | MANAGER | Stats + charts |
| POST | /admin/coupons | ADMIN | Create coupon |
| PATCH | /admin/users/:id/role | ADMIN | Update user role |
