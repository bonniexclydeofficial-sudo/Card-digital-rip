import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { money } from "@/lib/format";

export interface Viewer {
  email: string;
  role: string;
  availableCents: number;
}

export function Shell({ viewer, children }: { viewer: Viewer | null; children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="mark">R</span>
          Card Digital Rip
        </Link>
        <nav className="nav">
          <Link href="/catalog">Packs</Link>
          <Link href="/odds">Odds</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/verify/pull_example">Verify</Link>
          {viewer ? (
            <>
              <Link href="/vault">Vault</Link>
              <Link href="/wallet">Wallet</Link>
              <Link href="/settings">Settings</Link>
              {viewer.role === "admin" ? <Link href="/admin">Admin</Link> : null}
              <span className="balance">{money(viewer.availableCents)}</span>
              <form action={logoutAction}>
                <button className="btn secondary" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/signup" className="btn">
                Open an account
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <span>Example inventory. Generative slabs. Credits stay in the wallet.</span>
        <span>Payments are stubbed. No card is charged.</span>
      </footer>
    </div>
  );
}
