"use client";

import { useEffect, useState } from "react";

export function DemoNote() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(window.sessionStorage.getItem("cdr_demo_dismiss") !== "1");
  }, []);
  if (!open) return null;
  return (
    <p className="banner demo-note">
      <span>Example inventory. Fictional slabs, marked EXAMPLE. Credits stay in the wallet.</span>
      <button
        type="button"
        className="btn secondary"
        onClick={() => {
          window.sessionStorage.setItem("cdr_demo_dismiss", "1");
          setOpen(false);
        }}
      >
        Dismiss
      </button>
    </p>
  );
}
