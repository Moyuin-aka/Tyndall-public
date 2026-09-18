import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "..", "src", "data", "bookmarks.json");

const KARAKEEP_URL = process.env.KARAKEEP_URL || "https://example.invalid";
const KARAKEEP_API_KEY = process.env.KARAKEEP_API_KEY;
const CI_BYPASS_SECRET = process.env.CI_BYPASS_SECRET;
const LIMIT = 12;

if (!KARAKEEP_API_KEY) {
  console.error("Missing KARAKEEP_API_KEY env var");
  process.exit(1);
}

const res = await fetch(`${KARAKEEP_URL}/api/v1/bookmarks?limit=${LIMIT}`, {
  headers: {
    Authorization: `Bearer ${KARAKEEP_API_KEY}`,
    Accept: "application/json",
    ...(CI_BYPASS_SECRET ? { "X-CI-Bypass": CI_BYPASS_SECRET } : {}),
  },
});

if (!res.ok) {
  throw new Error(`Karakeep API request failed: ${res.status}`);
}

const json = await res.json();

const bookmarks = (json.bookmarks || [])
  .filter((b) => b.content?.type === "link")
  .map((b) => ({
    id: b.id,
    title: b.title || b.content?.title || b.content?.url,
    url: b.content?.url,
    favicon: b.content?.favicon || null,
    tags: (b.tags || []).map((tag) => tag.name || tag),
    note: b.note || null,
    createdAt: b.createdAt,
  }));

const data = {
  updatedAt: new Date().toISOString(),
  bookmarks,
};

writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${bookmarks.length} bookmarks to ${outPath}`);
