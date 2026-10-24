"use client";

import { useState } from "react";

export function RipButton({ slug, label, disabled }: { slug: string; label: string; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rip(count: 1 | 3 | 5 = 1) {
    setPending(true);
    setError(null);
    const idempotencyKey = `rip_${crypto.randomUUID().replace(/-/g, "")}`;
    const response = await fetch("/api/rip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packSlug: slug, idempotencyKey, count }),
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
      <button className="btn" type="button" data-testid="rip" disabled={disabled || pending} onClick={() => void rip(1)}>
        {pending ? "Ripping…" : label}
      </button>
      <button className="btn secondary" type="button" data-testid="rip-x3" disabled={disabled || pending} onClick={() => void rip(3)}>
        Rip x3
      </button>
      <button className="btn secondary" type="button" data-testid="rip-x5" disabled={disabled || pending} onClick={() => void rip(5)}>
        Rip x5
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
