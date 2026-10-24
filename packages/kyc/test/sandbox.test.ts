import { describe, expect, it } from "vitest";
import { PersonaSandbox, signKycWebhook } from "../src/index";

describe("kyc sandbox", () => {
  it("opens a persona sandbox inquiry and verifies the webhook", async () => {
    const persona = new PersonaSandbox();
    const session = await persona.start({ userId: "user_ada", referenceId: "ref1" });
    expect(session.sandbox).toBe(true);
    expect(session.url).toContain("sandbox.withpersona.test");
    const body = JSON.stringify({ inquiryId: session.inquiryId, referenceId: "ref1", status: "passed" });
    expect(persona.parseWebhook(body, "nope", "kyc-secret")).toBeNull();
    const parsed = persona.parseWebhook(body, signKycWebhook(body, "kyc-secret"), "kyc-secret");
    expect(parsed?.status).toBe("passed");
  });
});
