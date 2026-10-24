import { slabMarkup } from "@/lib/slab";

export async function GET(request: Request, context: { params: Promise<{ cert: string }> }) {
  const { cert } = await context.params;
  const side = new URL(request.url).searchParams.get("side") === "back" ? "back" : "front";
  const svg = slabMarkup({ cert: decodeURIComponent(cert), side, subject: "Example slab" });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
