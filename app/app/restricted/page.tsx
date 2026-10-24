import Link from "next/link";

export default async function RestrictedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason =
    params.reason === "age" || params.reason === "geo" || params.reason === "excluded" ? params.reason : "restricted";
  const copy =
    reason === "age"
      ? "Accounts require 18, or the age of majority if that is higher. The attempt was logged and no account was created."
      : reason === "geo"
        ? "Washington, Nevada, Michigan, Idaho, and Montana are closed. Oklahoma, New Jersey, Tennessee, and Louisiana stay closed until their flags are opened. The attempt was logged and no account was created."
        : reason === "excluded"
          ? "This account is self-excluded and cannot rip."
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
