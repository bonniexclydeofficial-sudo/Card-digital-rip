import { redirect } from "next/navigation";
import { evaluatePack, houseInventoryCents, prisma } from "@cdr/db";
import { PackBuilder } from "@/components/pack-builder";
import { publishAction } from "@/lib/actions";
import { money, rtpLabel } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function AdminPacksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; blocked?: string; published?: string; built?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/catalog");
  const params = await searchParams;
  const packs = await prisma.pack.findMany({
    include: { tiers: true, slots: { include: { card: true } } },
    orderBy: { priceCents: "asc" },
  });
  const cards = await prisma.card.findMany({
    where: { status: "available", ownerType: "house" },
    orderBy: { fmvCents: "asc" },
    take: 27,
  });
  const inventoryFmvCents = await houseInventoryCents();
  const evaluated = await Promise.all(
    packs.map(async (pack) => ({ pack, ...(await evaluatePack(pack)) })),
  );
  return (
    <div>
      <p className="kicker">Admin</p>
      <h1>Packs and the margin guard</h1>
      <p className="lede">
        Publish requires gross margin of at least 4% at the base-case assumptions, RTP inside 98–103%, odds that sum to
        10,000, three cards in every open tier, fresh prices, images, and liability inside house inventory.
      </p>
      {params.blocked ? <p className="error">Publish blocked. The pack stayed a draft.</p> : null}
      {params.published ? <p className="ok">Published.</p> : null}
      {params.built ? <p className="ok">Draft saved. It is not on the consumer catalog.</p> : null}
      {params.error ? <p className="error">{params.error}</p> : null}
      {evaluated.map(({ pack, validation, evCents }) => {
        return (
          <section
            key={pack.id}
            className="ticket"
            data-testid={pack.slug === "draft-thin-margin" ? "margin-guard" : undefined}
            style={{ marginBottom: 16 }}
          >
            <p className="kicker">
              {pack.status} · {pack.slug}
            </p>
            <h2>{pack.name}</h2>
            <div className="row">
              <span>Price</span>
              <span>{money(pack.priceCents)}</span>
            </div>
            <div className="row">
              <span>EV</span>
              <span>{money(Math.round(evCents))}</span>
            </div>
            <div className="row">
              <span>Gross margin</span>
              <span>{rtpLabel(validation.gm)}</span>
            </div>
            {validation.errors.length > 0 ? (
              <ul>
                {validation.errors.map((error) => (
                  <li key={`${error.code}:${error.message}`}>
                    {error.code}: {error.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ok">Clears the guard.</p>
            )}
            {pack.status === "draft" ? (
              <form action={publishAction}>
                <input type="hidden" name="packId" value={pack.id} />
                <button className="btn" type="submit">
                  Publish
                </button>
              </form>
            ) : null}
          </section>
        );
      })}
      <PackBuilder
        inventoryFmvCents={inventoryFmvCents}
        cards={cards.map((card) => ({
          id: card.id,
          subject: card.subject,
          certNumber: card.certNumber,
          fmvCents: card.fmvCents,
          fmvAt: card.fmvAt.toISOString(),
          imageFrontUrl: card.imageFrontUrl,
          imageBackUrl: card.imageBackUrl,
        }))}
      />
    </div>
  );
}
