import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { importCsv, prisma, validateCsvRecords } from "@cdr/db";

const now = new Date("2026-10-24T12:00:00.000Z");
const date = "2026-10-24";

function csv(rows: string[], extraHeader = ""): string {
  const header =
    "grader,cert_number,grade,category,subject,set_name,year,card_number,variant,fmv_usd,fmv_source,fmv_date,cost_basis_usd,owner,supplier_id,custody_location,bin,image_front_url,image_back_url,feed_value_usd" +
    extraHeader;
  return [header, ...rows].join("\n");
}

function row(overrides: Partial<Record<string, string>> = {}): string {
  const value = {
    grader: "PSA",
    cert_number: `CSV${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    grade: "9.5",
    category: "baseball",
    subject: "A. Calder",
    set_name: "Example Archive",
    year: "2024",
    card_number: "1",
    variant: "EXAMPLE",
    fmv_usd: "40.00",
    fmv_source: "manual",
    fmv_date: date,
    cost_basis_usd: "20.00",
    owner: "house",
    supplier_id: "",
    custody_location: "EX-VAULT",
    bin: "EX-Z-01",
    image_front_url: "",
    image_back_url: "",
    feed_value_usd: "",
    ...overrides,
  };
  return [
    value.grader,
    value.cert_number,
    value.grade,
    value.category,
    value.subject,
    value.set_name,
    value.year,
    value.card_number,
    value.variant,
    value.fmv_usd,
    value.fmv_source,
    value.fmv_date,
    value.cost_basis_usd,
    value.owner,
    value.supplier_id,
    value.custody_location,
    value.bin,
    value.image_front_url,
    value.image_back_url,
    value.feed_value_usd,
  ].join(",");
}

describe("csv loader", () => {
  it("rejects each intake rule", () => {
    const cases: { name: string; line: string; code: string }[] = [
      { name: "duplicate in file", line: row({ cert_number: "DUP1" }), code: "duplicate" },
      { name: "bad grader", line: row({ grader: "ACE" }), code: "grader" },
      { name: "grade high", line: row({ grade: "10.5" }), code: "grade" },
      { name: "grade low", line: row({ grade: "0.5" }), code: "grade" },
      { name: "category", line: row({ category: "magic" }), code: "category" },
      { name: "year", line: row({ year: "1800" }), code: "year" },
      { name: "stale", line: row({ fmv_date: "2026-10-01" }), code: "stale" },
      { name: "high value stale", line: row({ fmv_usd: "1500.00", fmv_date: "2026-10-23" }), code: "stale" },
      { name: "feed multiple", line: row({ fmv_usd: "100.00", feed_value_usd: "40.00" }), code: "fmv_over_feed" },
      { name: "missing subject", line: row({ subject: "" }), code: "required" },
      { name: "supplier", line: row({ owner: "supplier", supplier_id: "" }), code: "supplier" },
      { name: "fmv", line: row({ fmv_usd: "0" }), code: "fmv" },
    ];
    const duplicate = csv([row({ cert_number: "DUP1" }), row({ cert_number: "DUP1" })]);
    expect(validateCsvRecords(duplicate, { now }).errors.some((error) => error.code === "duplicate")).toBe(true);
    for (const item of cases.slice(1)) {
      const result = validateCsvRecords(csv([item.line]), { now });
      expect(result.ok, item.name).toBe(false);
      expect(result.errors.some((error) => error.code === item.code), `${item.name} ${JSON.stringify(result.errors)}`).toBe(true);
    }
    const existing = validateCsvRecords(csv([row({ grader: "PSA", cert_number: "TAKEN" })]), {
      now,
      existingCerts: new Set(["PSA:TAKEN"]),
    });
    expect(existing.errors.some((error) => error.code === "duplicate")).toBe(true);
    expect(validateCsvRecords("grader,subject\nPSA,x", { now }).errors.some((error) => error.code === "missing_column")).toBe(true);
  });

  it("dry-run writes nothing and a bad commit writes nothing", async () => {
    const before = await prisma.card.count();
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
    const valid = csv([row()]);
    const dry = await importCsv(admin.id, valid, { dryRun: true, now });
    expect(dry.written).toBe(0);
    expect(dry.ok).toBe(true);
    expect(await prisma.card.count()).toBe(before);

    const bad = csv([row({ grade: "11" })]);
    const rejected = await importCsv(admin.id, bad, { dryRun: false, now });
    expect(rejected.ok).toBe(false);
    expect(rejected.written).toBe(0);
    expect(await prisma.card.count()).toBe(before);

    const mixed = csv([row(), row({ year: "1700" })]);
    const atomic = await importCsv(admin.id, mixed, { dryRun: false, now });
    expect(atomic.written).toBe(0);
    expect(await prisma.card.count()).toBe(before);

    const committed = await importCsv(admin.id, valid, { dryRun: false, now });
    expect(committed.ok).toBe(true);
    expect(committed.written).toBe(1);
    expect(await prisma.card.count()).toBe(before + 1);
  });
});
