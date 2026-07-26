# RanchiKart QA Testing Suite

This repository uses Vitest and Fastify's native `inject` for blazing-fast, robust integration and regression testing.

## Running Tests

To run the full suite:
```bash
bun run test
```

To run with coverage:
```bash
bun run test:coverage
```

To run tests with a UI:
```bash
bun run test:ui
```

## Structure
- `tests/system`: Ping, Health, Version
- `tests/auth`: Registration, Login, Refresh, Password, Passkeys, TOTP.
- `tests/users`: Profile, Addresses.
- `tests/products`: Catalog, search, featured.
- `tests/admin`: Admin dashboard, CRUD endpoints.
- `tests/security`: SQLi, XSS, Role bypass tests.
- `tests/performance`: Latency tests.

## Performance Report
After running the tests, a `performance-report.md` will be generated in the root of the backend folder highlighting any endpoint that takes more than 500ms to respond.

## Coverage
Coverage uses `@vitest/coverage-v8`. Reports are generated in the `coverage/` directory in JSON, HTML, and Text formats.
