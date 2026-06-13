# exKArt

A Flipkart-style ecommerce app for stamps, stationery, and custom boards.

## Stack

- API: Node.js, TypeScript, Fastify, Prisma, JWT auth, Redis-backed rate limiting
- Web: React, TypeScript, React Router, Zustand, Lucide React, Vite
- Payments: Razorpay order creation and signature verification

## Features

- Multi-page storefront: home, category, search, product detail, auth, cart, checkout, terms
- Product detail pages with gallery, variants, custom size, custom text, highlights, specs, replacement and return policies
- Categories and subtypes for stamps, stationery, official boards, name boards, light boards, safety boards, menu boards, and more
- Dark mode toggle persisted in Zustand
- No cash on delivery; checkout supports UPI, card, and net banking through Razorpay
- Redis rate limit with in-memory fallback for local development

## Run

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Web: `http://localhost:5173`
API: `http://localhost:4000`

Seeded admin:

```txt
admin@exkart.local
Admin@12345
```

## Environment

Copy `.env.example` into `.env` and update values. For live payments set:

```txt
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
VITE_RAZORPAY_KEY_ID=
```

When Razorpay keys are empty in development, the app uses a mock payment order so checkout can be tested locally. In production, configure real keys.
