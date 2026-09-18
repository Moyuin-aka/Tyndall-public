import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, "..", "..", "src", "content");
const outPath = path.join(__dirname, "..", "..", "src", "data", "writing-heatmap.json");

const raw = execSync('git log --since="15 months ago" --date=short --format="%ad" -- .', {
  cwd: contentDir,
  encoding: "utf8",
});

const counts = {};
for (const line of raw.split("\n")) {
  const date = line.trim();
  if (!date) continue;
  counts[date] = (counts[date] || 0) + 1;
}

const days = Object.entries(counts)
  .map(([date, count]) => ({ date, count }))
  .sort((a, b) => a.date.localeCompare(b.date));

const data = {
  generatedAt: new Date().toISOString(),
  days,
};

writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${days.length} days to ${outPath}`);
