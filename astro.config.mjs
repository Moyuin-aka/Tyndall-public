// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/static';
import sitemap from '@astrojs/sitemap';
import prefetch from '@astrojs/prefetch';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourdomain.com', // 替换为你的域名
  output: 'static', 
  adapter: vercel({}), 
  integrations: [sitemap(), prefetch()],
  i18n: { 
    locales: ['en', 'zh'], 
    defaultLocale: 'zh',
    routing: {
      prefixDefaultLocale: false
    }
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  // 优化预加载策略
  prefetch: {
    prefetchAll: true, // 预加载所有链接
    defaultStrategy: 'hover', // hover 时预加载
  },
  // 优化 View Transitions
  experimental: {
    clientPrerender: true, // 客户端预渲染
  },
});