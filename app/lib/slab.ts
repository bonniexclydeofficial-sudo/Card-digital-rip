function fnv(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export interface SlabInput {
  cert: string;
  side?: "front" | "back";
  subject?: string;
  grade?: string;
  grader?: string;
  year?: number | string;
  setName?: string;
}

/** Original generative slab. The drawing is derived from the cert, not a photograph. */
export function slabMarkup(input: SlabInput): string {
  const cert = input.cert || "EXAMPLE";
  const side = input.side === "back" ? "back" : "front";
  const h = fnv(`${cert}:${side}`);
  const hue = h % 360;
  const hue2 = (hue + 40 + ((h >> 8) % 50)) % 360;
  const bars = 4 + (h % 4);
  const subject = esc(input.subject ?? "Example slab");
  const grade = esc(input.grade ?? "—");
  const grader = esc(input.grader ?? "EX");
  const year = esc(String(input.year ?? ""));
  const setName = esc(input.setName ?? "Example Archive");
  const label = esc(cert);
  const lines = Array.from({ length: bars }, (_, index) => {
    const y = 92 + index * 28;
    const w = 80 + ((h >> index) % 140);
    return `<rect x="36" y="${y}" width="${w}" height="8" fill="hsl(${(hue + index * 18) % 360} 35% ${40 + (index % 3) * 12}%)" />`;
  }).join("");
  const seal = side === "front" ? "EX" : "REV";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" role="img" aria-label="Example slab ${label}">
  <rect width="300" height="420" fill="#1a1612"/>
  <rect x="10" y="10" width="280" height="400" fill="none" stroke="hsl(${hue} 42% 62%)" stroke-width="2"/>
  <rect x="22" y="22" width="256" height="376" fill="hsl(${hue2} 18% 12%)"/>
  <text x="36" y="52" fill="#d4b483" font-family="Georgia, serif" font-size="13" letter-spacing="3">EXAMPLE</text>
  <text x="36" y="78" fill="#f6f1e7" font-family="Georgia, serif" font-size="18">${subject}</text>
  ${lines}
  <circle cx="228" cy="300" r="36" fill="none" stroke="#d4b483" stroke-width="2"/>
  <text x="228" y="306" text-anchor="middle" fill="#d4b483" font-family="Georgia, serif" font-size="14">${seal}</text>
  <text x="36" y="348" fill="#b1a89b" font-family="ui-monospace, monospace" font-size="12">${grader} ${grade}</text>
  <text x="36" y="368" fill="#b1a89b" font-family="ui-monospace, monospace" font-size="12">${year} ${setName}</text>
  <text x="36" y="392" fill="#8a6434" font-family="ui-monospace, monospace" font-size="11">${label}</text>
</svg>`;
}
