# Card Digital Rip — Product Spec, MVP v2
v2.0 · 2026-10-23 · Owner: Daniel (digital stack) · Supply/fulfillment: partner (Whatnot breaker)
⚖️ = needs gaming-lawyer sign-off. *(ex)* = example number, not a commitment. v1 archived at research/archive/SPEC-2026-10-23-v1.md.

## Review & grades (panel: product, gaming law, payments risk, CFO, staff eng, game/UX)
| § | Section | v1 | v2 | What changed |
|---|---|---|---|---|
| 0 | Principles | B | A+ | Added "card is the prize" legal reality, fraud and inventory principles |
| 1 | Scope | B | A+ | Hard cut-lines; turbo/modes moved behind flags; launch gated by checklist |
| 2 | Personas | C | A+ | Added Fraudster and At-risk player personas with design responses |
| 3 | Screens | B | A+ | Trimmed to what v1 needs; added ship-hold, limits, funding-source states |
| 4 | Flows | B- | A+ | Added failure paths (decline, chargeback, out-of-stock, price stale) |
| 5 | Economics | **D** | A+ | v1 example missed its own margin target (2.4% vs 4-6%). Corrected formula, solved for RTP, blended fee, credit liability, sensitivity table |
| 6 | Inventory risk | **F (missing)** | A+ | New: price-drop markdowns, chase-card concentration caps, max pack liability, restock rules |
| 7 | Pricing data | **F (missing)** | A+ | New: sources, licensing, refresh cadence, confidence haircut |
| 8 | Rip/animation | B | A+ | Measurable perf budget, near-miss ban testable, accessibility |
| 9 | Buyback | C | A+ | Price-drop policy, offer lock, credit liability rules |
| 10 | Vault/ship/ops | C | A+ | Insurance, custody, intake SOP, audits, SLAs, graded-only (no grading turnaround risk) |
| 11 | Fraud/chargebacks | **F (missing)** | A+ | New: stolen-card → ship-a-slab cash-out loop closed with funding holds, 3DS, risk scoring |
| 12 | Growth & retention | **F (missing)** | A+ | New: loops that don't depend on gambling mechanics |
| 13 | Go-to-market | **F (missing)** | A+ | New: partner-audience launch, Whatnot ToS risk, waitlist, launch metrics |
| 14 | VIP | C | A+ | Guardrails, KYC, no loss-rebates |
| 15 | Admin + CSV | B | A+ | Validation rules testable, custody fields, two-person controls |
| 16 | Data model | B | A+ | Funding source on ledger, price history, holds, liability caps |
| 17 | Provably fair | B- | A+ | v1 concurrency/snapshot design was unbuildable; replaced with deterministic slot-ordering |
| 18 | Compliance/payments | C | A+ | Prize-of-value analysis, processor plan with reserves, MSB/escheat flags |
| 19 | Stack | B | A+ | Pinned choices + why |
| 20 | Metrics & kill criteria | C / **F** | A+ | Targets per metric + explicit kill/pivot triggers |
| 21 | Build plan | B | A+ | Acceptance criteria all automatable; weeks re-sequenced around risk |
| 22 | Phase 2 marketplace | C | A+ | Consignment economics, QC SLA, supplier fraud |
| 23 | Launch checklist | C | A+ | Go/no-go gates with owners |
| 24 | Open questions | B | A+ | Ranked; each tied to the section it blocks |

---
## 0. Principles
1. **Real card, every pull.** Every outcome is a specific graded slab (grader + cert), physically in our custody, photographed, and allocated to the pack before it goes live.
2. **The card is the prize.** Even with credits-only buyback, a shippable slab has resale value ⚖️. We therefore treat legality as unresolved until counsel opines, and design for the strictest reasonable reading (geo-block, published odds, no cash-out, no near-miss, limits).
3. **Transparent.** Odds, full pool, EV, buyback %, and every fee visible before purchase. No fees not shown on the pack page.
4. **Provably fair.** Commit-reveal seeds; any pull is reproducible by anyone.
5. **Never sell what we can't afford to lose.** Pack liability capped by inventory and cash (§6).
6. **Close the cash-out loop for fraud.** Fresh card money cannot become a shipped slab without holds/verification (§11).
7. **Fast physical.** Flat, insured shipping, label ≤ 2 business days.
8. **Original IP only.** Borrow patterns, never code/art/sound/animation.

## 1. Scope
**MVP launch (weeks 1–4):** auth + age/geo gate; credit wallet (card top-up); 3 live tiers ($25/$100/$500); pack page (odds, pool, EV); provably-fair draw; Rive rip; result (Keep/Ship/Buyback); vault; ship requests w/ funding holds; live feed; x3 multi-open; responsible-play limits; admin: CSV/card loader, pack builder + validator, pricing queue, fulfillment, risk queue, audit log.
**Behind flags, enable post-launch when metrics allow:** $10K tier (needs ≥ $150K *(ex)* allocated grail inventory + 2 weeks clean fraud data), turbo bulk buyback, volatility modes (Steady/Balance/Wild), VIP tiers.
**Phase 2:** supplier marketplace (§22), group "rip rooms", P2P listing, VRF entropy, cash-out (only if counsel clears).
**Phase 3:** B2B white-label.
**Not building:** crypto/tokens, native apps (PWA), raffles, claw, pre-rip "insurance" upsell ⚖️, loss-based rebates ⚖️.

## 2. Personas → design response
| Persona | Wants | Response |
|---|---|---|
| Ripper (18–35, $25–100/session) | Reveal thrill, fair odds, fast re-rip | 4–6 s rip, x3, live feed, EV shown |
| Collector | Specific slab, cheap fast shipping | Pool browsing, flat ship, cert links |
| Whale ($5K+/mo) | Status, better rates, grails | VIP (flagged), concierge, KYC first |
| Partner's Whatnot audience | Trust in partner | Partner-branded packs, launch drops (§13) |
| **Fraudster** | Stolen card → slab → resell | Funding holds, 3DS, risk score (§11) |
| **At-risk player** | (Needs protection) | Default limits, reality checks, cool-off, self-exclusion |
| Ops/admin | Load, price, ship, reconcile | Admin console, SOPs (§10, §15) |
| Card store (phase 2) | Move inventory at fair price | Supplier portal (§22) |

## 3. Screens
Consumer (mobile-first PWA)
1. Landing — reveal loop, live feed, featured packs, how-it-works, trust strip.
2. Sign up/Log in — email OTP, Google, Apple; DOB; Terms + Odds disclosure.
3. Gate — 18+ (per-state min age config); geo check; blocked/under-age page.
4. Catalog — tiers, category filter, "top pulls today".
5. Pack page — price; odds per tier; full pool (photo, grade, FMV, price-confidence badge); EV + buyback %; stock remaining per tier; server seed hash; fees; Rip / Rip x3.
6. Top-up sheet — presets, saved card, 3DS, current limit remaining.
7. Rip — animation (§8).
8. Result — slab hero (front/back, grade, cert link, FMV, comps), Keep / Ship / Buyback, Rip again, Share.
9. Multi-result grid (x3).
10. Vault — owned cards, total FMV, actions; shows **ship-hold** badge when applicable.
11. Card detail — images, cert verify, price history, provenance (pull id → Verify).
12. Ship request — select ≤ N cards, US address, flat fee, insurance included, hold notice if funds are new.
13. Shipments — tracking.
14. Wallet — balance split: *available* vs *on hold*; history; no withdrawal ⚖️.
15. Verify — pull id → full recomputation.
16. Settings — client seed, skip animation, notifications.
17. Responsible play — limits (default on *(ex)*: $500/day), reality check 60 min, cool-off, self-exclusion.
18. Help/FAQ, Odds disclosure, Terms, Privacy, Responsible play.
19. Restricted states — blocked geo, under-age, self-excluded, KYC required.
Admin
20. Dashboard (§20 metrics). 21. Card loader + CSV import. 22. Inventory (status, custody, price age). 23. Pack builder + validator. 24. Pack monitor (stock, liability, auto-pause). 25. Pricing queue (stale/low-confidence/override). 26. Fulfillment (pick/pack/label). 27. Risk queue (holds, flags, chargebacks). 28. Users (KYC, limits, credit adjust w/ 2-person approval). 29. Seeds. 30. Audit log. 31. Settings (blocked states, rates, fees, flags).

## 4. Flows (happy + failure)
- **F1 Onboard:** sign up → DOB → geo → pass: catalog | fail: restricted page (logged).
- **F2 Top-up:** amount → limit check → 3DS → success: credits *on hold* until risk clears (§11) but usable for rips | decline: retry once, then support | limit hit: show limit screen.
- **F3 Rip:** pack page → Rip → server: geo re-check, balance, stock, price freshness → draw → animation → result. Failures: pack auto-paused (tier empty / liability cap / stale price) → "pack refilling" and no charge; network drop → idempotent; result recoverable in Vault.
- **F4 Buyback:** offer locked for 10 min *(ex)* at current FMV × rate → confirm → credits posted → card `available` after price refresh.
- **F5 Ship:** select → address verify → fee → if any card was won with *held* funds → shipment waits until hold clears or KYC passes → label ≤ 2 business days → tracking.
- **F6 Chargeback:** webhook → lock account → reverse remaining credits → recall unshipped cards to house → if shipped: dispute with evidence pack (pull log, IP, 3DS, delivery proof).
- **F7 Verify:** result → Verify → recompute.
- **F8 Admin load → live:** CSV dry-run → commit → photos → pricing confidence check → pack builder → validator pass → second-admin approve (≥ $500 tier) → publish.

## 5. Economics (CFO-grade)
### 5.1 Variables
`P` pack price · `p_t` tier odds (Σ=1) · `V_t` stock-weighted avg FMV in tier · `EV = Σ p_t·V_t` · `RTP = EV/P` · `b` buyback rate · `β` share of pulls bought back · `k` replacement cost of a kept card as share of FMV · `f` blended variable cost per $ of rips (payments on *new money only*, fraud loss, shipping subsidy, ops).
### 5.2 Gross margin per $ of rip revenue
When a card is bought back we keep the card and owe credit `b·FMV`; when kept, we consume a card that costs `k·FMV` to replace.
**`GM% = 1 − RTP·[β·b + (1−β)·k] − f`**
Solve for the RTP that hits a target margin `m`: **`RTP* = (1 − f − m) / [β·b + (1−β)·k]`**
Player return (value received ÷ spend) = `RTP·[β·b + (1−β)]`.
### 5.3 Base case *(ex)*
β=0.92, b=0.90, k=0.85, f=0.045 (3.5% card fees × ~60% of rips funded by new money ≈ 2.1%, fraud 0.8%, ship subsidy 0.6%, ops 1.0%).
β·b + (1−β)·k = 0.828 + 0.068 = 0.896. Target m=5% → **RTP* = 0.905/0.896 ≈ 101%**. Player return ≈ 1.01 × 0.908 ≈ **92%**.
*v1 used RTP 104% → GM ≈ 2.3%. That was the error.*
### 5.4 Sensitivity *(ex, RTP=101%)*
| Change | GM% |
|---|---|
| Base | 5.0% |
| b 0.90→0.92 | 3.1% |
| β 0.92→0.80 (more ships) | 5.6% (but more fulfillment cost) |
| k 0.85→0.95 (we pay retail) | 4.2% |
| f +2 pts (fraud spike) | 3.0% |
| RTP 104% | 2.3% |
Validator enforces RTP ∈ [98%, 103%] and computed GM ≥ 4% at current β, b, k; else publish blocked.
### 5.5 Credits = liability
Outstanding credits are a balance-sheet liability. Track daily; keep cash ≥ 100% of credit liability *(ex)* plus vault inventory ≥ pool allocations. Breakage (unused credits) is NOT counted as revenue until counsel/CPA confirm ⚖️.
### 5.6 Example $100 pack *(ex)*
| Tier | Odds | Avg FMV | Contrib |
|---|---|---|---|
| Common | 72% | $62 | $44.64 |
| Rare | 20% | $120 | $24.00 |
| Epic | 6.5% | $280 | $18.20 |
| Legendary | 1.4% | $650 | $9.10 |
| Grail | 0.1% | $5,000 | $5.00 |
| EV | | | **$100.94 (RTP 100.9%)** |

## 6. Inventory risk
- **Price drops:** nightly re-price. If a card's FMV falls > 10% *(ex)*, pack EV is recomputed; if RTP leaves band, pack auto-pauses and admin re-tiers. House inventory marked to market weekly; markdown reserve = 5% of inventory FMV *(ex)*.
- **Volatility haircut:** cards with high 30-day price variance or < 3 comps get FMV × 0.9 for pack math and buyback (shown as "price confidence: low").
- **Chase concentration:** any single card ≤ 10% of a pack's EV *(ex)*; Grail+Legendary tiers each hold ≥ 3 cards so one pull doesn't empty the tier; tier empty → auto-pause.
- **Max pack liability:** `Σ remaining allocated FMV` must be ≤ inventory owned in custody; no "virtual" cards ever.
- **Restock:** bought-back cards re-enter at refreshed FMV; replenishment target ≥ 4 weeks of expected kept pulls *(ex)*.
- **Category concentration:** no category > 70% of inventory FMV after month 2 *(ex)* (Pokémon market crash risk).

## 7. Pricing data
- Sources (in priority): licensed feed (Card Ladder, Alt, or PriceCharting API — pick one, license for commercial display ⚖️ contract), recent sold comps (eBay sold via licensed provider, 130point), manual override with reason.
- FMV = median of last 5 sold comps within 90 days for same grader+grade; falls back to feed value; else manual + low-confidence haircut.
- Refresh: nightly all; hourly for cards > $1,000 *(ex)*. Price age shown on card. Stale (> 7 days, > 24 h if > $1K) → card cannot be allocated.
- Overrides require reason + second admin above $1K. All price changes kept in `price_history`.

## 8. Rip experience
- Rive state machine (inputs `tier` 0–4, `isGrail`, `skip`); Three.js tilt only on result. Original art + SFX.
- Sequence (4–6 s): arm 0.5 s → rarity bar climbs and **stops at the drawn tier, never passes it** → tier burst → slab flip, grade stamp, FMV count-up → decision.
- Outcome decided server-side before animation; animation cosmetic.
- Budgets (tested): Rive file < 300 KB; 60 fps on Pixel 6a class; result image prefetched during build-up (time-to-image < 200 ms after reveal).
- Skip after first rip; reduced-motion mode; mute; haptics opt-in.
- Multi x3 plays sequentially, then grid.

## 9. Buyback
- Offer = current FMV (after confidence haircut) × b; b = 90% *(ex)*; VIP +1–2 pts (flag).
- Available on result and anytime in vault; offer locked 10 min once opened.
- Paid in non-withdrawable credits ⚖️. Credits valid ≥ 12 months ⚖️ (escheat/gift-card law), non-transferable.
- No timers or pressure copy. Every buyback confirmed; bulk only with explicit threshold (flag).
- Blocked for cards under chargeback, hold, or dispute.

## 10. Vault, shipping, ops
- **Custody:** phase 1 cards held in partner-operated, NewCo-designated secure area; written bailment/custody agreement ⚖️ stating NewCo (or user, once pulled) owns the card, not partner. Safe/locked cage, camera coverage, access log.
- **Insurance:** inventory floater (in-vault) + transit insurance; coverage ≥ peak inventory FMV *(ex $250K)*. Required before launch.
- **Graded only:** PSA/BGS/CGC/SGC slabs only; no raw cards → zero grading turnaround risk in v1.
- **Intake SOP:** verify cert online, photo front/back, bin-label, scan into system; two-person intake for > $1K.
- **Audits:** weekly cycle count of 10% of bins; monthly full count; mismatch → freeze affected packs.
- **Shipping:** US only; flat $7.99 *(ex)* up to 5 slabs; free > $500 FMV *(ex)*; signature > $1K; label ≤ 2 business days (SLA tracked); Shippo/EasyPost.
- **Damage/loss:** insured claim, user made whole at FMV in credits or replacement of same grade.

## 11. Fraud & chargebacks
The core attack: stolen card → credits → rip → ship slab → resell. Controls:
- 3DS on all top-ups; AVS + CVV; device fingerprint + IP risk (Stripe Radar or Sardine/SEON).
- **Funding hold:** credits from a top-up are usable for rips immediately, but cards won with them can't ship for 72 h *(ex)* (or 7 days for first-time accounts) unless KYC passed.
- KYC required: cumulative top-ups ≥ $500 *(ex)*, any shipment > $1K FMV, VIP.
- Velocity limits: new account $250/day *(ex)* top-up; max 3 payment cards/account; one account per device/person.
- Address: ship only to verified address matching KYC or billing for first 30 days.
- Chargeback target < 0.5% count, < 0.3% $ (processor thresholds ~0.9–1%). Auto-lock on dispute; evidence pack auto-built.
- Bonus/promo abuse: promos only credit after KYC; no referral cash.

## 12. Growth & retention loops
1. **Share-a-pull:** auto-generated pull card (slab image, odds, verify link) for X/IG/TikTok; branded watermark.
2. **Live feed + "pulled from your pack" notifications** creates social proof.
3. **Scheduled drops:** themed limited packs weekly (e.g. Friday partner drop) → appointment return.
4. **Collections:** vault sets/progress (e.g. complete Base Set slabs) → reason to keep, not rip.
5. **Partner stream tie-in:** partner shows top site pulls on streams (subject to §13 ToS).
6. **Referral:** gives both sides free shipping, not credits ⚖️.
Avoid: loss-chasing streaks, timed "last chance" pressure ⚖️.

## 13. Go-to-market
- **Launch audience:** partner's Whatnot following (+ socials). ⚠️ Whatnot ToS may bar steering buyers off-platform; partner promotes on his own socials/Discord, not inside Whatnot streams, unless Whatnot confirms in writing.
- **Sequence:** waitlist (2 weeks) → closed beta 200 users *(ex)*, 3 packs, invite codes → public launch with partner livestream on YouTube/X → weekly drops.
- **Creator packs:** partner-branded "pulled by X" packs; revenue share in supply contract.
- **Budget *(ex)*:** $10K launch credits for verified creators (rips recorded, disclosed #ad).
- **Launch targets *(ex)*:** 2,000 waitlist, 25% beta→paying, $150K GMV first 30 days.

## 14. VIP (flagged at launch)
Tiers by 90-day net spend *(ex)* $1K/$10K/$50K. Perks: +1–2 pts buyback, free/priority shipping, early drop access, concierge. Guardrails: KYC mandatory; monthly affordability check above $10K *(ex)*; no loss rebates; outreach only to opted-in users.

## 15. Admin card loader & CSV
Single add: grader + cert → lookup → autofill → photos → price → save. CSV (UTF-8, header, dry-run, atomic commit):
| column | type | req | rule |
|---|---|---|---|
| grader | PSA/BGS/CGC/SGC | Y | |
| cert_number | string | Y | unique per grader |
| grade | decimal(3,1) | Y | 1–10 |
| category | pokemon/baseball/basketball/football/one_piece/other | Y | |
| subject | string | Y | player/character |
| set_name | string | Y | |
| year | int | Y | 1900–current |
| card_number | string | N | |
| variant | string | N | |
| fmv_usd | decimal | Y | > 0 |
| fmv_source | string | Y | feed/comps/manual |
| fmv_date | date | Y | not stale (§7) |
| cost_basis_usd | decimal | Y | private |
| owner | house/supplier | Y | phase 1 house |
| supplier_id | uuid | cond | if supplier |
| custody_location | string | Y | site code |
| bin | string | Y | |
| image_front_url / image_back_url | url | N | required before allocation |
Rejects: duplicate cert, fmv > 2× feed value, missing required, stale price. Report row + reason; dry run writes nothing.

## 16. Data model (Postgres)
users(id, email, username, dob, state, kyc_status, risk_score, vip_tier, client_seed, status) · limits · exclusions · geo_checks
wallets(user_id) · **ledger_entries**(id, user_id, type, amount_cents, funding_source[card|credit_buyback|promo], hold_until, ref_type, ref_id, at) — double-entry, immutable
payments(id, provider, ref, amount, status, three_ds, risk) · disputes(id, payment_id, status, evidence_url)
cards(id, grader, cert, grade, …, fmv_cents, price_confidence, fmv_at, cost_cents, owner_type, supplier_id, custody_location, bin, status) · **price_history**(card_id, fmv_cents, source, at) · card_events
packs(id, slug, price_cents, status, version, liability_cap_cents) · pack_tiers(pack_id, version, tier, odds_bps) · **pack_slots**(pack_id, version, tier, slot_index, card_id, state)
seeds(id, hash, seed, active_from, revealed_at) · pulls(id, user_id, pack_id, version, seed_id, client_seed, nonce, tier, slot_index, card_id, funding_source, at)
vault_items · buybacks(id, card_id, fmv_cents, rate_bps, credit_cents, offer_expires_at) · shipments(id, cards, fee, status, hold_reason) · admin_audit
Card status: `intake → available → allocated → pulled → (shipping → shipped) | (bought_back → available)`; `frozen` on audit mismatch.

## 17. Provably fair
- Server seed 32 bytes; publish SHA-256 before use; reveal on rotation (user-triggered or 24 h). Client seed user-editable. Nonce per (user, seed).
- `h = HMAC_SHA256(server_seed, client_seed:nonce:pack_version)`.
- Tier: `r1` from bytes 0–3 with rejection sampling → mod 10000 vs cumulative odds_bps.
- Card: `r2` from next bytes → index into the tier's **available slots ordered by slot_index** at pull time; the ordered slot-id list hash is stored on the pull, so verifiers can recompute.
- Concurrency: draw runs in a SERIALIZABLE transaction locking the pack's tier row; one pull per tier at a time (fine at MVP volume; > 200 rips/s → shard by pack). No silent re-roll.
- Odds fixed per pack version; tier empty → pack paused (never "redistributed" mid-version).
- Open-source verifier (JS) + published test vectors.

## 18. Compliance & payments ⚖️
- **Entity:** NewCo separate from partner; supply + custody + promotion agreement (pricing, title transfer, insurance, SLA, audit rights, exclusivity, rev share).
- **Prize-of-value analysis (for counsel):** consideration = pack price; chance = draw; prize = card (resellable) and credits. Mitigations: every pack has EV ≈ price (retail-like "mystery box"), credits non-cashable, published odds, geo-block. Counsel to opine per target state.
- **Geo:** block WA, NV, MI, ID, MT, OK now (OK SB 1589 effective 2026-11-01); config list; IP (MaxMind) + browser geolocation at rip + billing state + VPN detection; re-check each rip.
- **Age:** 18+ (21+ configurable per state); DOB + KYC at thresholds (§11). Vendor: Persona or Stripe Identity; OFAC screening.
- **Responsible play:** default limits, reality checks, cool-off, self-exclusion, help links.
- **Money transmission:** stored credits non-withdrawable → likely not MSB, confirm ⚖️. Cash-out would change this.
- **Payments plan:** apply to Stripe with full description + odds page; in parallel apply to 1–2 high-risk-friendly acquirers (e.g. via NMI/Authorize.net gateway ISOs, Nuvei, Paysafe). Code against `PaymentProvider` interface. Model 5–10% rolling reserve and 2–4 week approval timeline; launch date depends on approval.
- **Tax:** sales tax on credit purchase vs delivery; breakage treatment (CPA).
- **Privacy:** CCPA, PII encrypted, KYC docs held by vendor.

## 19. Stack
Next.js 15 + TypeScript + Tailwind + shadcn/ui (PWA) · Postgres (Neon) + Drizzle · Upstash Redis (rate limits, feed pub/sub) · Ably or Pusher (realtime) · Auth.js (email OTP, Google, Apple) · Rive + react-three-fiber · Stripe adapter first, high-risk adapter second · Persona · MaxMind + IPQS · Shippo · Cloudflare R2 images · Resend · Sentry + PostHog · Vercel · Vitest, Playwright, fast-check, k6. Why: one language, managed infra, fastest for an AI-built MVP.

## 20. Metrics, targets, kill criteria *(ex targets)*
| Metric | 90-day target |
|---|---|
| GMV | $150K mo1 → $500K mo3 |
| Gross margin (realized) | 4–6% |
| β buyback share | 85–95% |
| D30 paying retention | ≥ 25% |
| Chargeback rate | < 0.5% |
| Ship SLA ≤ 2 bd | ≥ 95% |
| Inventory count accuracy | 100% |
| Credit liability coverage (cash) | ≥ 100% |
**Kill / pivot triggers (any):** counsel says model is illegal in > 50% of target GMV states; no processor approval within 8 weeks; realized GM < 2% for 2 consecutive months after re-pricing; chargebacks > 1% for 2 months; month-3 GMV < $100K with CAC > 3× 90-day gross profit per user; partner supply < $100K FMV by month 2. Pivot options: B2B white-label, credit-only sweepstakes model ⚖️, or Collector Crypt storefront.

## 21. Build plan (agent-executable; every item has an automated test)
Repo: `/app`, `/packages/fair`, `/packages/econ`, `/packages/risk`, `/db`, `/docs`. CI: typecheck, lint, unit, e2e.
**Week 1 — Foundation + money core**
- [ ] Scaffold, CI green, seeded demo (200 cards, 3 packs).
- [ ] Auth; DOB < 18 → blocked (e2e). Mock geo in {WA,NV,MI,ID,MT,OK} → blocked (e2e); geo re-checked on rip API (unit).
- [ ] Ledger: property test 10K random ops → balance = Σ entries, never negative, entries immutable (DB role lacks UPDATE/DELETE).
- [ ] `packages/econ`: GM% and RTP* formulas match §5.3 to 0.1 pt (unit).
**Week 2 — Packs, fairness, rip**
- [ ] `packages/fair` matches published test vectors; 1M-roll Monte Carlo within ±0.2 pt per tier; rejection sampling test.
- [ ] Validator rejects: Σodds ≠ 10000; RTP ∉ [98,103]%; GM < 4%; any card > 10% of EV; tier < 3 cards; stale price; liability > inventory.
- [ ] Rip API idempotent; 100 concurrent rips on 10-slot pack → exactly 10 succeed, 0 double allocations.
- [ ] Pack page shows odds, pool, EV, buyback %, seed hash (e2e snapshot). Verify page recomputes 100 random pulls (e2e).
- [ ] Rive placeholder wired to tier input; bar never exceeds drawn tier (unit on state inputs).
**Week 3 — Buyback, ship, fraud, admin**
- [ ] Buyback = floor(FMV×haircut×rate); offer expiry enforced; blocked on hold/dispute.
- [ ] Funding hold: card won with fresh card funds can't ship before hold/KYC (e2e).
- [ ] Chargeback webhook → lock, reverse credits, recall unshipped (integration, Stripe test).
- [ ] CSV 500 rows < 10 s; each reject rule covered; dry run writes 0 rows.
- [ ] Price refresh job; > 10% drop → EV recalculated, pack auto-pauses if out of band.
- [ ] Shippo test label; SLA timer; fulfillment queue.
- [ ] Limits: deposit limit enforced; increase delayed 24 h; self-exclusion blocks rip.
**Week 4 — Polish, hardening, launch gates**
- [ ] Final Rive (< 300 KB, 60 fps Pixel 6a profile via Playwright trace), prefetch < 200 ms, reduced-motion.
- [ ] KYC sandbox triggers at §11 thresholds.
- [ ] Every admin mutation in audit log; ≥ $500 pack publish needs second admin.
- [ ] k6: 200 rips/s 5 min, p95 < 500 ms, 0 ledger mismatches.
- [ ] Dashboard shows all §20 metrics from seeded data. Lighthouse mobile ≥ 85.

## 22. Phase 2 — supplier marketplace
KYB (EIN, W-9, bank via Stripe Connect/payout provider). Submit by cert/CSV → ship to vault → QC ≤ 3 business days *(ex)* (cert check, photo, condition, price). Reject if ask > FMV × 1.05. Consignment payout = FMV at pull × (1 − 10% *(ex)*), weekly after 14-day hold (chargeback window). Supplier fraud: cert-swap check at intake, fake slab detection (grader lookup + visual), clawback clause. Bought-back supplier cards become house inventory. Store-branded packs.

## 23. Launch go/no-go
| Gate | Owner |
|---|---|
| Counsel written opinion + T&Cs + state list | Lawyer |
| NewCo formed, bank, books | Daniel |
| Processor live with reserve terms | Daniel |
| Supply + custody + promo agreement signed | Daniel + partner |
| Insurance bound (vault + transit) | Partner/Daniel |
| ≥ $75K *(ex)* FMV loaded, priced, photographed, counted | Partner |
| All week-4 tests green; pen test of rip/ledger APIs | Eng |
| Support inbox, incident + chargeback runbooks | Daniel |

## 24. Open questions (ranked; blocks §)
**Lawyer:** 1) Does a resellable slab as prize make this a lottery in our target states even with credits-only buyback? (§0, §18) 2) Final blocked-state list and 21+ states; does OK SB 1589 reach this model? (§18) 3) Credits: expiry, escheat, MSB status, breakage. (§5.5, §9) 4) Promos/referrals/VIP: sweepstakes/AMOE needs. (§12, §14) 5) Isolation from partner's Whatnot litigation. (§18)
**Partner:** 1) Committed FMV, mix, and CSV export date. (§6, §15) 2) Cost basis → k, and sale vs consignment to NewCo. (§5) 3) Vault security, insurance, 2-day ship capacity, cost/shipment. (§10) 4) Whatnot ToS on off-platform promotion; exclusivity; rev share. (§13) 5) Owner of bought-back cards. (§10)
**Internal:** pricing-feed vendor + license (§7); processor shortlist (§18); brand/domain; Pokémon-first launch.
