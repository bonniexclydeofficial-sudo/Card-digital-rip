import { ImageResponse } from "next/og";
import { prisma } from "@cdr/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ShareImage({ params }: { params: Promise<{ pullId: string }> }) {
  const { pullId } = await params;
  const pull = await prisma.pull.findUnique({
    where: { id: pullId },
    include: { card: true, pack: { select: { name: true } } },
  });
  const subject = pull?.card.subject ?? "Example slab";
  const pack = pull?.pack.name ?? "Card Digital Rip";
  const grade = pull ? `${pull.card.grader} ${pull.card.grade.toString()}` : "EXAMPLE";
  const fmv = pull ? `$${(pull.card.fmvCents / 100).toFixed(2)}` : "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#07080d",
          color: "#f6f3ec",
          display: "flex",
          alignItems: "center",
          padding: "48px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "280px",
            height: "430px",
            background: "#f7f3ea",
            border: "8px solid #cfc8ba",
            display: "flex",
            flexDirection: "column",
            padding: "18px",
            color: "#14181f",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
            <span>{grade}</span>
            <span>EX</span>
          </div>
          <div style={{ height: "220px", marginTop: "16px", background: "#16324a" }} />
          <div style={{ marginTop: "16px", fontSize: "22px" }}>{subject}</div>
          <div style={{ marginTop: "8px", fontSize: "16px", letterSpacing: "2px" }}>EXAMPLE</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: "56px", maxWidth: "720px" }}>
          <div style={{ color: "#ffe3a1", letterSpacing: "4px", fontSize: "18px" }}>CARD DIGITAL RIP</div>
          <div style={{ fontSize: "64px", lineHeight: 1, marginTop: "16px" }}>{subject}</div>
          <div style={{ fontSize: "28px", marginTop: "20px", color: "#d5dbe3" }}>
            {pack} · fair market {fmv}
          </div>
          <div style={{ fontSize: "22px", marginTop: "28px", color: "#7eebf7" }}>Verify this pull · EXAMPLE watermark</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
