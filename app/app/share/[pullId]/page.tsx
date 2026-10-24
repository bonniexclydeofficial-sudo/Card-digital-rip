import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@cdr/db";
import { ShareActions } from "@/components/share-actions";
import { Slab } from "@/components/slab";
import { money, TIER_LABEL } from "@/lib/format";

async function loadShare(pullId: string) {
  const pull = await prisma.pull.findUnique({
    where: { id: pullId },
    include: { card: true, pack: { select: { name: true, slug: true } } },
  });
  if (!pull || pull.voided) return null;
  return pull;
}

export async function generateMetadata({ params }: { params: Promise<{ pullId: string }> }): Promise<Metadata> {
  const { pullId } = await params;
  const pull = await loadShare(pullId);
  if (!pull) return { title: "Share a pull · Card Digital Rip" };
  const title = `${pull.card.subject} · ${pull.pack.name}`;
  const description = `Example slab. ${pull.card.grader} ${pull.card.grade.toString()}. Fair market ${money(pull.card.fmvCents)}. Verify the pull. Marked EXAMPLE.`;
  return { title, description, openGraph: { title, description } };
}

export default async function SharePage({ params }: { params: Promise<{ pullId: string }> }) {
  const { pullId } = await params;
  const pull = await loadShare(pullId);
  if (!pull) notFound();
  const tier = TIER_LABEL[pull.tier] ?? pull.tier;
  return (
    <div>
      <p className="kicker">Share a pull</p>
      <h1>{pull.card.subject}</h1>
      <p className="lede">
        A public card for this rip. It shows the slab, the pack, and the fair market value. It does not show an account.
        The art is marked EXAMPLE.
      </p>
      <article className="ticket share-card" data-testid="share-card">
        <div className="holo">
          <Slab
            cert={pull.card.certNumber}
            subject={pull.card.subject}
            grade={pull.card.grade.toString()}
            grader={pull.card.grader}
            year={pull.card.year}
            setName={pull.card.setName}
            category={pull.card.category}
          />
        </div>
        <p className={`kicker tier-${pull.tier}`}>{tier}</p>
        <h2>{pull.card.subject}</h2>
        <p className="price">{money(pull.card.fmvCents)}</p>
        <p className="muted">
          {pull.card.grader} {pull.card.grade.toString()} · {pull.pack.name} · EXAMPLE · not a photograph
        </p>
        <ShareActions pullId={pull.id} subject={pull.card.subject} />
        <p>
          <Link href={`/packs/${pull.pack.slug}`}>Open {pull.pack.name}</Link>
        </p>
      </article>
    </div>
  );
}
