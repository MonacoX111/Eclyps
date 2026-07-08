import { ImageResponse } from "next/og"

export const runtime = "edge"

const size = {
  width: 1200,
  height: 630,
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = readText(searchParams.get("title"), "Eclyps")
  const description = readText(searchParams.get("description"), "Competitive esports tournaments")
  const image = readImageUrl(searchParams.get("image"))

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          background: "#020706",
          color: "#ecfffa",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              height: "100%",
              width: "100%",
              objectFit: "cover",
              opacity: 0.48,
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(2,7,6,0.96) 0%, rgba(2,7,6,0.72) 54%, rgba(2,7,6,0.42) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 19% 20%, rgba(0,216,164,0.34), transparent 34%), radial-gradient(circle at 72% 70%, rgba(78,205,255,0.18), transparent 32%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "64px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              color: "#00d8a4",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                display: "flex",
                height: 42,
                width: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                border: "1px solid rgba(0,216,164,0.45)",
                background: "rgba(0,216,164,0.12)",
                color: "#ecfffa",
                fontSize: 22,
              }}
            >
              E
            </div>
            Eclyps
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: 860 }}>
            <div
              style={{
                display: "flex",
                width: "fit-content",
                borderRadius: 999,
                border: "1px solid rgba(0,216,164,0.38)",
                background: "rgba(0,216,164,0.12)",
                padding: "10px 18px",
                color: "#8dfbe0",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Link preview
            </div>
            <div
              style={{
                display: "flex",
                color: "#f4fffb",
                fontSize: title.length > 58 ? 58 : 68,
                fontWeight: 900,
                lineHeight: 1.05,
                textShadow: "0 0 36px rgba(0,216,164,0.22)",
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 760,
                color: "rgba(236,255,250,0.72)",
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.35,
              }}
            >
              {description}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}

function readText(value: string | null, fallback: string) {
  const compact = value?.replace(/\s+/g, " ").trim()
  if (!compact) return fallback
  return compact.length > 140 ? `${compact.slice(0, 137).trim()}...` : compact
}

function readImageUrl(value: string | null) {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

