import Link from "next/link";
import { loginAction } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div>
      <p className="kicker">Account</p>
      <h1>Sign in</h1>
      <p className="lede">Demo ripper: ada@example.com / rip-demo. Demo admin: admin@example.com / admin-demo.</p>
      <form action={loginAction} className="form">
        {params.error ? <p className="error">{params.error}</p> : null}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <div className="decision">
          <button className="btn" type="submit">
            Sign in
          </button>
        </div>
      </form>
      <p className="muted">
        New here? <Link href="/signup">Open an account</Link>
      </p>
    </div>
  );
}
