import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma, registerUser } from "@cdr/db";

const now = new Date("2026-10-24T12:00:00.000Z");

describe("signup gates", () => {
  it("blocks a date of birth under 18 and logs it", async () => {
    const email = `minor-${randomUUID()}@example.com`;
    const result = await registerUser({
      email,
      username: `m${randomUUID().replace(/-/g, "").slice(0, 10)}`,
      password: "password-test",
      dob: "2010-01-02",
      state: "CA",
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNDERAGE");
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    const logged = await prisma.geoCheck.findFirst({ where: { reason: "underage", source: "signup" }, orderBy: { at: "desc" } });
    expect(logged?.passed).toBe(false);
  });

  it("blocks WA, NV, MI, ID, MT, and OK", async () => {
    for (const state of ["WA", "NV", "MI", "ID", "MT", "OK"]) {
      const result = await registerUser({
        email: `${state.toLowerCase()}-${randomUUID()}@example.com`,
        username: `g${randomUUID().replace(/-/g, "").slice(0, 10)}`,
        password: "password-test",
        dob: "1991-03-03",
        state,
        now,
      });
      expect(result.ok, state).toBe(false);
      if (!result.ok) expect(result.code).toBe("GEO_BLOCKED");
    }
  });

  it("lets an 18-year-old in an open state through", async () => {
    const result = await registerUser({
      email: `adult-${randomUUID()}@example.com`,
      username: `a${randomUUID().replace(/-/g, "").slice(0, 10)}`,
      password: "password-test",
      dob: "2008-10-24",
      state: "ca",
      now,
    });
    expect(result.ok).toBe(true);
  });
});
