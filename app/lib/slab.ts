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
  category?: string;
}

function art(category: string, h: number): string {
  const ink = "#1b2430";
  const paper = "#f3efe4";
  const accent = ["#8c3a2f", "#1f4d3a", "#1d3d66", "#6b4a16", "#3d3358"][h % 5];
  if (category === "baseball") {
    return `<rect x="78" y="108" width="144" height="168" rx="4" fill="${paper}"/>
      <path d="M100 210 L150 150 L200 210 L176 210 L150 184 L124 210 Z" fill="${accent}"/>
      <circle cx="150" cy="228" r="16" fill="${ink}"/><circle cx="150" cy="228" r="10" fill="${paper}"/>
      <path d="M142 228h16M150 220v16" stroke="${ink}" stroke-width="1"/>`;
  }
  if (category === "basketball") {
    return `<rect x="78" y="108" width="144" height="168" rx="4" fill="#efe6d4"/>
      <rect x="96" y="132" width="108" height="78" fill="none" stroke="${ink}" stroke-width="2"/>
      <circle cx="150" cy="171" r="16" fill="none" stroke="${ink}" stroke-width="2"/>
      <circle cx="150" cy="236" r="18" fill="${accent}"/>
      <path d="M132 236h36M150 218v36" stroke="${paper}" stroke-width="1.4"/>`;
  }
  if (category === "football") {
    return `<rect x="78" y="108" width="144" height="168" rx="4" fill="#e7efe4"/>
      <rect x="108" y="128" width="84" height="120" fill="${accent}"/>
      <path d="M120 140h60M120 236h60" stroke="${paper}" stroke-width="3"/>
      <ellipse cx="150" cy="188" rx="16" ry="22" fill="#f4efe4"/>
      <path d="M150 172v32" stroke="${ink}" stroke-width="1.2"/>`;
  }
  if (category === "pokemon") {
    return `<rect x="78" y="108" width="144" height="168" rx="4" fill="#efe7f4"/>
      <ellipse cx="150" cy="188" rx="46" ry="36" fill="${accent}"/>
      <circle cx="132" cy="176" r="6" fill="${paper}"/><circle cx="168" cy="176" r="6" fill="${paper}"/>
      <path d="M128 200 Q150 214 172 200" fill="none" stroke="${paper}" stroke-width="2"/>
      <path d="M118 150l10-16 8 12 10-18 8 22h18" fill="${ink}"/>`;
  }
  if (category === "one_piece") {
    return `<rect x="78" y="108" width="144" height="168" rx="4" fill="#e5eef3"/>
      <path d="M96 214 L150 132 L204 214 Z" fill="${accent}"/>
      <path d="M150 132 V214" stroke="${paper}" stroke-width="2"/>
      <path d="M90 220 H210" stroke="${ink}" stroke-width="3"/>
      <circle cx="186" cy="154" r="8" fill="#f0d48a"/>`;
  }
  return `<rect x="78" y="108" width="144" height="168" rx="4" fill="${paper}"/>
    <circle cx="150" cy="176" r="34" fill="none" stroke="${accent}" stroke-width="6"/>
    <path d="M150 152v48M126 176h48" stroke="${ink}" stroke-width="2"/>`;
}

/** Original generative slab. Looks like a cased card. It is not a photograph and not a competitor label. */
export function slabMarkup(input: SlabInput): string {
  const cert = input.cert || "EXAMPLE";
  const side = input.side === "back" ? "back" : "front";
  const h = fnv(`${cert}:${side}:${input.category ?? ""}`);
  const subject = esc(input.subject ?? "Example slab");
  const grade = esc(input.grade ?? "—");
  const grader = esc(input.grader ?? "EX");
  const year = esc(String(input.year ?? ""));
  const setName = esc(input.setName ?? "Example Archive");
  const label = esc(cert);
  const category = (input.category ?? "other").toLowerCase();
  const aria = esc(`Example slab ${cert}`);
  if (side === "back") {
    const bars = Array.from({ length: 42 }, (_, index) => {
      const bit = (h >> (index % 24)) & 1;
      const w = bit ? 3 : 1.4;
      const x = 70 + index * 4;
      return `<rect x="${x}" y="168" width="${w}" height="64" fill="#14181f"/>`;
    }).join("");
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 460" role="img" aria-label="${aria} back" data-slab="photoreal">
  <defs>
    <linearGradient id="case" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7f4ee"/><stop offset="0.45" stop-color="#d5d0c6"/><stop offset="1" stop-color="#8e8a82"/>
    </linearGradient>
  </defs>
  <rect width="300" height="460" rx="18" fill="url(#case)"/>
  <rect x="10" y="10" width="280" height="440" rx="12" fill="#12161c"/>
  <rect x="22" y="22" width="256" height="54" rx="4" fill="#f4efe4"/>
  <text x="34" y="44" fill="#1a1408" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">CASE BACK</text>
  <text x="34" y="64" fill="#3a342c" font-family="ui-monospace, monospace" font-size="12">${label}</text>
  <rect x="48" y="110" width="204" height="250" rx="6" fill="#ece6da"/>
  <text x="150" y="146" text-anchor="middle" fill="#1a1408" font-family="Inter, sans-serif" font-size="13" font-weight="650">${grader} ${grade}</text>
  ${bars}
  <text x="150" y="256" text-anchor="middle" fill="#1a1408" font-family="ui-monospace, monospace" font-size="11">${label}</text>
  <text x="150" y="330" text-anchor="middle" fill="#6d6458" font-family="Inter, sans-serif" font-size="12" letter-spacing="3">EXAMPLE</text>
  <polygon points="18,24 92,18 40,120" fill="#fff" opacity="0.28"/>
</svg>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 460" role="img" aria-label="${aria}" data-slab="photoreal">
  <defs>
    <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbf8f2"/><stop offset="0.4" stop-color="#cfc8ba"/><stop offset="1" stop-color="#7d7870"/>
    </linearGradient>
    <linearGradient id="window" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f1e6"/><stop offset="1" stop-color="#e4dccb"/>
    </linearGradient>
  </defs>
  <rect class="slab-case" width="300" height="460" rx="18" fill="url(#shell)"/>
  <rect x="8" y="8" width="284" height="444" rx="14" fill="none" stroke="#2a261f" stroke-width="3"/>
  <rect x="18" y="16" width="264" height="70" rx="6" fill="#f7f3ea"/>
  <text x="30" y="42" fill="#1a1408" font-family="Inter, sans-serif" font-size="13" font-weight="750">${grader}</text>
  <text x="30" y="66" fill="#3d3428" font-family="ui-monospace, monospace" font-size="12">${label}</text>
  <rect x="214" y="28" width="52" height="40" rx="4" fill="#14181f"/>
  <text x="240" y="54" text-anchor="middle" fill="#f7f3ea" font-family="Inter, sans-serif" font-size="16" font-weight="700">${grade}</text>
  <rect x="28" y="98" width="244" height="250" rx="4" fill="url(#window)" stroke="#b7ad9c"/>
  ${art(category, h)}
  <text x="150" y="292" text-anchor="middle" fill="#1c2430" font-family="Inter, sans-serif" font-size="13" font-weight="700">${subject}</text>
  <text x="150" y="314" text-anchor="middle" fill="#5c564c" font-family="Inter, sans-serif" font-size="11">${year} ${setName}</text>
  <text x="150" y="250" text-anchor="middle" fill="#1a1408" font-family="Inter, sans-serif" font-size="28" font-weight="750" opacity="0.16" transform="rotate(-18 150 250)">EXAMPLE</text>
  <polygon points="36,104 118,104 52,210" fill="#fff" opacity="0.38"/>
  <text x="30" y="378" fill="#2a261f" font-family="Inter, sans-serif" font-size="11" letter-spacing="2">EXAMPLE · NOT A PHOTO</text>
  <text x="30" y="402" fill="#5c564c" font-family="ui-monospace, monospace" font-size="11">${grader} ${grade}</text>
  <text x="30" y="424" fill="#5c564c" font-family="ui-monospace, monospace" font-size="11">${label}</text>
</svg>`;
}
