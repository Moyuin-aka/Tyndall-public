import { defineCollection, z } from 'astro:content';
import { TravelMapFrontmatterSchema } from '../utils/travel-map-schema';

const blogCollection = defineCollection({
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Transform string to Date object
    lang: z.enum(['zh', 'en']).default('zh'),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    translationKey: z.string().optional(), // 同一篇多语言的配对键
    category: z.string().optional(), // 文章分类
    published: z.boolean().default(true), // 是否发布，默认为 true
    map: TravelMapFrontmatterSchema.optional(), // 旅行行程地图数据，配合正文里的 ::travel-map
  }),
});

const travelCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    when: z.string(),
    where: z.string(),
  }),
});

export const collections = {
  'blog': blogCollection,
  'travel': travelCollection,
};
