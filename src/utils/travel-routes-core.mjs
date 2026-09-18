/**
 * 行程路线生成的共享核心逻辑。
 *
 * 两个调用方：
 * - scripts/build-travel-routes.mjs：手动 CLI，`pnpm routes:build <关键字>`。
 * - src/integrations/travel-routes-watch.mjs：dev server 里的自动 watcher，
 *   改完 frontmatter 保存就自动跑一遍。
 *
 * 不依赖 travel-map-schema.ts 的 zod schema——这个文件会被 scripts/ 下的
 * CLI 用纯 Node（不经过 Vite/esbuild）直接 `node scripts/xxx.mjs` 执行，
 * Node 无法直接 import .ts 文件，所以这里只做轻量的 duck-typing 校验；
 * 真正严格的 schema 校验交给 content/config.ts + remark-travel-map.mjs，
 * 它们运行在 Astro 的构建图里，import .ts 没问题。
 *
 * YAML 解析失败（比如正在手敲、还没写完）当成"暂时没有数据"直接跳过，
 * 不抛错——这是留给交互式编辑场景的容错，不代表数据真的没问题；
 * 真正的强校验发生在 build 时。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import polyline from '@mapbox/polyline';

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BLOG_DIR = path.join(PROJECT_ROOT, 'src/content/blog');
export const ROUTES_DIR = path.join(PROJECT_ROOT, 'src/data/routes');

export function findMdFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(findMdFiles(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

function isUsableDay(day) {
  return (
    day &&
    typeof day.day !== 'undefined' &&
    day.road === true &&
    Array.isArray(day.stops) &&
    day.stops.length >= 2 &&
    day.stops.every((s) => Array.isArray(s?.coords) && s.coords.length === 2)
  );
}

async function fetchRoute(stopCoords) {
  const coordsParam = stopCoords.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const body = await res.json();
  if (body.code !== 'Ok') {
    throw new Error(`OSRM 返回 ${body.code}: ${body.message ?? '未知错误'}`);
  }
  return body.routes[0].geometry.coordinates; // [lng, lat][]
}

function roadDaysHash(days) {
  const relevant = days
    .filter(isUsableDay)
    .map((d) => ({ day: d.day, stops: d.stops.map((s) => s.coords) }));
  return crypto.createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 16);
}

/**
 * @param {string} filePath
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{
 *   status: 'no-map' | 'invalid' | 'no-road' | 'unchanged' | 'generated' | 'error',
 *   routeId?: string,
 *   error?: string,
 * }>}
 */
export async function buildRoutesForFile(filePath, { force = false } = {}) {
  const frontmatter = parseFrontmatter(filePath);
  if (!frontmatter || typeof frontmatter !== 'object') return { status: 'invalid' };
  if (!frontmatter.map || !Array.isArray(frontmatter.map.days)) return { status: 'no-map' };

  const roadDays = frontmatter.map.days.filter(isUsableDay);
  if (roadDays.length === 0) return { status: 'no-road' };

  const routeId = frontmatter.translationKey || path.basename(filePath, '.md');
  const hash = roadDaysHash(frontmatter.map.days);
  const outPath = path.join(ROUTES_DIR, `${routeId}.json`);

  if (!force && fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
      if (existing._hash === hash) return { status: 'unchanged', routeId };
    } catch {
      // 已有文件读不出来就当作需要重新生成
    }
  }

  const output = { _hash: hash };
  for (const day of roadDays) {
    try {
      const coords = await fetchRoute(day.stops.map((s) => s.coords));
      // @mapbox/polyline 的 encode() 要 [纬度, 经度]，跟 GeoJSON 顺序相反
      output[String(day.day)] = polyline.encode(coords.map(([lng, lat]) => [lat, lng]));
    } catch (err) {
      return { status: 'error', routeId, error: err instanceof Error ? err.message : String(err) };
    }
  }

  fs.mkdirSync(ROUTES_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output) + '\n');
  return { status: 'generated', routeId };
}

/**
 * 路线文件写完后，原样重写一遍源 .md（内容不变，只刷新 mtime），
 * 让 Astro 的 content layer 感知到变化、重新渲染这篇文章、触发页面刷新。
 * 只应该在 buildRoutesForFile 返回 'generated'（哈希真的变了）时调用——
 * 内容没变就不重写，否则会跟 watcher 自己的文件变更事件形成死循环。
 */
export function touchFile(filePath) {
  fs.writeFileSync(filePath, fs.readFileSync(filePath));
}
