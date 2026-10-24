import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, type LegalSlug } from "@/lib/legal";

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!(doc in LEGAL_DOCS)) notFound();
  const page = LEGAL_DOCS[doc as LegalSlug];
  return (
    <article>
      <p className="banner" data-testid="legal-draft">
        DRAFT — pending counsel. Not legal advice. Do not take real money against this text.
      </p>
      <p className="kicker">{page.kicker}</p>
      <h1>{page.title}</h1>
      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <p className="muted">
        <Link href="/legal/terms">Terms</Link> · <Link href="/legal/rules">Official Rules</Link> ·{" "}
        <Link href="/legal/fairness">Odds and fairness</Link> · <Link href="/legal/buyback">Buyback</Link> ·{" "}
        <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/responsible">Responsible play</Link>
      </p>
    </article>
  );
}
