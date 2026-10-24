import { isStalePrice } from "@cdr/econ";
import type { CardCategory, Grader, OwnerType, Prisma } from "@prisma/client";
import { prisma } from "./client";
import { writeAudit } from "./audit";

const GRADERS = new Set(["PSA", "BGS", "CGC", "SGC"]);
const CATEGORIES = new Set(["pokemon", "baseball", "basketball", "football", "one_piece", "other"]);
const SOURCES = new Set(["feed", "comps", "manual"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REQUIRED = [
  "grader",
  "cert_number",
  "grade",
  "category",
  "subject",
  "set_name",
  "year",
  "fmv_usd",
  "fmv_source",
  "fmv_date",
  "cost_basis_usd",
  "owner",
  "custody_location",
  "bin",
] as const;

export interface CsvError {
  row: number;
  column: string;
  code: string;
  message: string;
}

export interface ParsedCard {
  grader: Grader;
  certNumber: string;
  grade: string;
  category: CardCategory;
  subject: string;
  setName: string;
  year: number;
  cardNumber: string | null;
  variant: string | null;
  fmvCents: number;
  fmvSource: string;
  fmvAt: Date;
  costCents: number;
  ownerType: OwnerType;
  supplierId: string | null;
  custodyLocation: string;
  bin: string;
  imageFrontUrl: string | null;
  imageBackUrl: string | null;
}

export function parseCsv(input: string): { headers: string[]; records: Record<string, string>[] } {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) matrix.push(row);
      row = [];
    } else field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) matrix.push(row);
  }
  if (matrix.length === 0) return { headers: [], records: [] };
  const headers = matrix[0].map((header) => header.trim());
  const records = matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });
  return { headers, records };
}

function dollarsToCents(raw: string, allowZero: boolean): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [dollars, fraction = ""] = raw.split(".");
  const cents = Number(dollars) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  if (allowZero ? cents < 0 : cents <= 0) return null;
  return cents;
}

function validUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateCsvRecords(
  text: string,
  options: { now?: Date; existingCerts?: Set<string> } = {},
): { ok: boolean; errors: CsvError[]; cards: ParsedCard[] } {
  const now = options.now ?? new Date();
  const existing = options.existingCerts ?? new Set<string>();
  const { headers, records } = parseCsv(text);
  const errors: CsvError[] = [];
  if (headers.length === 0) {
    return { ok: false, errors: [{ row: 1, column: "", code: "empty", message: "CSV is empty." }], cards: [] };
  }
  for (const column of REQUIRED) {
    if (!headers.includes(column)) {
      errors.push({ row: 1, column, code: "missing_column", message: `Missing required column ${column}.` });
    }
  }
  if (errors.length) return { ok: false, errors, cards: [] };

  const seen = new Set<string>();
  const cards: ParsedCard[] = [];
  const yearMax = now.getUTCFullYear();

  records.forEach((record, index) => {
    const row = index + 2;
    const fail = (column: string, code: string, message: string) => errors.push({ row, column, code, message });
    const grader = record.grader;
    if (!GRADERS.has(grader)) fail("grader", "grader", "Grader must be PSA, BGS, CGC, or SGC.");
    const cert = record.cert_number;
    if (!cert || cert.length > 64) fail("cert_number", "cert", "Cert number is required.");
    const certKey = `${grader}:${cert}`;
    if (cert && seen.has(certKey)) fail("cert_number", "duplicate", "Duplicate cert in this file.");
    if (cert && existing.has(certKey)) fail("cert_number", "duplicate", "Cert already exists.");
    if (cert) seen.add(certKey);

    if (!/^\d+(\.\d)?$/.test(record.grade)) fail("grade", "grade", "Grade must be a number with at most one decimal.");
    const gradeValue = Number(record.grade);
    if (!(gradeValue >= 1 && gradeValue <= 10)) fail("grade", "grade", "Grade must be from 1 to 10.");

    if (!CATEGORIES.has(record.category)) fail("category", "category", "Unknown category.");
    if (!record.subject) fail("subject", "required", "Subject is required.");
    if (!record.set_name) fail("set_name", "required", "Set name is required.");
    const year = Number(record.year);
    if (!Number.isInteger(year) || year < 1900 || year > yearMax) fail("year", "year", `Year must be 1900–${yearMax}.`);

    const fmvCents = dollarsToCents(record.fmv_usd, false);
    if (fmvCents == null) fail("fmv_usd", "fmv", "FMV must be a positive dollar amount.");
    if (!SOURCES.has(record.fmv_source)) fail("fmv_source", "source", "FMV source must be feed, comps, or manual.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.fmv_date)) fail("fmv_date", "date", "FMV date must be YYYY-MM-DD.");
    const fmvAt = new Date(`${record.fmv_date}T00:00:00.000Z`);
    if (Number.isNaN(fmvAt.getTime()) || record.fmv_date > now.toISOString().slice(0, 10)) {
      fail("fmv_date", "date", "FMV date is not a real date in the past or today.");
    } else if (fmvCents != null && isStalePrice(fmvCents, fmvAt, now)) {
      fail("fmv_date", "stale", "FMV date is stale.");
    }

    if (record.feed_value_usd) {
      const feed = dollarsToCents(record.feed_value_usd, false);
      if (feed == null) fail("feed_value_usd", "feed", "Feed value must be a positive dollar amount.");
      else if (fmvCents != null && fmvCents > feed * 2) {
        fail("fmv_usd", "fmv_over_feed", "FMV is more than twice the feed value.");
      }
    }

    const costCents = dollarsToCents(record.cost_basis_usd, true);
    if (costCents == null) fail("cost_basis_usd", "cost", "Cost basis must be a dollar amount.");
    if (record.owner !== "house" && record.owner !== "supplier") fail("owner", "owner", "Owner must be house or supplier.");
    let supplierId: string | null = record.supplier_id || null;
    if (record.owner === "supplier" && (!supplierId || !UUID.test(supplierId))) {
      fail("supplier_id", "supplier", "Supplier owner requires a supplier UUID.");
    }
    if (record.owner === "house") supplierId = null;
    if (!record.custody_location) fail("custody_location", "required", "Custody location is required.");
    if (!record.bin) fail("bin", "required", "Bin is required.");
    if (record.image_front_url && !validUrl(record.image_front_url)) {
      fail("image_front_url", "url", "Front image must be an http(s) URL or a root-relative path.");
    }
    if (record.image_back_url && !validUrl(record.image_back_url)) {
      fail("image_back_url", "url", "Back image must be an http(s) URL or a root-relative path.");
    }

    const rowErrors = errors.some((error) => error.row === row);
    if (!rowErrors && fmvCents != null && costCents != null) {
      cards.push({
        grader: grader as Grader,
        certNumber: cert,
        grade: gradeValue.toFixed(1),
        category: record.category as CardCategory,
        subject: record.subject,
        setName: record.set_name,
        year,
        cardNumber: record.card_number || null,
        variant: record.variant || null,
        fmvCents,
        fmvSource: record.fmv_source,
        fmvAt,
        costCents,
        ownerType: record.owner as OwnerType,
        supplierId,
        custodyLocation: record.custody_location,
        bin: record.bin,
        imageFrontUrl: record.image_front_url || null,
        imageBackUrl: record.image_back_url || null,
      });
    }
  });

  return { ok: errors.length === 0, errors, cards };
}

async function existingCerts(): Promise<Set<string>> {
  const cards = await prisma.card.findMany({ select: { grader: true, certNumber: true } });
  return new Set(cards.map((card) => `${card.grader}:${card.certNumber}`));
}

export async function importCsv(actorId: string, text: string, options: { dryRun: boolean; now?: Date }) {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || actor.role !== "admin") {
    return { ok: false as const, code: "FORBIDDEN" as const, written: 0, errors: [] as CsvError[], cards: 0 };
  }
  const before = await prisma.card.count();
  const validated = validateCsvRecords(text, { now: options.now, existingCerts: await existingCerts() });
  if (options.dryRun || !validated.ok) {
    const after = await prisma.card.count();
    if (after !== before) throw new Error("dry-run or rejected import wrote rows");
    return {
      ok: validated.ok && options.dryRun,
      code: options.dryRun ? ("DRY_RUN" as const) : ("INVALID" as const),
      dryRun: options.dryRun,
      written: 0,
      errors: validated.errors,
      cards: validated.cards.length,
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const card of validated.cards) {
      const created = await tx.card.create({
        data: {
          grader: card.grader,
          certNumber: card.certNumber,
          grade: card.grade,
          category: card.category,
          subject: card.subject,
          setName: card.setName,
          year: card.year,
          cardNumber: card.cardNumber,
          variant: card.variant,
          fmvCents: card.fmvCents,
          priceConfidence: "high",
          fmvAt: card.fmvAt,
          fmvSource: card.fmvSource,
          costCents: card.costCents,
          ownerType: card.ownerType,
          supplierId: card.supplierId,
          custodyLocation: card.custodyLocation,
          bin: card.bin,
          imageFrontUrl: card.imageFrontUrl,
          imageBackUrl: card.imageBackUrl,
          status: "available",
          example: false,
        },
      });
      await tx.priceHistory.create({
        data: { cardId: created.id, fmvCents: card.fmvCents, source: card.fmvSource, at: card.fmvAt },
      });
      await tx.cardEvent.create({
        data: { cardId: created.id, fromStatus: null, toStatus: "available", reason: "csv commit" },
      });
    }
    await writeAudit(actorId, "csv.commit", "card", null, { rows: validated.cards.length }, tx);
  });

  return {
    ok: true as const,
    code: "COMMITTED" as const,
    dryRun: false,
    written: validated.cards.length,
    errors: [] as CsvError[],
    cards: validated.cards.length,
  };
}

export function sampleCsv(now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return [
    "grader,cert_number,grade,category,subject,set_name,year,card_number,variant,fmv_usd,fmv_source,fmv_date,cost_basis_usd,owner,supplier_id,custody_location,bin,image_front_url,image_back_url,feed_value_usd",
    `PSA,EXIMPORT001,10.0,other,Example Hero,Example Archive,2024,1,EXAMPLE,42.00,manual,${date},20.00,house,,EX-VAULT,EX-Z-01,,,`,
  ].join("\n");
}

export type CsvImportClient = Prisma.TransactionClient;
