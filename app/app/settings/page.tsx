import { redirect } from "next/navigation";
import { prisma } from "@cdr/db";
import { coolOffAction, excludeAction, kycAction, spendLimitAction } from "@/lib/compliance-actions";
import { rotateAction, settingsAction } from "@/lib/actions";
import { getSession } from "@/lib/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; rotated?: string; kyc?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) redirect("/login");
  const active = await prisma.serverSeed.findFirst({ where: { active: true } });
  return (
    <div>
      <p className="kicker">Settings</p>
      <h1>Your seeds</h1>
      <p className="lede">
        The client seed is mixed into every draw. Changing it affects the next rip, not the last one. Skip animation jumps the
        reveal to the slab. The outcome is already written.
      </p>
      {params.saved ? <p className="ok">Saved.</p> : null}
      {params.rotated ? <p className="ok">Server seed rotated. The previous seed is now public on its pulls.</p> : null}
      {params.error ? <p className="error">{params.error}</p> : null}
      <form action={settingsAction} className="form">
        <label htmlFor="clientSeed">Client seed</label>
        <input id="clientSeed" name="clientSeed" defaultValue={user.clientSeed} required />
        <label>
          <input type="checkbox" name="skipAnimation" defaultChecked={user.skipAnimation} /> Skip the reveal animation
        </label>
        <label>
          <input type="checkbox" name="haptics" defaultChecked={user.haptics} /> Haptics on mobile
        </label>
        <label>
          <input type="checkbox" name="muteSound" defaultChecked={user.muteSound} /> Mute reveal sound
        </label>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
      <h2>Active server seed</h2>
      <p className="hash mono">{active?.hash ?? "No active seed."}</p>
      {user.role === "admin" ? (
        <form action={rotateAction}>
          <button className="btn secondary" type="submit">
            Rotate and reveal
          </button>
        </form>
      ) : (
        <p className="muted">An admin rotates the server seed. Until then, verify shows the hash and the house check.</p>
      )}
      <h2>Responsible play</h2>
      <p className="muted">
        Purchased credits do not expire and cannot be withdrawn. A lower spend limit applies now. A higher one waits 24 hours.
      </p>
      <form action={spendLimitAction} className="form">
        <label htmlFor="dollars">Daily spend limit (dollars)</label>
        <input id="dollars" name="dollars" type="number" min={0} step={1} defaultValue={user.spendLimitCents / 100} />
        <button className="btn secondary" type="submit">
          Update spend limit
        </button>
      </form>
      <form action={coolOffAction} className="form">
        <label htmlFor="hours">Cool-off hours</label>
        <input id="hours" name="hours" type="number" min={1} max={2160} defaultValue={24} />
        <button className="btn secondary" type="submit">
          Start cool-off
        </button>
      </form>
      <form action={excludeAction}>
        <button className="btn danger" type="submit">
          Self-exclude
        </button>
      </form>
      <form action={kycAction}>
        <button className="btn secondary" type="submit">
          Start sandbox identity check
        </button>
      </form>
      {params.kyc ? <p className="muted">Sandbox inquiry: {params.kyc}</p> : null}
    </div>
  );
}
