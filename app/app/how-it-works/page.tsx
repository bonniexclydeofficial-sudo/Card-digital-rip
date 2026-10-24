import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div>
      <p className="kicker">How it works</p>
      <h1>The draw is finished before the sleeve moves.</h1>
      <p className="lede">
        A rip locks the pack and your wallet, then draws with HMAC-SHA256. The animation plays that result back. It cannot
        land on a higher tier than the one already written.
      </p>
      <h2>Commit</h2>
      <p>
        The server seed is 32 random bytes. Its SHA-256 is on the pack page before you rip. Your client seed and a nonce are
        mixed in as <span className="mono">clientSeed:nonce:packVersion</span>. The HMAC key is the raw bytes, not the hex
        text.
      </p>
      <h2>Sample</h2>
      <p>
        The first four bytes are a big-endian integer. Values in the incomplete bucket above the largest multiple of 10,000
        are thrown away, so the tier roll is uniform. The next accepted integer picks a remaining slot in that tier, in slot
        order. An empty tier pauses the pack and does not charge you.
      </p>
      <h2>Reveal</h2>
      <p>
        The sleeve, assay meter, and slab are original artwork. The meter stops on the tick for the drawn tier. Skip, or a
        reduced-motion setting, jumps straight to the slab.
      </p>
      <h2>After</h2>
      <p>
        Keep the slab in the vault or sell it back for credits. Shipping is a request. Fresh card top-ups are spendable, and
        they can place a ship hold. You can check a revealed pull on the <Link href="/verify/pull_example">verify page</Link>.
      </p>
    </div>
  );
}
