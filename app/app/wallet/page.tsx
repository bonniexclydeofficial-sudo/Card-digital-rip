import { redirect } from "next/navigation";
import { walletView } from "@cdr/db";
import { topupAction } from "@/lib/actions";
import { money } from "@/lib/format";
import { getSession } from "@/lib/session";

const AMOUNTS = [500, 2500, 10_000, 50_000];

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; topped?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const view = await walletView(session.uid);
  const wallet = view.wallet;
  return (
    <div>
      <p className="kicker">Wallet</p>
      <h1>Credits</h1>
      <p className="lede">
        Top-ups are recorded by the stub provider. No card is charged. New card credits can be spent on rips immediately, and
        they carry a funding hold that blocks a clean ship until the hold ends or KYC passes. Credits cannot be withdrawn
        as cash. Purchased credits do not expire. Promotional credits are a separate balance and may expire. Sales tax,
        when a rate is configured, applies when credits are spent on a card and not when credits are purchased.
      </p>
      {params.topped ? <p className="ok">Stub top-up recorded. Available balance updated. Nothing was charged.</p> : null}
      {params.error ? (
        <section className="state-panel" data-testid="topup-declined">
          <p className="kicker">Top-up declined</p>
          <p>{params.error}</p>
          <p className="muted">The stub provider recorded nothing. No card was charged. The available balance is unchanged.</p>
        </section>
      ) : null}
      <div className="grid-3">
        <div className="ticket">
          <p className="kicker">Available</p>
          <p className="price">{money(wallet?.availableCents ?? 0)}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Card funds on hold</p>
          <p className="price">{money(wallet?.heldCardCents ?? 0)}</p>
          <p className="muted">
            {wallet?.fundingHoldUntil ? `Hold until ${wallet.fundingHoldUntil.toISOString()}` : "No active funding hold."}
          </p>
        </div>
        <div className="ticket">
          <p className="kicker">Buyback credits in balance</p>
          <p className="price">{money(wallet?.buybackCents ?? 0)}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Promotional credits</p>
          <p className="price">{money(wallet?.promoCents ?? 0)}</p>
          <p className="muted">Spent first. May expire. No cash value.</p>
        </div>
      </div>
      <h2>Add credits</h2>
      <div className="decision">
        {AMOUNTS.map((amount) => (
          <form key={amount} action={topupAction}>
            <input type="hidden" name="amountCents" value={amount} />
            <button className="btn secondary" type="submit">
              Stub {money(amount)}
            </button>
          </form>
        ))}
      </div>
      <h2>Ledger</h2>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Direction</th>
            <th>Amount</th>
            <th>Source</th>
            <th>Ref</th>
          </tr>
        </thead>
        <tbody>
          {view.entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.at.toISOString()}</td>
              <td>{entry.direction}</td>
              <td>{money(entry.amountCents)}</td>
              <td>{entry.fundingSource}</td>
              <td>
                {entry.refType}:{entry.refId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
