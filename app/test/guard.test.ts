import { describe, expect, it } from "vitest";
import { crossSite, rateLimit, resetRateLimit } from "@/lib/guard";

describe("request guards", () => {
  it("rejects a cross-site fetch and caps rips per minute", () => {
    expect(crossSite("cross-site")).toBe(true);
    expect(crossSite(null)).toBe(false);
    expect(crossSite("same-origin")).toBe(false);
    resetRateLimit("user");
    for (let i = 0; i < 30; i++) expect(rateLimit("user", 30, 60_000, 1_000)).toBe(true);
    expect(rateLimit("user", 30, 60_000, 1_000)).toBe(false);
    expect(rateLimit("user", 30, 60_000, 61_000)).toBe(true);
  });
});
