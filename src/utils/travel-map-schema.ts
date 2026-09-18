/**
 * 旅行行程地图的数据形状。
 *
 * 分两层：
 * - TravelMapFrontmatterSchema：作者手写的部分（day/color/stops），直接写
 *   在博客文章的 frontmatter 里（`map:` 字段），由 blogCollection 的 schema
 *   校验，remark-travel-map.mjs 再做一次防御性校验。
 * - route：机器生成的部分，由 scripts/build-travel-routes.mjs 离线跑出来，
 *   存成 src/data/routes/<translationKey>.json 里的 encoded polyline 字符串，
 *   remark-travel-map.mjs 在 build 时解码后合并进最终交给客户端的数据里。
 *   不进 zod 校验——这是我们自己生成的可信数据，不是作者手写的输入边界。
 *
 * 客户端（travel-map-client.ts）只 import type，zod 本身不进浏览器 bundle。
 */
import { z } from 'zod';

/** GeoJSON 顺序：[经度, 纬度]。 */
export const CoordSchema = z.tuple([z.number(), z.number()]);

export const StopSchema = z.object({
  name: z.string(),
  coords: CoordSchema,
  note: z.string().optional(),
});

export const FrontmatterDaySchema = z.object({
  day: z.number(),
  color: z.string(),
  stops: z.array(StopSchema).min(1),
  /**
   * 是否需要贴路的 route 几何——只有真正跨城市/自驾的一天才该设 true。
   * 城市内靠地铁/步行走的一天，直接留空按 stops 顺序连直线更诚实。
   * 只被 scripts/build-travel-routes.mjs 读取，不会出现在最终客户端数据里。
   */
  road: z.boolean().optional(),
});

export const TravelMapFrontmatterSchema = z.object({
  days: z.array(FrontmatterDaySchema).min(1),
  center: CoordSchema.optional(),
  zoom: z.number().optional(),
  basemap: z.string().optional(),
});

export type Coord = z.infer<typeof CoordSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type FrontmatterDay = z.infer<typeof FrontmatterDaySchema>;
export type TravelMapFrontmatter = z.infer<typeof TravelMapFrontmatterSchema>;

/** 合并了 route 几何之后、最终交给客户端渲染的形状。 */
export type Day = Omit<FrontmatterDay, 'road'> & { route?: Coord[] };
export type TravelMapData = Omit<TravelMapFrontmatter, 'days'> & { days: Day[] };

/** scripts/build-travel-routes.mjs 生成、remark-travel-map.mjs 读取的路线文件形状。 */
export type RouteFile = Record<string, string>;
