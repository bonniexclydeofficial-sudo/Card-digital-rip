# Security review notes

This is an engineering checklist for the demo, not a penetration test.

## Authentication

Password login uses scrypt and an httpOnly HMAC session cookie (`cdr_session`) for 14 days. Five bad passwords lock sign-in for 15 minutes without changing the account status. Email OTP codes are stored as SHA-256, last 10 minutes, and burn after 5 misses. OTP and Google/Apple test tokens only link an account that already has a date of birth and a state. They do not create an account by themselves.

## Authorization

Admin routes and admin mutations check `role = admin`. Publishing a pack priced at $500 or more, and applying a manual price above $1,000, require a second admin. A person cannot approve their own request.

## Rip endpoint

`POST /api/rip` rejects `sec-fetch-site: cross-site`. A missing `sec-fetch-site` is allowed so same-origin fetches and server tests keep working. The route allows 30 rips per user per minute. `x-load-test` matching `LOAD_TEST_TOKEN` skips that limiter for the k6 script. Direct `ripPack` calls used by Vitest do not pass through the HTTP limiter.

Location checks use the account state plus any of `x-geo-state`, `x-ip-state`, and `x-billing-state`. `x-vpn: 1` blocks the rip. These headers are a hook for an IP intelligence vendor. They are not MaxMind.

## Payments

Stripe test mode returns `requires_action` and credits the wallet only after `confirmThreeDs`. The high-risk adapter succeeds immediately and records a 10% reserve lot. User credits are not reduced by the reserve. `charged` stays false. A dispute webhook locks the account, claws back credits still available, recalls unshipped card-funded vault items, and keeps shipped items for the evidence record.

## Ledger

Ledger rows are insert-only. The database trigger rejects updates and deletes. Promo credits and purchased credits are separate wallet fields. Promo lots can expire. Purchased credits have no expiry job.

## What is still open

Live processor keys, a real KYC vendor, a real geo-IP vendor, CSRF tokens on every server action (the rip route checks `sec-fetch-site`; server actions rely on Next's same-origin POST), and a third-party penetration test.
