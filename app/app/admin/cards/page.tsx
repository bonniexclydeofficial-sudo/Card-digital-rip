import { redirect } from "next/navigation";
import { prisma, sampleCsv } from "@cdr/db";
import { CsvForm } from "@/components/csv-form";
import { getSession } from "@/lib/session";

export default async function AdminCardsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/catalog");
  return (
    <div>
      <p className="kicker">Admin</p>
      <h1>Card loader</h1>
      <p className="lede">
        Dry run validates and writes nothing. Commit is one transaction: a bad row writes nothing. Images can wait until a
        card is allocated to a pack. This sample row is example inventory you can dry-run safely.
      </p>
      <CsvForm sample={sampleCsv()} />
    </div>
  );
}
