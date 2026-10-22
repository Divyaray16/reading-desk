import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Reading Desk";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function loadFont(file: string) {
  return readFile(join(process.cwd(), "app", "fonts", file));
}

export default async function OpenGraphImage() {
  const [regular, medium] = await Promise.all([loadFont("Newsreader-400.ttf"), loadFont("Newsreader-500.ttf")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#161310",
          padding: "84px 96px",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#e0b08a",
            fontFamily: "Newsreader",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Today
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            color: "#f4efe6",
            fontFamily: "Newsreader",
            fontSize: 96,
            fontWeight: 500,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          Reading Desk
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            color: "#f4efe6",
            fontFamily: "Newsreader",
            fontSize: 40,
            fontWeight: 400,
            lineHeight: 1.25,
          }}
        >
          Three articles for the work in front of you.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: regular, style: "normal", weight: 400 },
        { name: "Newsreader", data: medium, style: "normal", weight: 500 },
      ],
    },
  );
}
