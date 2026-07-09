import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCollection, type CollectionEntry } from "astro:content";
import { CATEGORY_DISPLAY_NAMES, getCategoryDisplayName } from "@utils/posts";
import { createHash } from "node:crypto";

const ENGLISH_MONTHS =
  "JanuaryFebruaryMarchAprilMayJuneJulyAugustSeptemberOctoberNovemberDecember";
const STATIC_CHARS =
  "0123456789年月日…#, Moyuin moyuin.top" +
  ENGLISH_MONTHS +
  Object.values(CATEGORY_DISPLAY_NAMES)
    .flatMap((n) => [n.zh, n.en])
    .join("");

const WIDTH = 1200;
const HEIGHT = 630;

// Old UA so Google Fonts' CSS2 API serves WOFF instead of WOFF2 (satori can't parse WOFF2).
const LEGACY_UA =
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36";

// Font cache dir — Vercel preserves `.cache/` between builds (same convention
// as node_modules/.cache). The key is a sha256 of the weight + glyph set, so
// an identical subset across builds just reads the cached binary from disk.
const FONT_CACHE_DIR = join(process.cwd(), ".cache", "og-fonts");

async function fetchFontSubset(weight: 400 | 700, text: string): Promise<ArrayBuffer> {
  const uniqueChars = Array.from(new Set(Array.from(text))).join("");
  const hash = createHash("sha256").update(`${weight}:${uniqueChars}`).digest("hex").slice(0, 16);
  const cacheFile = join(FONT_CACHE_DIR, hash);

  // Cache hit — read the binary font file from disk.
  if (existsSync(cacheFile)) {
    return readFile(cacheFile).then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  }

  // Cache miss — fetch from Google Fonts, write to disk, return.
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@${weight}&text=${encodeURIComponent(uniqueChars)}`;
  const css = await fetch(cssUrl, { headers: { "User-Agent": LEGACY_UA } }).then((r) => r.text());
  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error(`Could not resolve Noto Serif SC (${weight}) font URL`);
  const buf = await fetch(fontUrl).then((r) => r.arrayBuffer());

  await mkdir(FONT_CACHE_DIR, { recursive: true });
  await writeFile(cacheFile, new Uint8Array(buf));
  return buf;
}

type FontSet = { regular: ArrayBuffer; bold: ArrayBuffer };

let fontsPromise: Promise<FontSet> | null = null;

/**
 * Loads one Noto Serif SC 400/700 subset covering every OG card in this build.
 * Computed from the full post collection up front (not per-call) — otherwise the
 * subset would only cover whichever post happened to render first.
 */
function loadOgFonts(): Promise<FontSet> {
  if (!fontsPromise) {
    fontsPromise = getCollection("blog", ({ data }) => data.published !== false).then(
      (posts) => {
        const boldText = STATIC_CHARS + posts.map((p) => p.data.title).join("");
        const regularText =
          STATIC_CHARS + posts.map((p) => p.data.description ?? "").join("");
        return Promise.all([
          fetchFontSubset(400, regularText),
          fetchFontSubset(700, boldText),
        ]).then(([regular, bold]) => ({ regular, bold }));
      },
    );
  }
  return fontsPromise;
}

let avatarPromise: Promise<string> | null = null;

/** Base64 PNG data URI for the site avatar (resvg can't reliably decode WebP). */
function loadAvatarDataUri(): Promise<string> {
  if (!avatarPromise) {
    const avatarPath = join(process.cwd(), "public/avatar.webp");
    avatarPromise = readFile(avatarPath)
      .then((webp) => sharp(webp).resize(96, 96).png().toBuffer())
      .then((png) => `data:image/png;base64,${png.toString("base64")}`);
  }
  return avatarPromise;
}

function truncate(input: string, max: number): string {
  const chars = Array.from(input);
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : input;
}

export interface OgCardData {
  title: string;
  description?: string;
  category?: string;
  dateLabel: string;
  domain: string;
}

const PURPLE = "#a259ec";

export async function renderOgImage(data: OgCardData): Promise<Buffer> {
  const title = truncate(data.title, 34);
  const description = data.description ? truncate(data.description, 68) : "";
  const [fonts, avatarDataUri] = await Promise.all([loadOgFonts(), loadAvatarDataUri()]);

  const titleFontSize = Array.from(title).length > 20 ? 54 : 64;

  const markup = {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        position: "relative",
        background: "#070615",
        fontFamily: "Noto Serif SC",
      },
      children: [
        // Ambient glow blobs — no blur filter (resvg mis-renders it), softness comes
        // from the radial gradient falloff itself.
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: -220,
              left: -180,
              width: 760,
              height: 760,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${hexToRgba(PURPLE, 0.32)} 0%, ${hexToRgba(PURPLE, 0)} 70%)`,
              display: "flex",
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: -260,
              right: -200,
              width: 700,
              height: 700,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(242,231,185,0.14) 0%, rgba(242,231,185,0) 70%)",
              display: "flex",
            },
          },
        },
        // Glass card
        {
          type: "div",
          props: {
            style: {
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              margin: 48,
              padding: "52px 60px",
              flex: 1,
              borderRadius: 32,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            },
            children: [
              // Top row: category pill + date
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "space-between", alignItems: "center" },
                  children: [
                    data.category
                      ? {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              padding: "8px 22px",
                              borderRadius: 8,
                              fontSize: 26,
                              color: "#d8bcf7",
                              background: hexToRgba(PURPLE, 0.16),
                              border: `1px solid ${hexToRgba(PURPLE, 0.32)}`,
                            },
                            children: `#${data.category}`,
                          },
                        }
                      : { type: "div", props: { style: { display: "flex" } } },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", fontSize: 24, color: "#7d7d9e" },
                        children: data.dateLabel,
                      },
                    },
                  ],
                },
              },
              // Middle: title + description
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", marginTop: 28 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          fontSize: titleFontSize,
                          fontWeight: 700,
                          lineHeight: 1.32,
                          letterSpacing: -1,
                          color: "#f7f7fc",
                        },
                        children: title,
                      },
                    },
                    description
                      ? {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              marginTop: 22,
                              fontSize: 28,
                              lineHeight: 1.6,
                              color: "#a6a6c1",
                            },
                            children: description,
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },
              // Footer: domain + avatar/author
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "space-between", alignItems: "center" },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", fontSize: 22, letterSpacing: 1, color: "#66668a" },
                        children: data.domain,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: 14 },
                        children: [
                          {
                            type: "img",
                            props: {
                              src: avatarDataUri,
                              width: 48,
                              height: 48,
                              style: { borderRadius: "50%" },
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: { display: "flex", fontSize: 24, color: "#d8d3ea" },
                              children: "Moyuin",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(markup as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Noto Serif SC", data: fonts.regular, weight: 400, style: "normal" },
      { name: "Noto Serif SC", data: fonts.bold, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } });
  return resvg.render().asPng();
}

/** Renders the OG card for a specific resolved post entry (the one actually shown at this locale's URL). */
export function renderPostOgImage(
  post: CollectionEntry<"blog">,
  locale: "zh" | "en",
  domain: string,
): Promise<Buffer> {
  return renderOgImage({
    title: post.data.title,
    description: post.data.description,
    category: getCategoryDisplayName(post.data.category ?? "uncategorized", locale),
    dateLabel: post.data.pubDate.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    domain,
  });
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
