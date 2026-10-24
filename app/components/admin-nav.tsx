import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin">
      <Link href="/admin">Overview</Link>
      <Link href="/admin/packs">Margins</Link>
      <Link href="/admin/cards">Inventory CSV</Link>
      <Link href="/admin/flags">Flags</Link>
      <Link href="/admin/audit">Audit</Link>
    </nav>
  );
}
