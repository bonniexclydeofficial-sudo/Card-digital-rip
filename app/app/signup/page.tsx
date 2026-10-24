import Link from "next/link";
import { signupAction } from "@/lib/actions";
import { US_STATES } from "@/lib/states";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div>
      <p className="kicker">Account</p>
      <h1>Open an account</h1>
      <p className="lede">You need to be 18, and the account state cannot be on the blocked list. Both checks are logged.</p>
      <form action={signupAction} className="form">
        {params.error ? <p className="error">{params.error}</p> : null}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <label htmlFor="dob">Date of birth</label>
        <input id="dob" name="dob" type="date" required />
        <label htmlFor="state">State</label>
        <select id="state" name="state" required defaultValue="CA">
          {US_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <label>
          <input id="terms" name="terms" type="checkbox" required /> I agree to the draft Terms, including Delaware law and
          individual JAMS arbitration, and I can opt out within 30 days.
        </label>
        <div className="decision">
          <button className="btn" type="submit">
            Create account
          </button>
        </div>
      </form>
      <p className="muted">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
