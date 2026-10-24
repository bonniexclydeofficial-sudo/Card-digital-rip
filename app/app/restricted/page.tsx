import Link from "next/link";

export default async function RestrictedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason === "age" || params.reason === "geo" ? params.reason : "restricted";
  const copy =
    reason === "age"
      ? "Accounts are limited to people 18 and older. The attempt was logged and no account was created."
      : reason === "geo"
        ? "This state is on the blocked list (WA, NV, MI, ID, MT, OK). The attempt was logged and no account was created."
        : "This signup cannot continue.";
  return (
    <div>
      <p className="kicker">Restricted</p>
      <h1>We can’t open that account</h1>
      <p className="lede" data-testid="restricted-reason">
        {reason}. {copy}
      </p>
      <Link className="btn secondary" href="/">
        Back home
      </Link>
    </div>
  );
}
