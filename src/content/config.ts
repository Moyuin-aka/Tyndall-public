import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    lang: z.enum(['zh', 'en']).default('zh'),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    translationKey: z.string().optional(), // 同一篇多语言的配对键
    category: z.string().optional(), 
    published: z.boolean().default(true), 
  }),
});

export const collections = {
  'blog': blogCollection,
};
