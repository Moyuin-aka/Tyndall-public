import type { CollectionEntry } from "astro:content";
import type { ImageMetadata } from "astro";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ExifItem {
  original?: string;
  webp?: string;
  make?: string;
  model?: string;
  lens?: string;
  iso?: string;
  shutter_speed?: string;
  aperture?: string;
  focal_length?: string;
  date_time?: string;
  width?: number;
  height?: number;
}

export interface TravelEntryWithPhotos {
  entry: CollectionEntry<"travel">;
  photos: ImageMetadata[];
  exifData: ExifItem[];
}

/** Lightweight photo reference from R2 — no Astro image pipeline needed. */
export interface R2Photo {
  url: string;
  width: number;
  height: number;
}

export interface R2TravelEntry {
  entry: CollectionEntry<"travel">;
  photos: R2Photo[];
  exifData: ExifItem[];
}

type PhotoModules = Record<string, { default: ImageMetadata }>;

interface PhotoFrame {
  fileName: string;
  photo: ImageMetadata;
  exif: ExifItem;
  capturedAt: number | null;
}

function parseExifDateTime(dateTime?: string): number | null {
  if (!dateTime) return null;

  const normalized = dateTime
    .trim()
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
    .replace(" ", "T");

  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? null : ms;
}

function parseFilenameTimestamp(fileName: string): number | null {
  const match = fileName.match(/(\d{8})[_-]?(\d{6})/);
  if (!match) return null;

  const [, ymd, hms] = match;
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  const hour = Number(hms.slice(0, 2));
  const minute = Number(hms.slice(2, 4));
  const second = Number(hms.slice(4, 6));

  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function loadExifData(slug: string): ExifItem[] {
  const exifPath = join(process.cwd(), "src/content/travel", slug, "exif.json");
  if (!existsSync(exifPath)) return [];

  try {
    const parsed = JSON.parse(readFileSync(exifPath, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sortFrames(a: PhotoFrame, b: PhotoFrame): number {
  if (a.capturedAt !== null && b.capturedAt !== null && a.capturedAt !== b.capturedAt) {
    return a.capturedAt - b.capturedAt;
  }

  if (a.capturedAt !== null && b.capturedAt === null) return -1;
  if (a.capturedAt === null && b.capturedAt !== null) return 1;

  return a.fileName.localeCompare(b.fileName, "en");
}

export function buildTravelEntries(
  rawEntries: CollectionEntry<"travel">[],
  allPhotoModules: PhotoModules,
): TravelEntryWithPhotos[] {
  const mapped = rawEntries.map((entry) => {
    const exifData = loadExifData(entry.slug);
    const exifByWebp = new Map(
      exifData
        .filter((item): item is ExifItem & { webp: string } => Boolean(item.webp))
        .map((item) => [item.webp, item]),
    );

    const frames = Object.entries(allPhotoModules)
      .filter(([key]) => key.includes(`/travel/${entry.slug}/img/`))
      .map(([key, module]) => {
        const fileName = key.slice(key.lastIndexOf("/") + 1);
        const exif = exifByWebp.get(fileName) ?? { webp: fileName };
        const capturedAt =
          parseExifDateTime(exif.date_time) ?? parseFilenameTimestamp(fileName);

        return {
          fileName,
          photo: module.default,
          exif,
          capturedAt,
        } satisfies PhotoFrame;
      })
      .sort(sortFrames);

    return {
      entry,
      photos: frames.map((frame) => frame.photo),
      exifData: frames.map((frame) => frame.exif),
      firstCapturedAt: frames[0]?.capturedAt ?? 0, // Used for tie-breaking
    } as TravelEntryWithPhotos & { firstCapturedAt: number };
  });

  return mapped.sort((a, b) => {
    // Primary sort: descending by 'when' text (e.g. '2025-07' defaults to be above '2024-12')
    const whenCmp = b.entry.data.when.localeCompare(a.entry.data.when);
    if (whenCmp !== 0) return whenCmp;

    // Secondary sort: if they have the same 'when' month text, sort by actual photo timestamp
    return b.firstCapturedAt - a.firstCapturedAt; // Descending (newer trip first in UI)
  });
}

// ---- R2-backed travel entries (no local images needed) -----------------------

interface R2Frame {
  fileName: string;
  exif: ExifItem;
  capturedAt: number | null;
  width: number;
  height: number;
  url: string;
}

/**
 * Build travel entries driven purely by exif.json + a remote base URL.
 * No `import.meta.glob`, no Astro ImageMetadata — the R2 photos bucket is
 * the canonical image source. Dimensions come from exif.json (populated by
 * the CMS browser-side EXIF extractor or the legacy exif-catcher), falling
 * back to a sensible default so the carousel never renders at 0×0.
 *
 * The image URL convention: `{baseUrl}/travel/{slug}/img/{webp}`
 * which matches the CMS's `PUBLIC_BASE/travel/<slug>/img/<name>` R2 key.
 */
export function buildTravelEntriesFromR2(
  rawEntries: CollectionEntry<"travel">[],
  baseUrl = "/examples",
): R2TravelEntry[] {
  const mapped = rawEntries.map((entry) => {
    const exifData = loadExifData(entry.slug);

    const frames: R2Frame[] = exifData
      .filter((item): item is ExifItem & { webp: string } => Boolean(item.webp))
      .map((item) => {
        const fileName = item.webp;
        const capturedAt =
          parseExifDateTime(item.date_time) ?? parseFilenameTimestamp(fileName);

        return {
          fileName,
          exif: item,
          capturedAt,
          width: item.width ?? 4096,
          height: item.height ?? 3072,
          url: `${baseUrl}/travel/${entry.slug}/img/${encodeURIComponent(fileName)}`,
        };
      })
      .sort((a, b) => {
        if (
          a.capturedAt !== null &&
          b.capturedAt !== null &&
          a.capturedAt !== b.capturedAt
        ) {
          return a.capturedAt - b.capturedAt;
        }
        if (a.capturedAt !== null && b.capturedAt === null) return -1;
        if (a.capturedAt === null && b.capturedAt !== null) return 1;
        return a.fileName.localeCompare(b.fileName, "en");
      });

    return {
      entry,
      photos: frames.map((f) => ({ url: f.url, width: f.width, height: f.height })),
      exifData: frames.map((f) => f.exif),
      _firstCapturedAt: frames[0]?.capturedAt ?? 0,
    } as R2TravelEntry & { _firstCapturedAt: number };
  });

  return mapped.sort((a, b) => {
    const whenCmp = b.entry.data.when.localeCompare(a.entry.data.when);
    if (whenCmp !== 0) return whenCmp;
    return b._firstCapturedAt - a._firstCapturedAt;
  }) as R2TravelEntry[];
}