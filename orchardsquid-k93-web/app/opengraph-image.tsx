import { ImageResponse } from "next/og";

import { site } from "@/app/_lib/site.ts";

export const alt = site.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 96,
        background: "#0a0a0a",
        color: "#ededed",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 112 }}>{site.name}</div>
      <div style={{ fontSize: 44, color: "#a1a1aa" }}>{site.description}</div>
    </div>,
    size,
  );
}
