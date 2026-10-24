# Deploy

This build does not charge a card. The payment, shipping, KYC, and price-feed adapters are test or sandbox implementations. Turn on a live processor only after counsel signs the draft pages in `/legal` and the checklist in `legal/LEGAL_POSITIONS.md`.

## Vercel

1. Import the repo. Framework preset: Next.js. Root directory: the repository root. Install command: `pnpm install`. Build command: `pnpm build`.
2. Set `DATABASE_URL` to the Neon pooled connection string, with `connection_limit` left to the app (the Prisma client appends it).
3. Set `SESSION_SECRET` to a long random value. Set `LEDGER_APP_URL` only if you create the insert-only role in Neon.
4. Optional, still not a live charge: `STRIPE_WEBHOOK_SECRET`, `HIGH_RISK_WEBHOOK_SECRET`, `KYC_WEBHOOK_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_APPLE_ID`, `LOAD_TEST_TOKEN`.
5. Run migrations from a trusted shell, not on every request:

```bash
pnpm db:migrate
pnpm db:seed
```

Seed is for a demo database. Do not seed example inventory over a production catalog.

## Neon

1. Create a Postgres 16 database.
2. Apply `db/prisma/migrations` with `pnpm db:migrate`.
3. The ledger immutability trigger from the first migration rejects `UPDATE` and `DELETE` on `ledger_entries`.
4. The `ledger_app` role from the local setup is optional. If you create it, grant `SELECT` and `INSERT` on ledger tables only, and point `LEDGER_APP_URL` at it.

## Flags that ship closed

`state_open_OK`, `state_open_NJ`, `state_open_TN`, `state_open_LA`, `tier_10k`, `turbo_buyback`, and `vip` are false in the seed. Washington, Nevada, Michigan, Idaho, and Montana cannot be opened by a flag.

## Webhooks

- `POST /api/webhooks/stripe` with a `stripe-signature` header (`t=timestamp,v1=hmac`).
- `POST /api/webhooks/high-risk` with `x-signature` in the same format.
- `POST /api/webhooks/kyc` with `x-kyc-signature` as hex HMAC-SHA256 of the raw body.

All three accept the test secrets in `.env.example` when the env vars are unset.
