import { describe, expect, it } from "vitest";
import { slabMarkup } from "../lib/slab";

describe("photoreal slab", () => {
  it("draws a cased front with a grade label and an EXAMPLE watermark", () => {
    const front = slabMarkup({
      cert: "EX000061",
      subject: "Example baseball 61",
      grade: "9.5",
      grader: "BGS",
      year: 2024,
      setName: "Example Archive",
      category: "baseball",
    });
    expect(front).toContain('data-slab="photoreal"');
    expect(front).toContain("EXAMPLE");
    expect(front).toContain("BGS");
    expect(front).toContain("9.5");
    expect(front).toContain("Example baseball 61");
    expect(front).toContain("slab-case");
    expect(front).not.toContain("neon");
  });

  it("draws a case back with a cert barcode", () => {
    const back = slabMarkup({ cert: "EX000061", side: "back", grader: "BGS", grade: "9.5" });
    expect(back).toContain('data-slab="photoreal"');
    expect(back).toContain("CASE BACK");
    expect(back).toContain("EXAMPLE");
    expect(back.match(/<rect /g)?.length ?? 0).toBeGreaterThan(10);
  });
});
