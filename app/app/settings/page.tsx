import { redirect } from "next/navigation";
import { prisma } from "@cdr/db";
import { rotateAction, settingsAction } from "@/lib/actions";
import { getSession } from "@/lib/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; rotated?: string }>;
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
    </div>
  );
}
