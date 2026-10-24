import Link from "next/link";
import { Mark } from "@/components/mark";
import { RealityCheck } from "@/components/reality-check";
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
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link href="/" className="brand">
          <Mark />
          <span>Card Digital Rip</span>
        </Link>
        <details className="menu">
          <summary className="nav-toggle">Menu</summary>
          <nav className="nav" aria-label="Primary">
            <Link href="/catalog">Packs</Link>
            <Link href="/odds">Odds</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/verify/pull_example">Verify</Link>
            {viewer ? (
              <>
                <Link href="/vault">Vault</Link>
                <Link href="/wallet">Wallet</Link>
                <Link href="/settings">Settings</Link>
                <Link href="/promos">Promos</Link>
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
        </details>
      </header>
      <main id="main" className="main">
        <RealityCheck />
        {children}
      </main>
      <footer className="footer">
        <span>Example inventory. Generative slabs. Credits stay in the wallet.</span>
        <span>
          <Link href="/legal/terms">Terms</Link> · <Link href="/legal/rules">Official Rules</Link> ·{" "}
          <Link href="/legal/fairness">Odds</Link> · <Link href="/legal/buyback">Buyback</Link> ·{" "}
          <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/responsible">Responsible play</Link>
        </span>
        <span>Test-mode payments. No card is charged.</span>
      </footer>
    </div>
  );
}
