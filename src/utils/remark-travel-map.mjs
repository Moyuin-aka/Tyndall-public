/**
 * Remark 插件：在 Markdown 正文里标出旅行行程地图的位置
 *
 * 配合 remark-directive 使用，写法（不带任何属性，只是个位置标记）：
 *   ::travel-map
 *   ::travel-map{height="560"}
 *
 * 数据本身不写在这里、也不写在 directive 属性里，而是来自当前文章的
 * frontmatter（`map:` 字段，schema 见 travel-map-schema.ts）——这部分是作者
 * 手写、常改、要求 diff 干净的内容，交给 Astro 的 content collection schema
 * 校验，比自己读写外部 JSON 文件更顺。
 *
 * Astro 的 markdown 渲染管线会把校验过的 frontmatter 挂在
 * vfile.data.astro.frontmatter 上（见 @astrojs/markdown-remark 的
 * render()：`data: { astro: { frontmatter: renderOpts.frontmatter } }`），
 * 所以这里可以直接读，不用重新解析文件。
 *
 * 如果某天在 frontmatter 里标了 `road: true`，说明这天是真的跨城市/自驾，
 * 需要贴着真实道路画线——对应的 encoded polyline 由
 * scripts/build-travel-routes.mjs 离线生成在
 * src/data/routes/<translationKey>.json 里，这里读出来解码后合并进
 * day.route。没有 road:true 的天，就不找 route，交给客户端按 stops 顺序连
 * 直线（对市内地铁/步行行程更诚实）。
 *
 * frontmatter 数据有问题时直接抛出，让 build 失败并指出具体文件和字段，
 * 这是作者行程数据的手误，不是可能的外部输入，不适合静默降级。
 */
import { visit } from 'unist-util-visit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import polyline from '@mapbox/polyline';
import { TravelMapFrontmatterSchema } from './travel-map-schema.ts';

const DEFAULT_HEIGHT = 620;
const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ROUTES_ROOT = path.join(PROJECT_ROOT, 'src/data/routes');

function readRouteFile(routeId) {
  const routePath = path.join(ROUTES_ROOT, `${routeId}.json`);
  try {
    return JSON.parse(fs.readFileSync(routePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function remarkTravelMap() {
  return (tree, file) => {
    visit(tree, (node) => {
      if (
        (node.type === 'leafDirective' || node.type === 'containerDirective') &&
        node.name === 'travel-map'
      ) {
        const attrs = node.attributes || {};
        const data = node.data || (node.data = {});
        const frontmatter = file.data?.astro?.frontmatter ?? {};

        if (!frontmatter.map) {
          throw new Error(
            `[travel-map] ${file.path}: 正文里写了 ::travel-map，但 frontmatter 没有 map 字段`,
          );
        }

        const result = TravelMapFrontmatterSchema.safeParse(frontmatter.map);
        if (!result.success) {
          const issues = result.error.issues
            .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('\n');
          throw new Error(`[travel-map] ${file.path} 的 frontmatter.map 未通过校验:\n${issues}`);
        }

        const routeId = frontmatter.translationKey || path.basename(file.path, path.extname(file.path));
        const routeFile = readRouteFile(routeId);

        const days = result.data.days.map(({ road, ...day }) => {
          const encoded = routeFile?.[String(day.day)];
          if (!encoded) return day;
          // @mapbox/polyline 解码出来是 [纬度, 经度]，要翻转成 GeoJSON 的 [经度, 纬度]
          const route = polyline.decode(encoded).map(([lat, lng]) => [lng, lat]);
          return { ...day, route };
        });

        const height = Number(attrs.height) || DEFAULT_HEIGHT;
        const payload = { ...result.data, days };
        // 转义 < 防止行程 note 里出现 </script> 把标签截断
        const json = JSON.stringify(payload).replace(/</g, '\\u003c');

        data.hName = 'div';
        data.hProperties = {
          className: ['travel-map-embed'],
          'data-travel-map': true,
          style: `--tm-height:${height}px`,
        };
        data.hChildren = [
          {
            type: 'element',
            tagName: 'script',
            properties: { type: 'application/json' },
            children: [{ type: 'text', value: json }],
          },
        ];
      }
    });
  };
}
