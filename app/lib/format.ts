export function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return (
    sign +
    (abs / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    })
  );
}

export function oddsLabel(bps: number): string {
  const percent = bps / 100;
  return `${Number(percent.toFixed(2))}%`;
}

export function rtpLabel(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

export const TIER_LABEL: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  grail: "Grail",
};
