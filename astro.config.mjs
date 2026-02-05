// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import { rehypeOptimizeImages } from './src/utils/rehype-optimize-images.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://moyuin.top',
  output: 'static',
  integrations: [sitemap()],
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'zh',
    routing: {
      prefixDefaultLocale: false
    }
  },
  markdown: {
    remarkPlugins: [remarkMath, remarkBreaks],
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
