# Card Digital Rip

Week-1/2 MVP of a digital pack rip: published odds, a provably fair draw, an original reveal, credits-only buyback, a vault, an admin CSV loader, and a margin guard that blocks packs under 4% gross margin.

Payments run through test adapters. No card is charged. Inventory in the seed is **example** data: fictional subjects, `EX######` certs, and generative slab art. It is not a price feed and it is not a photograph of a real card.

Legal pages under `/legal` are marked **DRAFT — pending counsel**. Oklahoma, New Jersey, Tennessee, and Louisiana stay closed until an admin opens that state's flag. Washington, Nevada, Michigan, Idaho, and Montana stay closed. A buyback is a separate purchase offer that expires in 72 hours. Purchased credits do not expire. Promotional credits are a separate balance and may expire. There is no cash withdrawal. Sales tax, when a rate is configured, applies when credits are spent on a card.

The product spec is `docs/SPEC.md`. The engineering map is `docs/TECH_PLAN.md`. The spec names Drizzle; this repo uses Prisma.

## Run

You need Node 22, pnpm 10, and Postgres 16.

```bash
createdb card_digital_rip   # or: docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
cp .env.example .env        # set DATABASE_URL and SESSION_SECRET
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://127.0.0.1:3000.

Demo accounts:

| Email | Password | Role |
|---|---|---|
| ada@example.com | rip-demo | Ripper, California, $1,975 credits after the seeded example pull |
| admin@example.com | admin-demo | Admin |

Live packs: Field Notes ($25), Archive ($100), Vault Door ($500). Odds, expected value, buyback rate, the pool, and the active server-seed hash are on each pack page. `/verify/pull_example` recomputes a revealed historical pull.

Admin → Cards dry-runs or commits a CSV. Admin → Packs shows the margin guard. The seeded draft `draft-thin-margin` is inside the RTP band and under 4% gross margin, so publish stays blocked.

## Fairness check

The server seed is 32 raw bytes. The pack page shows SHA-256 of those bytes. A draw is:

```text
HMAC_SHA256(raw_seed, "{clientSeed}:{nonce}:{packVersion}")
```

The HMAC key is the hex-decoded seed, not the hex ASCII. After a seed is revealed:

```bash
# commit hash
echo -n "$SEED" | xxd -r -p | openssl dgst -sha256

# first HMAC block
openssl dgst -sha256 -mac HMAC -macopt hexkey:$SEED <<<"ada-client-seed:0:1"
```

`openssl dgst` adds a trailing newline with `<<<` on some shells. The app hashes the UTF-8 message with no extra newline. Published vectors live in `packages/fair/vectors/published.json`.

## Tests

```bash
pnpm test        # migrate, seed, vitest
pnpm typecheck
pnpm e2e         # Playwright against pnpm dev; needs the seeded database and Chromium
```

`pnpm exec playwright install chromium` once before `pnpm e2e`.

Deploy notes are in `docs/DEPLOY.md`. The request guards are in `docs/SECURITY.md`. A k6 script for 200 rips/s over 5 minutes is `load/rip.js`. It is not part of `pnpm test`.

## What this slice does not do

Live card charges. A contracted Shippo, Persona, or MaxMind account. A licensed price feed. A Rive binary. A full k6 run against production hardware. Counsel sign-off on the draft legal pages. Cash withdrawal. See `docs/TECH_PLAN.md`.
