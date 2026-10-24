import Link from "next/link";
import { redirect } from "next/navigation";
import { buybackCreditCents } from "@cdr/econ";
import { prisma } from "@cdr/db";
import { Slab } from "@/components/slab";
import { buybackAction, shipAction } from "@/lib/actions";
import { money } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; bought?: string; ship?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const items = await prisma.vaultItem.findMany({
    where: { userId: session.uid },
    include: { card: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <p className="kicker">Vault</p>
      <h1>Your slabs</h1>
      <p className="lede">
        Buyback pays credits at 90% of fair market value, with a haircut when price confidence is low. Shipping is a request
        only. Fresh card funds can rip, and they can sit on a ship hold until the hold ends or KYC passes.
      </p>
      {params.bought ? <p className="ok">Bought back for {money(Number(params.bought))} in credits.</p> : null}
      {params.ship ? <p className="ok">Shipment recorded as {params.ship}.</p> : null}
      {params.error ? <p className="error">{params.error}</p> : null}
      {items.length === 0 ? (
        <section className="state-panel" data-testid="vault-empty">
          <p className="kicker">Empty vault</p>
          <h2>Nothing is sitting here yet.</h2>
          <p>Rip a pack and keep the slab. It lands here with a credits buyback and a ship request.</p>
          <Link className="btn" href="/catalog">
            See the packs
          </Link>
        </section>
      ) : null}
      <div className="grid-3">
        {items.map((item) => {
          const quote = buybackCreditCents(item.card.fmvCents, item.card.priceConfidence);
          const held = item.shipHoldUntil && item.shipHoldUntil > new Date();
          return (
            <article key={item.id} className="ticket">
              <div className="holo">
                <Slab
                  cert={item.card.certNumber}
                  subject={item.card.subject}
                  grade={item.card.grade.toString()}
                  grader={item.card.grader}
                  year={item.card.year}
                  setName={item.card.setName}
                  category={item.card.category}
                />
              </div>
              <h2>{item.card.subject}</h2>
              <p className="muted">
                {item.card.grader} {item.card.grade.toString()} · {item.card.certNumber}
              </p>
              <div className="row">
                <span>FMV</span>
                <span>{money(item.card.fmvCents)}</span>
              </div>
              <div className="row">
                <span>Status</span>
                <span>{item.status}</span>
              </div>
              {held ? (
                <p className="hold" data-testid="ship-hold">
                  <strong>Ship hold.</strong> Fresh card funds stay here until {item.shipHoldUntil?.toISOString().slice(0, 10)}{" "}
                  or KYC passes. Buyback still pays credits. Shipping is a request, not a cash-out.
                </p>
              ) : null}
              {item.status === "held" ? (
                <div className="decision">
                  <form action={buybackAction}>
                    <input type="hidden" name="vaultItemId" value={item.id} />
                    <button className="btn" type="submit" disabled={item.buybackBlocked}>
                      Buy back {money(quote.creditCents)}
                    </button>
                  </form>
                  <form action={shipAction}>
                    <input type="hidden" name="vaultItemId" value={item.id} />
                    <button className="btn secondary" type="submit">
                      Request shipping
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
