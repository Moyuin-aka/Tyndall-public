// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import { travelPreprocess } from './src/integrations/travel-preprocess.mjs';
import { travelRoutesWatch } from './src/integrations/travel-routes-watch.mjs';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';
import { remarkAppleMusic } from './src/utils/remark-apple-music.mjs';
import { remarkTyndallDirectives } from './src/utils/remark-tyndall-directives.mjs';
import { remarkTravelMap } from './src/utils/remark-travel-map.mjs';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import { rehypeOptimizeImages } from './src/utils/rehype-optimize-images.mjs';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://example.com',
  output: 'static',
  adapter: vercel({}),
  vite: {
    optimizeDeps: {
      include: ['marked', 'sanitize-html'],
    },
  },
  integrations: [sitemap(), travelPreprocess(), travelRoutesWatch()],
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'zh',
    routing: {
      prefixDefaultLocale: false
    }
  },
  markdown: {
    // Keep source punctuation intact. Astro's default smartypants turns straight
    // quotes into typographic quotes, which breaks mixed CJK/English content.
    smartypants: false,
    // remarkDirective must precede remarkAppleMusic / remarkTyndallDirectives /
    // remarkTravelMap: it parses ::apple-music{...}, :kbd[...] / :::details,
    // and ::travel-map{...} syntax into the directive nodes those plugins transform.
    remarkPlugins: [remarkMath, remarkBreaks, remarkDirective, remarkAppleMusic, remarkTyndallDirectives, remarkTravelMap],
    rehypePlugins: [
      [rehypeKatex, {
        strict: false,  // 容错模式
        throwOnError: false, // 出错时不抛出异常
      }],
      rehypeSlug, // 为标题添加 ID，支持锚点跳转（例如：#标题名）
      rehypeOptimizeImages, // 为图片添加懒加载和优化属性
    ],
    shikiConfig: {
      // 双主题配置：Light + Dark
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      // 默认使用 CSS 变量切换主题
      defaultColor: false,
      wrap: false,
    }
  },
});
