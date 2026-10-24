import { redirect } from "next/navigation";
import { dashboardMetrics, prisma, recentAudits } from "@cdr/db";
import { AdminNav } from "@/components/admin-nav";
import { money } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/catalog");
  const metrics = await dashboardMetrics();
  const audits = await recentAudits(8);
  return (
    <div>
      <p className="kicker">Admin</p>
      <h1>Operations</h1>
      <p className="lede">Test-mode payments, margin guard, and the audit log. No card is charged from this dashboard.</p>
      <AdminNav />
      <div className="grid-3">
        <div className="ticket">
          <p className="kicker">Accounts</p>
          <p className="price">{metrics.users}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Rips today</p>
          <p className="price">{metrics.pullsToday}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Gross rip volume</p>
          <p className="price">{money(metrics.gmvCents)}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Live packs</p>
          <p className="price">{metrics.livePacks}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Disputes</p>
          <p className="price">{metrics.disputes}</p>
        </div>
        <div className="ticket">
          <p className="kicker">Reserve still held</p>
          <p className="price">{money(metrics.reserveCents)}</p>
        </div>
      </div>
      <h2>Recent audit</h2>
      <div className="table-scroll">
      <table>
        <tbody>
          {audits.map((row) => (
            <tr key={row.id}>
              <td>{row.at.toISOString()}</td>
              <td>{row.action}</td>
              <td>{row.entity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
