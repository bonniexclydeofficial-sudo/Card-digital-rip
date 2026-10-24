export const LEGAL_DOCS = {
  terms: {
    title: "Terms of Service",
    kicker: "Draft terms",
    sections: [
      {
        heading: "Status",
        body: "DRAFT — pending counsel. This page is a working position for the product build. It is not legal advice and it is not a final customer agreement.",
      },
      {
        heading: "Packs",
        body: "Each Pack is a purchase of a physical collectible trading card selected at random from a disclosed pool at a fixed price. Every Pack delivers an Item. Packs are not games of chance, lotteries, sweepstakes, or wagers, and no cash prize is offered.",
      },
      {
        heading: "Buyback offer",
        body: "After an Item is revealed, we may make a separate offer to purchase that Item at the price displayed. The offer expires at the time shown (default 72 hours). It is not a refund, is not part of the Pack, and you are never required to accept it. Accepted offers are paid in Credits.",
      },
      {
        heading: "Eligibility",
        body: "You must be at least 18, or the age of majority in your state if that is higher (19 in Alabama and Nebraska, 21 in Mississippi). The Service is not available in Washington, Nevada, Michigan, Idaho, or Montana. Oklahoma, New Jersey, Tennessee, and Louisiana stay closed unless a per-state flag is opened. A VPN, proxy, or other location disguise can void the transaction.",
      },
      {
        heading: "Credits",
        body: "Credits are a closed-loop license to obtain Packs and Items on the Service. They have no cash value, cannot be withdrawn, are not a deposit or stored-value product, and earn no interest. Purchased Credits do not expire. Promotional Credits are tracked separately, are used first, and may expire on the date shown at issuance.",
      },
      {
        heading: "Title and shutdown",
        body: "On reveal, the Item is allocated to your account and held as bailee, segregated from house inventory. Legal title to the physical Item passes when it is shipped. If we cease operations, we will return allocated Items at your shipping cost if you claim them within 90 days of notice.",
      },
      {
        heading: "Errors, chargebacks, and animation",
        body: "We may void Pack outcomes, reverse Credits and Items, and lock an account for a chargeback or payment reversal. An obvious technical error voids the affected outcome and the purchase is returned in Credits. A Pack may close when inventory is exhausted. Reveal animations are entertainment only. The outcome is fixed at purchase by the provably fair draw.",
      },
      {
        heading: "Disputes",
        body: "Delaware law governs. You and we agree to binding individual arbitration administered by JAMS under its Streamlined Rules and the Federal Arbitration Act, except small-claims matters. You waive any right to a jury trial or to participate in a class or representative action. You may opt out within 30 days of first accepting these Terms by emailing legal@carddigitalrip.example. We cover consumer arbitration fees above $250. If 25 or more similar claims are filed, they are administered in batches.",
      },
      {
        heading: "Tax",
        body: "Sales tax is collected when Credits are spent on a card, not when Credits are purchased, where a rate is configured. You are responsible for taxes on gains from selling Items.",
      },
    ],
  },
  rules: {
    title: "Official Rules",
    kicker: "Promos only",
    sections: [
      {
        heading: "Status",
        body: "DRAFT — pending counsel. These Official Rules cover chance-based promotions. Pack purchases are retail sales of goods and do not have a free-entry route.",
      },
      {
        heading: "No purchase necessary",
        body: "NO PURCHASE NECESSARY TO ENTER OR WIN A PROMOTION. A PURCHASE WILL NOT INCREASE YOUR CHANCES OF WINNING. Free entry uses the promo form. Free entries have the same odds as every other entry. Void where prohibited, and void in New York and Florida unless a specific promotion says otherwise.",
      },
      {
        heading: "Eligibility",
        body: "Open to legal residents of eligible states who are 18 or the age of majority, whichever is greater. One account per person. Sponsor: Card Digital Rip (working name), a Delaware entity to be named by counsel.",
      },
      {
        heading: "Winner selection",
        body: "Each valid entry has weight 1. Winners are drawn from that equal-weight list. Approximate retail value is stated on the promotion. Winners above the reporting threshold may be asked for a W-9.",
      },
    ],
  },
  fairness: {
    title: "Odds and fairness",
    kicker: "Provably fair",
    sections: [
      {
        heading: "Status",
        body: "DRAFT — pending counsel. The mechanics below are the product rules. They are not a statement that any regulator has approved the model.",
      },
      {
        heading: "Published odds",
        body: "Each pack page shows the tier odds in basis points, the stock-weighted expected value, and the server-seed hash before the rip. Odds describe the current published pool. A pack can close when a tier is empty, including when a top item was never pulled.",
      },
      {
        heading: "Draw",
        body: "The outcome is HMAC-SHA256 of the raw server seed over client seed, nonce, and pack version. You can recompute it on the verify page. The reveal animation does not choose the card.",
      },
    ],
  },
  buyback: {
    title: "Buyback policy",
    kicker: "Separate purchase offer",
    sections: [
      {
        heading: "Status",
        body: "DRAFT — pending counsel. Do not describe this offer as a win, a prize, or a refund.",
      },
      {
        heading: "Offer",
        body: "After reveal we may offer to buy the Item back for Credits. The default offer lasts 72 hours. Accepting is optional. The price is floor of fair-market value times the confidence haircut times the posted rate. Low-confidence prices take a haircut. The offer can be blocked after a dispute.",
      },
      {
        heading: "Credits",
        body: "Accepted offers pay Credits only. There is no cash withdrawal at launch. Purchased Credits, including buyback Credits, do not expire. Promotional Credits are a separate balance and may expire.",
      },
    ],
  },
  privacy: {
    title: "Privacy",
    kicker: "Draft notice",
    sections: [
      {
        heading: "Status",
        body: "DRAFT — pending counsel. This notice describes what the build stores. It is not a final privacy policy.",
      },
      {
        heading: "What we store",
        body: "Account email, username, password hash, date of birth, state, optional billing state, client seed, and wallet ledger entries. Rip requests log the state we checked. Payment adapters in this build do not send a live card number anywhere. KYC sandbox sessions do not upload identity documents.",
      },
      {
        heading: "Location",
        body: "A rip checks the account state, the request geo header, the IP-state header, and the billing state when they are present. A VPN header can block the rip. Production IP intelligence is not wired; the hook is ready for a vendor.",
      },
      {
        heading: "Sharing",
        body: "We do not sell personal information in this build. Processors, the vault partner, and the shipper receive only what a live integration needs, and those integrations are test adapters until counsel and the vendors are signed.",
      },
    ],
  },
  responsible: {
    title: "Responsible play",
    kicker: "Limits",
    sections: [
      {
        heading: "Status",
        body: "DRAFT — pending counsel. These controls are product settings, not a clinical program.",
      },
      {
        heading: "Spend limit",
        body: "A daily spend limit defaults to $500. Lowering it applies immediately. Raising it waits 24 hours.",
      },
      {
        heading: "Cool-off and self-exclusion",
        body: "A cool-off blocks rips until the time you set, and the account stays open. Self-exclusion blocks the account. Reality checks are available after 60 minutes in a session.",
      },
      {
        heading: "Credits",
        body: "Credits cannot be withdrawn as cash. Purchased Credits do not expire. Promotional Credits may expire and are spent first.",
      },
    ],
  },
} as const;

export type LegalSlug = keyof typeof LEGAL_DOCS;
