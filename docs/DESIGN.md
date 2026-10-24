# Design

The consumer and admin surfaces are a dark arcade vault: deep black, cyan and gold, glass panels, an 8-point grid, Inter for text, and Syne for display. Artwork, type, and motion are original. No competitor name, mark, slab photo, or animation file is used.

## Before

The first UI was a brass-on-paper layout. Packs were flat tickets. Odds were text rows. The reveal was a sleeve, a thin meter, and a slab. Admin was the same ticket stacked down the page. It was readable and it passed the product tests. It did not feel like a place someone would rip on a phone.

## System

- Color: `#07080d` ground, `#f6f3ec` text, `#c5ced6` secondary text, `#7eebf7` action, `#e6c15a` labels. Tier colors stay distinct from common through grail.
- Type: Syne for headings and prices, Inter for body, IBM Plex Mono for seeds and CSV. Body text is 16px. Buttons are at least 44px tall.
- Space: 8 / 16 / 24 / 32 / 40. Content width 1180px.
- Surface: translucent panels, 20px radius, a soft shadow, and a grain made from a tiled radial gradient on the page background. No image filter library.
- Motion: rarity sheen on pack cards, a hologram tilt on slabs, a CSS marquee for the pull ticker, and a 5.26s reveal (640 + 2400 + 720 + 1500). `prefers-reduced-motion` cuts those animations. Focus rings are 2px cyan.

## Screens

- Home: hero, live pull ticker from real rips, pack cards with an odds peek and expected value, a whale spotlight of the highest listed fair market value, and a proof strip of pool size, published odds, the 72-hour offer, and the 2-business-day ship target.
- Pack: cinematic odds bars, Steady / Balance / Wild links to the $25 / $100 / $500 packs, a sticky rip dock with Rip x1 / x3 / x5, trust badges, and a filterable pool grid.
- Reveal: the meter still stops on the drawn tier. Common gets a spark burst. Rare and above get confetti. Sound hooks fire on the meter, the burst, and the decision unless muted. Skip and hold-to-skip jump to the slab. Afterward: keep, a separate buyback offer with a 72-hour countdown, and share. The offer is never called a win or a prize.
- Vault: hologram tilt on each slab, ship and buyback actions, and the existing hold banner.
- Verify: a short fairness explanation and a match badge. The status text stays `Match`.
- Admin: a shared nav, metric tiles, margin cards, inventory counts, and the CSV loader.

## What this is aiming past

These are product differences, not copied screens.

- Courtyard-style vending: odds, expected value, RTP, stock, and the server-seed hash are on the pack before the rip. Buyback is a separate timed offer, not a cash-out. There is no token wallet in the purchase path.
- Collector Crypt-style gacha: the reveal cannot fake a near-miss. The meter ceiling is the drawn tier. Credits are not a withdrawable coin, and the verify page recomputes the HMAC.
- Arena Club-style slab retail: the rip, the vault, and the ship request are one product. Shipping is a 2-business-day request with holds, not a marketplace listing flow.
- LastPack-style pack social: the pool is the actual remaining slabs, with rarity filters and stock counts, not a single mystery thumbnail.
- Phygitals-style redemption: fairness is a public commit plus a match badge, and the admin margin guard blocks a thin pack before it can go live.

## Performance and access

Pages stay server-rendered. The client islands are the rip buttons, the pool filter, the reveal, the CSV form, and the pack builder. Fonts are self-hosted through `next/font` with `display: swap`. The target is WCAG AA contrast on body text and a mobile Lighthouse performance score of at least 90 on the Archive pack page.
