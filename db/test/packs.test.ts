import { describe, expect, it } from "vitest";
import { designEvCents, LIVE_PACKS, validatePack } from "@cdr/econ";
import { evaluatePack, loadPack, prisma, publishPack } from "@cdr/db";

describe("seeded catalog and margin guard", () => {
  it("seeds 200 example cards and the three live packs at the published EV", async () => {
    expect(await prisma.card.count({ where: { example: true } })).toBeGreaterThanOrEqual(200);
    for (const spec of LIVE_PACKS) {
      const pack = await prisma.pack.findUniqueOrThrow({ where: { slug: spec.slug } });
      expect(pack.status).toBe("live");
      expect(pack.priceCents).toBe(spec.priceCents);
      const full = await loadPack(pack.id);
      const view = await evaluatePack(full!);
      expect(Math.round(view.evCents)).toBe(designEvCents(spec));
      expect(view.validation.gm).toBeGreaterThanOrEqual(0.04);
    }
    const ada = await prisma.wallet.findUniqueOrThrow({ where: { userId: "user_ada" } });
    expect(ada.availableCents).toBe(197_500);
    const proof = await prisma.pull.findUniqueOrThrow({ where: { id: "pull_example" } });
    expect(proof.priceCents).toBe(2500);
  });

  it("blocks publish when gross margin is under 4% and allows a healthy draft", async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
    const thin = await prisma.pack.findUniqueOrThrow({ where: { slug: "draft-thin-margin" } });
    const blocked = await publishPack(admin.id, thin.id, new Date());
    expect(blocked.ok).toBe(false);
    if (!blocked.ok && blocked.code === "BLOCKED") {
      expect(blocked.validation.errors.some((error) => error.code === "MARGIN")).toBe(true);
      expect(blocked.validation.gm).toBeLessThan(0.04);
    }
    expect((await prisma.pack.findUniqueOrThrow({ where: { id: thin.id } })).status).toBe("draft");

    const ready = await prisma.pack.findUniqueOrThrow({ where: { slug: "draft-ok" } });
    const published = await publishPack(admin.id, ready.id, new Date());
    expect(published.ok).toBe(true);
    expect((await prisma.pack.findUniqueOrThrow({ where: { id: ready.id } })).status).toBe("live");
    expect(validatePack).toBeTypeOf("function");
  });
});
