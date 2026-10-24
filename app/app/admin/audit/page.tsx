import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { prisma, recentAudits } from "@cdr/db";
import { getSession } from "@/lib/session";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/catalog");
  const rows = await recentAudits(80);
  return (
    <div>
      <p className="kicker">Audit</p>
      <h1>Admin audit</h1>
      <AdminNav />
      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Id</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.at.toISOString()}</td>
              <td>{row.action}</td>
              <td>{row.entity}</td>
              <td className="mono">{row.entityId}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
