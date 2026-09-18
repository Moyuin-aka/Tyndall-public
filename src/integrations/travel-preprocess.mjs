import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RAW_EXTS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);

function findRawImages(dir) {
  return readdirSync(dir).filter((f) => {
    const ext = f.slice(f.lastIndexOf(".")).toLowerCase();
    return RAW_EXTS.has(ext);
  });
}

function parseFilenameDateTime(name) {
  if (!name) return undefined;
  const match = name.match(/(\d{8})[_-]?(\d{6})/);
  if (!match) return undefined;

  const [, ymd, hms] = match;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)} ${hms.slice(0, 2)}:${hms.slice(2, 4)}:${hms.slice(4, 6)}`;
}

function toTimestamp(dateTime) {
  if (!dateTime || typeof dateTime !== "string") return null;
  const normalized = dateTime
    .trim()
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
    .replace(" ", "T");

  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? null : ms;
}

function normalizeExifFile(dir, name, logger) {
  const exifPath = join(dir, "exif.json");
  if (!existsSync(exifPath)) return;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(exifPath, "utf-8"));
  } catch {
    logger.warn(`[travel] 跳过 ${name}（exif.json 不是合法 JSON）`);
    return;
  }

  if (!Array.isArray(parsed)) {
    logger.warn(`[travel] 跳过 ${name}（exif.json 顶层不是数组）`);
    return;
  }

  const normalized = parsed.map((item) => {
    if (!item || typeof item !== "object") return item;

    const sourceName =
      (typeof item.original === "string" && item.original) ||
      (typeof item.webp === "string" && item.webp) ||
      "";
    const fallbackDateTime = parseFilenameDateTime(sourceName);

    if (!item.date_time && fallbackDateTime) {
      return {
        ...item,
        date_time: fallbackDateTime,
      };
    }

    return item;
  });

  normalized.sort((a, b) => {
    const aTime = toTimestamp(a?.date_time);
    const bTime = toTimestamp(b?.date_time);

    if (aTime !== null && bTime !== null && aTime !== bTime) {
      return aTime - bTime;
    }
    if (aTime !== null && bTime === null) return -1;
    if (aTime === null && bTime !== null) return 1;

    const aName =
      (typeof a?.original === "string" && a.original) ||
      (typeof a?.webp === "string" && a.webp) ||
      "";
    const bName =
      (typeof b?.original === "string" && b.original) ||
      (typeof b?.webp === "string" && b.webp) ||
      "";

    return aName.localeCompare(bName, "en");
  });

  const before = JSON.stringify(parsed);
  const after = JSON.stringify(normalized);
  if (before === after) return;

  writeFileSync(exifPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  logger.info(`[travel] ℹ ${name}：已标准化 exif.json（补齐时间并稳定排序）`);
}

/** @returns {import('astro').AstroIntegration} */
export function travelPreprocess() {
  return {
    name: "travel-preprocess",
    hooks: {
      "astro:config:setup": ({ logger }) => {
        const travelRoot = join(process.cwd(), "src/content/travel");
        if (!existsSync(travelRoot)) return;

        const trips = readdirSync(travelRoot, { withFileTypes: true })
          .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
          .map((d) => ({ name: d.name, dir: join(travelRoot, d.name) }));

        if (trips.length === 0) return;

        const tripsWithRaw = trips.filter(({ dir }) => findRawImages(dir).length > 0);

        if (tripsWithRaw.length > 0) {
          logger.info(
            `[travel] 发现 ${tripsWithRaw.length} 个旅行文件夹有待处理的原图`
          );
        }

        for (const { name, dir } of tripsWithRaw) {
          const rawCount = findRawImages(dir).length;
          try {
            execFileSync(
              "exif-catcher",
              ["--in-place", "-q", "80", "-y"],
              { cwd: dir, stdio: "pipe" }
            );
            const webpCount = existsSync(join(dir, "img"))
              ? readdirSync(join(dir, "img")).filter((f) =>
                  f.endsWith(".webp")
                ).length
              : 0;
            logger.info(
              `[travel] ✓ ${name}：${rawCount} 张原图 → ${webpCount} 张 WebP`
            );
          } catch {
            logger.warn(
              `[travel] 跳过 ${name}（exif-catcher 未安装或运行失败）`
            );
          }
        }

        for (const { name, dir } of trips) {
          normalizeExifFile(dir, name, logger);
        }
      },
    },
  };
}
