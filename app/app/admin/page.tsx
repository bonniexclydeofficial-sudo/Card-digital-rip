import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@cdr/db";
import { getSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/catalog");
  return (
    <div>
      <p className="kicker">Admin</p>
      <h1>Loader and guard</h1>
      <p className="lede">CSV intake and the pack margin guard. Every publish attempt is written to the audit log.</p>
      <div className="decision">
        <Link className="btn" href="/admin/cards">
          Card CSV
        </Link>
        <Link className="btn secondary" href="/admin/packs">
          Packs
        </Link>
      </div>
    </div>
  );
}
