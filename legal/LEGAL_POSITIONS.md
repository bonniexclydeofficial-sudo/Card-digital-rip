# Legal Positions: Card Digital Rip (working draft, 2026-10-24)
> **MARKET-BASED WORKING POSITION. NOT LEGAL ADVICE.** This is drafted from the public terms of competing platforms (see TOS_TEARDOWN.md and tos/*.md) to guide the build. It is not an opinion of licensed counsel. Do not take real money until the sign-off list at the end is cleared.

Quote sources:
- CY = Courtyard: https://docs.courtyard.io/courtyard/logistics-and-legal/user-agreements/terms-of-service
- CC = Collector Crypt: https://collectorcrypt.com/terms-of-service
- PH = Phygitals: https://docs.phygitals.com
- AC = Arena Club: https://info.arenaclub.com/tos and https://info.arenaclub.com/npn
- LP = LastPack: https://lastpack.com/terms

---
## 1. Prize/lottery, and the separate-offer buyback
**Position:** A pack is a retail sale of goods with randomized contents. Every pack delivers a real card that is backed 1:1, and the expected value is close to the price. The buyback is a separate, optional, time-limited purchase offer made after the reveal. It is never presented as a "win," a cash prize, or a refund. We avoid casino language ("bet," "win," "jackpot," "odds to win cash").

**Support:**
- LP: "does not offer casino games, sports betting, lotteries, or wagering. Packs assign collectible Items, not cash prizes. Any buyback ... separate optional purchase offer."
- PH: "purchases of digital goods with randomized contents, analogous to purchasing sealed physical trading card products ... backed 1:1"; buyback "is not a refund - it is a separate, voluntary transaction."
- CY: "Random Card Purchase ... for a fixed price."

**Residual risk:** MED-HIGH. A resellable card plus an instant buyback is the core risk element. The risk is higher if the buyback pays cash or USDC; ours pays credits.

**Clause:**
> 4.1 Packs. Each Pack is a purchase of a physical collectible trading card ("Item") selected at random from a disclosed pool at a fixed price. Every Pack delivers an Item. Packs are not games of chance, lotteries, sweepstakes, or wagers, and no cash prize is offered.
> 4.2 Buyback Offer. After an Item is revealed, we may, at our option, make a separate offer to purchase that Item from you ("Buyback Offer") at the price displayed. The offer expires at the time shown (default 72 hours). It is not a refund, is not part of the Pack, and you are never required to accept it. Accepted Buyback Offers are paid in Credits (Section 6).

## 2. AMOE: packs vs. promos
**Position:**
- **Packs:** no free entry route. Adding one to packs would turn packs into a sweepstakes we'd have to administer as one, which conflicts with the "goods" framing. LP and CY packs have no free entry route; CY uses one only for giveaways.
- **Promos and giveaways:** every promo with a chance element gets a free entry route with equal odds and equal dignity.
- **Fallback if counsel requires it:** a pack-level free entry route of one free pack request per 30 days by mail or web form, with identical odds, as CC and AC do.

**Support:**
- CC §5.8: "no purchase ... necessary to enter or win and any purchase will not increase your chances," AMOE "equal dignity and identical odds."
- AC: a "No Purchase Necessary" sweepstakes (/npn).
- CY §25: free daily claim with "same odds."

**Residual risk:** MED. Packs without a free entry route depend entirely on the §1 framing.

**Clause (promos):**
> NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE WILL NOT INCREASE YOUR CHANCES OF WINNING. Free entry: [web form / mail-in] at [URL/address], limit [1]/[day]; free entries have the same odds as all other entries. Void where prohibited. Open to legal residents of eligible states, 18+ (or the age of majority if higher).

## 3. State block list and age
**Position:**
- **Block at launch:** WA, NV, MI, ID, MT, OK. This is stricter than the market, where NV and WA are the most-blocked states and the biggest players block only sanctioned countries.
- **Promos:** additionally exclude NY and FL (as CY does) until they're registered (§7).
- **Age:** 18, or the state's age of majority if higher (AL and NE 19, MS 21). No 21+ requirement, since no competitor uses one.
- **Controls:**
  - check location at every rip using IP, geolocation and billing state
  - ban VPNs
  - verify ID through a KYC vendor at thresholds or before any withdrawal of value
  - one account per person

**Support:**
- PH: "18 ... or the age of majority ... whichever is greater"; VPN ban; Veriff KYC "at any time."
- LP: 18+, government ID, one account, Nevada blocked in-app.
- CY: raffles void in NY and FL.

**Residual risk:** LOW-MED.

**Clause:**
> 2.1 Eligibility. You must be at least 18 years old or the age of majority in your state of residence, whichever is greater, and physically located in an Eligible State when using the Service. The Service is not available in: Washington, Nevada, Michigan, Idaho, Montana, Oklahoma, or any jurisdiction subject to U.S. sanctions, and we may update this list at any time. Using a VPN, proxy, or other means to disguise your location is prohibited and may result in voided transactions and account termination. We may require identity verification at any time.

## 4. Oklahoma SB 1589, and the NJ / TN / LA laws
**Position:**
- **Oklahoma:** block OK before SB 1589 takes effect (2026-11-01 per our tracking; verify). Stay blocked until counsel confirms the statute doesn't reach item-backed packs.
- **NJ, TN, LA:** launch only after a state-by-state review, and keep each state on a config flag that can be switched instantly. Default for these three: block at launch, then open them only on counsel's sign-off.

**Support:** none of the competitor terms name OK, so our approach is conservative and has no direct precedent.

**Residual risk:** LOW if blocked; HIGH if open without review.

**Clause:** covered by the §3 state list, plus:
> We may add jurisdictions to the restricted list with immediate effect where required by law; any unrevealed Packs purchased from a newly restricted jurisdiction will be refunded in Credits or original payment method at our discretion.

## 5. Credits, stored value, unclaimed property, money transmission
**Position:**
- Credits are a closed-loop license used only to buy packs and items on our platform.
- They can't be cashed out or transferred, and they earn no interest.
- Paid-in credits never expire, which avoids conflicts with gift-card and unclaimed-property laws.
- Promotional credits (bonuses and referrals) have no cash value and may expire after notice.
- Paid and promotional credits are tracked in separate ledgers, and we spend promotional credits first.
- **Stored value / money transmission:** a closed-loop system with no cash-out is generally not money transmission. Confirm per state.
- **Unclaimed property:** paid credits can create liability. Track dormancy and report as counsel advises.

**Support:**
- CY: Points have "no monetary value, are not redeemable for cash, and do not constitute stored value"; "may expire or be forfeited."
- LP: Purchase Funds can't be cashed out; promos and rewards can expire.

**Residual risk:** MED. The main exposures are unclaimed-property law on paid balances and how states classify closed-loop value.

**Clause:**
> 6.1 Credits are a limited, revocable, non-transferable license to obtain Packs and Items on the Service. Credits have no cash value, are not redeemable for cash, are not a deposit, bank account, or stored-value product, and earn no interest. Purchased Credits do not expire. Promotional Credits are identified as such, have no cash value, are used before Purchased Credits, and may expire on the date shown at issuance. We may reverse Credits obtained through error, fraud, or chargeback.

## 6. Withdrawals
**Position:**
- **At launch:** no cash withdrawals. The only ways to take value out are shipping the physical card or selling it on our marketplace for credits.
- **Phase 2, only if counsel approves:** follow LP's model.
  - Only proceeds from marketplace sales to other users can be withdrawn, never purchase funds or buyback credits.
  - A weekly cap of $10K.
  - KYC plus a live selfie before payout.
  - Payouts through a licensed payout provider.

**Support:**
- LP: only "Eligible Sale Proceeds" can be withdrawn, $10K per 7 days, with KYC before cash-out.
- CY, PH and CC pay buybacks in USDC. That is a riskier model, and we won't copy it.

**Residual risk:** LOW while there are no withdrawals; HIGH if buyback value can be cashed out.

**Clause:**
> 6.2 Credits cannot be withdrawn. You may request shipment of any Item you own (fees apply). [Phase 2: Only Eligible Sale Proceeds from completed peer marketplace sales may be withdrawn, subject to identity verification, a limit of $10,000 per rolling 7 days, and our payout partner's terms.]

## 7. Promos and sweepstakes registration (NY / FL)
**Position:**
- Exclude NY and FL residents from chance-based promos unless the total prize value is $5,000 or less in each state. Above that, register and bond. NY and FL require registration and bonding over $5K (verify current thresholds).
- RI is a legacy jurisdiction to check as well.
- Every promo gets Official Rules that cover: sponsor, eligibility, entry period, free entry route, ARV of each prize, odds, how winners are chosen, taxes, privacy, and void-where-prohibited.
- Referrals use promotional credits only, carry an FTC material-connection disclosure, and can't be self-referred.

**Support:**
- CY raffles: void in NY and FL; points from referrals; §25 promotion governing law.
- LP: referrals with an FTC disclosure and no cash value.

**Residual risk:** LOW-MED.

**Clause:**
> Promotions are void in New York and Florida and where prohibited, unless the Official Rules for that Promotion state otherwise. Referral rewards are Promotional Credits, have no cash value, and may not be earned by referring yourself or duplicate accounts. If you share a referral link, you must disclose that you may receive a reward.

## 8. Custody, title, insolvency
**Position:**
- Items are held in a third-party or partner insured vault, under a bailment for the user once revealed.
- The user owns the revealed item, and we act as custodian. This is clearer than CY's "no legal ownership transfer."
- Ownership of physical goods passes when the item is shipped or delivered. While vaulted, the user holds a custodial right and can ship, sell or accept a buyback.
- Storage is free for [12] months, after which a storage fee applies. No forced sellback (unlike LP's 5-day auto-sell).
- The vault keeps user items segregated from our own inventory.
- If we go insolvent, items are returned at the user's shipping cost, with a 90-day claim window.

**Support:**
- AC: "does not take ownership of cards"; CC: third-party vault.
- CY: insolvency "procedures to ensure the return of physical assets ... within three months."
- LP §4.2: title passes at shipment.

**Residual risk:** MED. Pick one title model and keep the supply agreement consistent with it.

**Clause:**
> 8.1 Upon reveal, the Item is allocated to your account and held by us or our vault partner as bailee on your behalf, segregated from our inventory. Legal title to the physical Item passes to you upon shipment. 8.2 If we cease operations or become insolvent, we will notify you and return allocated Items upon your request and payment of shipping and taxes, provided you request return within 90 days of notice.

## 9. Arbitration
**Position:**
- Individual JAMS arbitration under the FAA, with a class and representative action waiver.
- Small-claims carve-out.
- A 30-day opt-out.
- Batch-arbitration (mass-arbitration) protocol.
- Delaware law.
- We pay the consumer's filing fees above $250.

**Support:**
- CY: JAMS, FAA, class waiver, 30-day opt-out.
- LP: JAMS, class/PAGA waiver, opt-out.

**Residual risk:** LOW-MED. Enforceability depends on how the user assents (clickwrap at signup and at first purchase).

**Clause:**
> 15.1 You and we agree to resolve disputes by binding individual arbitration administered by JAMS under its Streamlined Rules and the Federal Arbitration Act, except small-claims matters. YOU WAIVE ANY RIGHT TO A JURY TRIAL OR TO PARTICIPATE IN A CLASS OR REPRESENTATIVE ACTION. You may opt out within 30 days of first accepting these Terms by emailing [legal@]. If 25+ similar claims are filed, they will be administered in batches.

## 10. Tax
**Position:**
- **Sales tax:** collected when credits are spent on items, not when credits are bought, because the taxable event is the sale of goods. Physical cards are generally taxable tangible property. A CPA confirms sourcing (ship-to vs. buyer address) and economic nexus.
- **Breakage:** income is recognized only for expired promotional credits (ASC 606). Paid credits are a liability.
- **Prizes:** promo winners above $600 ARV get a W-9 and a 1099-MISC.
- **Marketplace sellers:** 1099-K at federal thresholds if withdrawals are enabled.

**Support:** competitor terms are silent on tax beyond "user responsible for taxes."

**Residual risk:** MED (nexus).

**Clause:**
> Prices exclude applicable taxes, which we collect where required. You are responsible for any taxes on gains from selling Items. Prize winners may be required to submit tax forms and will receive a 1099 where required.

## 11. Chargebacks, errors, inventory (supporting clauses)
> We may void Pack outcomes, reverse Credits and Items, and offset balances for chargebacks, fraud, or payment reversal. Obvious technical errors (mispriced Packs, incorrect pools, display faults) void affected outcomes and we will refund the purchase price. A Pack may be closed when inventory is exhausted even if top Items were not pulled; published odds reflect the current pool. Reveal animations are entertainment only; outcomes are determined at purchase by our provably fair system.

(Sources: LP chargeback, error-void, and "entertainment only" clauses; AC "can be terminated even if the grail(s) have not been distributed.")

---
## Must be signed off by a licensed lawyer before taking real money
1. Gambling analysis of §1 (prize, chance, consideration) for every state we open, and specifically the buyback structure.
2. Packs without a free entry route vs. the §2 fallback.
3. Final state list, including the scope of OK SB 1589, NJ, TN and LA.
4. Credits: money-transmission, stored-value and unclaimed-property treatment (§5).
5. Any withdrawal feature (§6).
6. Promo rules and NY/FL registration thresholds (§7).
7. Bailment and title model, and the supply/custody agreement (§8).
8. The final ToS, the arbitration assent flow (§9), and the privacy policy.
9. CPA sign-off on sales-tax nexus and breakage (§10).
