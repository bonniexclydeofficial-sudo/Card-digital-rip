"use client";

import { useState } from "react";

export function RipButton({ slug, label, disabled }: { slug: string; label: string; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rip() {
    setPending(true);
    setError(null);
    const idempotencyKey = `rip_${crypto.randomUUID().replace(/-/g, "")}`;
    const response = await fetch("/api/rip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packSlug: slug, idempotencyKey }),
    });
    const data = (await response.json()) as { ok: boolean; pullId?: string; message?: string };
    if (!data.ok || !data.pullId) {
      setError(data.message ?? "The rip did not complete.");
      setPending(false);
      return;
    }
    window.location.href = `/rip/${data.pullId}`;
  }

  return (
    <div>
      <button className="btn" type="button" data-testid="rip" disabled={disabled || pending} onClick={() => void rip()}>
        {pending ? "Ripping…" : label}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
