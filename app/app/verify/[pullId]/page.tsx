import Link from "next/link";
import { notFound } from "next/navigation";
import { getVerification } from "@cdr/db";
import { money, oddsLabel, TIER_LABEL } from "@/lib/format";

export default async function VerifyPage({ params }: { params: Promise<{ pullId: string }> }) {
  const { pullId } = await params;
  const proof = await getVerification(pullId);
  if (!proof) notFound();
  const status = proof.revealed ? (proof.serverChecked ? "Match" : "Mismatch") : "Sealed";
  return (
    <div>
      <p className="kicker">Provably fair</p>
      <h1>Verify {proof.packName}</h1>
      <p className="lede">
        The server recomputes HMAC-SHA256 of the raw 32-byte seed over <span className="mono">{proof.message}</span>, then
        rejection-samples the tier and the slot. Before the seed is revealed, you get the commit hash and the house check.
      </p>
      <p className="lede">
        A match means the house recomputed the same tier, slot, and card from the published commit. It is a fairness check,
        not a payout.
      </p>
      <p data-testid="verify-status" className={status === "Match" ? "match-badge" : status === "Mismatch" ? "error" : "muted"}>
        {status}
      </p>
      <div className="row">
        <span>Pull</span>
        <span className="mono">{proof.pullId}</span>
      </div>
      <div className="row">
        <span>Tier</span>
        <span>{TIER_LABEL[proof.tier] ?? proof.tier}</span>
      </div>
      <div className="row">
        <span>Card</span>
        <span>
          {proof.card.subject} · {proof.card.grader} {proof.card.grade} · {proof.card.certNumber} · {money(proof.card.fmvCents)}
        </span>
      </div>
      <div className="row">
        <span>Client seed</span>
        <span className="mono">{proof.clientSeed}</span>
      </div>
      <div className="row">
        <span>Nonce</span>
        <span>{proof.nonce}</span>
      </div>
      <div className="row">
        <span>Pack version</span>
        <span>{proof.packVersion}</span>
      </div>
      <div className="row">
        <span>Roll</span>
        <span>{proof.roll}</span>
      </div>
      <div className="row">
        <span>Slot index</span>
        <span>{proof.slotIndex}</span>
      </div>
      <p className="kicker">Commit hash</p>
      <p className="hash mono">{proof.commitHash}</p>
      <p className="kicker">HMAC</p>
      <p className="hash mono">{proof.hmac}</p>
      {proof.revealed && proof.serverSeedHex ? (
        <>
          <p className="kicker">Revealed server seed</p>
          <p className="hash mono" data-testid="server-seed">
            {proof.serverSeedHex}
          </p>
          <p className="muted">
            OpenSSL checks the HMAC with the hex-decoded key:{" "}
            <span className="mono">openssl dgst -sha256 -mac HMAC -macopt hexkey:SEED</span>. The commit hash is SHA-256 of
            those raw 32 bytes, not of the hex text.
          </p>
        </>
      ) : (
        <p className="muted">The server seed stays sealed until an admin rotates it. The house check above already ran.</p>
      )}
      {!proof.serverChecked && proof.revealed ? (
        <p className="error">Mismatches: {proof.mismatches.join(", ") || "unknown"}</p>
      ) : null}
      <h2>Odds used</h2>
      {proof.odds.map((tier) => (
        <div className="row" key={tier.tier}>
          <span>{TIER_LABEL[tier.tier] ?? tier.tier}</span>
          <span>{oddsLabel(tier.oddsBps)}</span>
        </div>
      ))}
      <p>
        <Link href={`/packs/${proof.packSlug}`}>Back to {proof.packName}</Link>
      </p>
    </div>
  );
}
