import { redirect } from "next/navigation";
import { prisma } from "@cdr/db";
import { amoeAction, referralAction, referralCodeAction } from "@/lib/compliance-actions";
import { US_STATES } from "@/lib/states";
import { getSession } from "@/lib/session";

export default async function PromosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; entered?: string; referred?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) redirect("/login");
  return (
    <div>
      <p className="banner" data-testid="legal-draft">
        DRAFT — pending counsel. Promos are void in New York and Florida.
      </p>
      <p className="kicker">Promos</p>
      <h1>Free entry has the same odds.</h1>
      <p className="lede">
        NO PURCHASE NECESSARY. A purchase will not increase your chances. Referral rewards are promotional credits with no
        cash value. If you share a code, disclose that you may receive a reward.
      </p>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.entered ? <p className="ok">Free entry recorded at weight 1.</p> : null}
      {params.referred ? <p className="ok">Referral promotional credits posted.</p> : null}
      <h2>Alternate method of entry</h2>
      <form action={amoeAction} className="form">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={user.email} required />
        <label htmlFor="state">State</label>
        <select id="state" name="state" defaultValue={user.state}>
          {US_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Enter free
        </button>
      </form>
      <h2>Referral</h2>
      <p className="muted">Your code: {user.referralCode ?? "Not issued yet."}</p>
      <form action={referralCodeAction}>
        <button className="btn secondary" type="submit">
          Issue my code
        </button>
      </form>
      <form action={referralAction} className="form">
        <label htmlFor="code">Someone else’s code</label>
        <input id="code" name="code" required />
        <label>
          <input type="checkbox" name="disclosed" /> I will disclose that I may receive a promotional-credit reward.
        </label>
        <button className="btn" type="submit">
          Claim referral
        </button>
      </form>
    </div>
  );
}
