import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buybackCreditCents } from "@cdr/econ";
import { getPullForOwner, prisma } from "@cdr/db";
import { RevealStage } from "@/components/reveal";
import { getSession } from "@/lib/session";

export default async function RipPage({ params }: { params: Promise<{ pullId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { pullId } = await params;
  const pull = await getPullForOwner(pullId, session.uid);
  if (!pull) notFound();
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  const quote =
    pull.vault?.status === "held"
      ? buybackCreditCents(pull.card.fmvCents, pull.card.priceConfidence)
      : null;
  return (
    <div>
      <p className="kicker">Reveal</p>
      <h1>{pull.packName}</h1>
      <RevealStage
        pull={{
          id: pull.id,
          tierIndex: pull.tierIndex,
          isGrail: pull.isGrail,
          skip: user?.skipAnimation ?? false,
          packName: pull.packName,
          subject: pull.card.subject,
          grader: pull.card.grader,
          grade: pull.card.grade,
          certNumber: pull.card.certNumber,
          year: pull.card.year,
          setName: pull.card.setName,
          fmvCents: pull.card.fmvCents,
          vaultItemId: pull.vault?.id ?? null,
          creditCents: quote?.creditCents ?? null,
          vaultStatus: pull.vault?.status ?? null,
          haptics: user?.haptics ?? false,
          muteSound: user?.muteSound ?? false,
          pulledAt: pull.at,
        }}
      />
      <p className="muted">
        Pull <span className="mono">{pull.id}</span>.{" "}
        <Link href={`/verify/${pull.id}`}>Verification</Link> opens the house check now, and the raw seed after rotation.
      </p>
    </div>
  );
}
