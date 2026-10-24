"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const RIP_LIMIT = 8;
const MINUTE_LIMIT = 60;

export function RealityCheck() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const started = Number(window.sessionStorage.getItem("cdr_session_start") ?? "0");
    if (!started) window.sessionStorage.setItem("cdr_session_start", String(now));
    const origin = started || now;
    const rips = Number(window.sessionStorage.getItem("cdr_rip_count") ?? "0");
    const shown = window.sessionStorage.getItem("cdr_check_shown") === "1";
    const minutes = (now - origin) / 60000;
    if (!shown && (rips >= RIP_LIMIT || minutes >= MINUTE_LIMIT)) setOpen(true);
  }, []);

  if (!open) return null;
  return (
    <div className="check-backdrop" role="dialog" aria-modal="false" aria-labelledby="reality-title">
      <div className="check-card">
        <p className="kicker">Responsible play</p>
        <h2 id="reality-title">A quiet check, not a block.</h2>
        <p>
          You have been in this session a while, or you have ripped several times. Credits are not cash and cannot be
          withdrawn. You can set a daily limit or start a cool-off.
        </p>
        <div className="decision">
          <button
            type="button"
            className="btn"
            onClick={() => {
              window.sessionStorage.setItem("cdr_check_shown", "1");
              setOpen(false);
            }}
          >
            Keep going
          </button>
          <Link className="btn secondary" href="/settings#responsible">
            Review limits
          </Link>
        </div>
      </div>
    </div>
  );
}

export function noteRip() {
  const next = Number(window.sessionStorage.getItem("cdr_rip_count") ?? "0") + 1;
  window.sessionStorage.setItem("cdr_rip_count", String(next));
  window.sessionStorage.setItem("cdr_rip_done", "1");
}
