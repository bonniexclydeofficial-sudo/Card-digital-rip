"use client";

import { useState } from "react";

export function ShareActions({ pullId, subject }: { pullId: string; subject: string }) {
  const [note, setNote] = useState("");

  async function share() {
    const url = `${window.location.origin}/share/${pullId}`;
    const text = `${subject}. Example slab. Verify the pull.`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: subject, text, url });
        setNote("Share sheet opened.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Share link copied.");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setNote("Share link copied.");
      } catch {
        setNote(url);
      }
    }
  }

  return (
    <div className="decision">
      <button className="btn" type="button" onClick={() => void share()}>
        Share card
      </button>
      <a className="btn secondary" href={`/verify/${pullId}`}>
        Verify this pull
      </a>
      {note ? <p className="muted">{note}</p> : null}
    </div>
  );
}
