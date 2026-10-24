# ToS teardown: rip / mystery-pack platforms (2026-10-24)
Not legal advice. This describes what the market does. Sources and quotes are in legal/tos/*.md; raw HTML/text is in legal/tos/raw/.

## Comparison
| | Courtyard | Collector Crypt | Phygitals | Arena Club | LastPack |
|---|---|---|---|---|---|
| Entity / law | Courtyard Inc. (DE) | CC Corp, Panama law | — | — | Lotus Digital (DE), CA law |
| Age | 18+ | 18+ | 18+ or age of majority | 18+ | 18+ plus ID |
| States blocked | none (OFAC only); promos void NY/FL | vague / NFT jurisdictions | OFAC, feature-level | — | NV (maybe ID/MI/MT/WA) |
| Pack framing | "random card purchase", fixed price | gacha + sweepstakes | "analogous to sealed product", 1:1 | final-sale product | "not lotteries ... Items, not cash prizes" |
| AMOE | giveaways only | yes, "identical odds" (rules not published) | — | yes, NPN sweepstakes | no |
| Buyback | % of FMV in USDC, time-limited | third-party LPs, USDC, 85–93%, 3 days | 85% USDC, 30 min / 3 d / 7 d | 24h offer to wallet | "separate optional purchase offer" to credits |
| Cash-out | USDC | USDC | USDC | wallet | sale proceeds only, $10K/week |
| Odds | per-pack page | published | provably fair (seeds) | "disclosed" | live, changes with inventory |
| Custody / title | no legal ownership transfer | NFT = title; third-party vault | 1:1 backed | DPOC, owner keeps title | title only at shipment |
| Arbitration | JAMS, class waiver, 30-day opt-out | CeCAP Panama, opt-out | — | — | JAMS, class/PAGA waiver, opt-out |
| KYC | phone / proof of funds | — | Veriff any time | — | ID + selfie |
| Credits / points expiry | points may expire | — | — | — | promos/rewards expire |
| Chargebacks | — | — | — | — | void outcomes, reverse credits |

## What the market does (answers for the lawyer questions)
1. **Prize/lottery mitigation:** nobody relies on a single mitigation. The common stack is:
   - frame packs as the purchase of goods, at a fixed price, with item-backed contents (all five)
   - frame the buyback as a separate, optional, time-limited offer (Phygitals, LastPack, Courtyard)
   - push the buyback to a third party (Collector Crypt)
   - add an AMOE with equal odds, sweepstakes-style (Collector Crypt, Arena Club; Courtyard for giveaways only)
   - use explicit "not a lottery or wagering" language (LastPack)
2. **State blocks:** there is no consensus. The big players block only OFAC countries. The most-blocked states are NV and WA, with ID, MI and MT next. NY and FL show up for promos and raffles. Our list (WA, NV, MI, ID, MT, OK) is stricter than the market, which is fine.
3. **21+:** nobody uses it. The norm is 18+, with Phygitals adding "age of majority" (AL/NE 19, MS 21).
4. **Oklahoma:** none of the reviewed ToS name OK explicitly. Our block ahead of SB 1589 is a conservative outlier; keep it until counsel opines.
5. **Credits:** LastPack is the closest analog. It separates non-cashable purchase funds from withdrawable sale proceeds, with a weekly cap and voidable chargebacks. Courtyard says points are "not stored value" and may expire. Most others pay USDC, which counts as cash-out.
6. **Promos and referrals:** points and promos carry no cash value and can expire. Referrals get an FTC disclosure. Courtyard's giveaway AMOE gives free entry with the same odds.
7. **Custody:** three models are in use:
   - title passes only at shipment (LastPack)
   - no transfer of legal ownership (Courtyard)
   - the user keeps title in a vault (Arena, Collector Crypt)
   
   Courtyard also has an insolvency return clause.

## Gaps in our spec (now added to SPEC §18)
- AMOE / free-entry route with equal odds
- "separate optional offer" buyback framing and an expiry window
- error-void clause
- inventory-shortfall termination
- "animations entertainment only"
- title-passage clause
- insolvency return clause
- age of majority rule (AL/NE 19, MS 21)
- chargeback rule: void outcomes and claw back credits
- referral FTC disclosure
- credit expiry policy (state gift-card / escheat laws apply)
- JAMS arbitration with a 30-day opt-out
- NY/FL excluded from promos

## Questions that truly need a lawyer
1. Is a resellable slab, plus the buyback, a "prize" in our launch states? Does the "separate offer" framing hold up?
2. Do the packs themselves need an AMOE, or only the promos?
3. What is the scope of Oklahoma SB 1589, and of the new NJ, TN and LA laws?
4. If we ever allow withdrawable proceeds, does that tip us into gambling or money transmission? What about stored-value / escheat rules for credit expiry?
5. Do we need NY/FL sweepstakes registration or bonding for promos?
