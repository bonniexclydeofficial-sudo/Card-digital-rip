import { describe, expect, it } from "vitest";
import { ExamplePriceFeed, dropExceeds, packStillInBand } from "../src/index";

describe("price feed", () => {
  it("quotes a scripted cert and flags a drop over 10%", async () => {
    const feed = new ExamplePriceFeed({
      EX1: { fmvCents: 8_000, source: "example", confidence: "high" },
    });
    const quote = await feed.quote({ id: "c", grader: "PSA", certNumber: "EX1", fmvCents: 10_000 });
    expect(quote?.fmvCents).toBe(8_000);
    expect(dropExceeds(10_000, 8_000)).toBe(true);
    expect(dropExceeds(10_000, 9_500)).toBe(false);
  });

  it("marks a pack out of band when RTP leaves 98–103%", () => {
    const tiers = [
      {
        tier: "common",
        oddsBps: 10_000,
        cards: [
          { id: "a", fmvCents: 5_000, fmvAt: new Date().toISOString(), imageFrontUrl: "/a", imageBackUrl: "/b" },
          { id: "b", fmvCents: 5_000, fmvAt: new Date().toISOString(), imageFrontUrl: "/a", imageBackUrl: "/b" },
          { id: "c", fmvCents: 5_000, fmvAt: new Date().toISOString(), imageFrontUrl: "/a", imageBackUrl: "/b" },
        ],
      },
    ];
    const view = packStillInBand({ priceCents: 10_000, tiers });
    expect(view.rtp).toBeCloseTo(0.5, 2);
    expect(view.ok).toBe(false);
  });
});
