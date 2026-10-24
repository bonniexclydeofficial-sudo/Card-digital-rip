import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          background: "#071016",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "78px",
            height: "140px",
            background: "#f7f3ea",
            border: "4px solid #e6c15a",
            display: "flex",
            flexDirection: "column",
            padding: "10px",
          }}
        >
          <div style={{ height: "78px", background: "#16324a" }} />
          <div style={{ height: "22px", marginTop: "10px", background: "#14181f" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
