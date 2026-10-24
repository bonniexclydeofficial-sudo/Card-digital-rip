import { redirect } from "next/navigation";
import { FLAG_STATES } from "@cdr/risk";
import { loadStateOpenFlags, prisma } from "@cdr/db";
import { AdminNav } from "@/components/admin-nav";
import { flagAction } from "@/lib/compliance-actions";
import { getSession } from "@/lib/session";

export default async function FlagsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/catalog");
  const open = await loadStateOpenFlags();
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  return (
    <div>
      <p className="kicker">Flags</p>
      <h1>State open flags</h1>
      <AdminNav />
      <p className="lede">
        Washington, Nevada, Michigan, Idaho, and Montana stay closed. Oklahoma, New Jersey, Tennessee, and Louisiana are
        off until an admin opens the flag. The $10k tier, turbo buyback, and VIP stay off until their flags are on.
      </p>
      {FLAG_STATES.map((state) => (
        <form key={state} action={flagAction} className="row">
          <input type="hidden" name="key" value={`state_open_${state}`} />
          <span>{state}</span>
          <label>
            <input type="checkbox" name="enabled" defaultChecked={open[state] === true} /> Open
          </label>
          <button className="btn secondary" type="submit">
            Save
          </button>
        </form>
      ))}
      <h2>Other flags</h2>
      <ul>
        {flags
          .filter((flag) => !flag.key.startsWith("state_open_"))
          .map((flag) => (
            <li key={flag.key}>
              {flag.key}: {flag.enabled ? "on" : "off"}
            </li>
          ))}
      </ul>
    </div>
  );
}
