import { redirect } from "next/navigation";
import { prisma, sampleCsv } from "@cdr/db";
import { AdminNav } from "@/components/admin-nav";
import { CsvForm } from "@/components/csv-form";
import { getSession } from "@/lib/session";

export default async function AdminCardsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/catalog");
  const [house, example] = await Promise.all([
    prisma.card.count({ where: { ownerType: "house", status: "available" } }),
    prisma.card.count({ where: { example: true } }),
  ]);
  return (
    <div>
      <p className="kicker">Admin</p>
      <h1>Card loader</h1>
      <AdminNav />
      <div className="grid-2">
        <div className="ticket">
          <p className="kicker">House inventory available</p>
          <p className="price">{house}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Example cards</p>
          <p className="price">{example}</p>
        </div>
      </div>
      <p className="lede">
        Dry run validates and writes nothing. Commit is one transaction: a bad row writes nothing. Images can wait until a
        card is allocated to a pack. This sample row is example inventory you can dry-run safely.
      </p>
      <CsvForm sample={sampleCsv()} />
    </div>
  );
}
