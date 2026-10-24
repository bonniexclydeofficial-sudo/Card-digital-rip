import { slabMarkup } from "@/lib/slab";

export async function GET(request: Request, context: { params: Promise<{ cert: string }> }) {
  const { cert } = await context.params;
  const query = new URL(request.url).searchParams;
  const side = query.get("side") === "back" ? "back" : "front";
  const svg = slabMarkup({
    cert: decodeURIComponent(cert),
    side,
    subject: query.get("subject") ?? "Example slab",
    grade: query.get("grade") ?? undefined,
    grader: query.get("grader") ?? undefined,
    year: query.get("year") ?? undefined,
    setName: query.get("set") ?? undefined,
    category: query.get("category") ?? undefined,
  });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
