/**
 * Rehype 插件：为图片自动添加懒加载和优化属性
 */
import { visit } from 'unist-util-visit';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

// Metadata reads are cheap (sharp only parses the header) but a full site
// build re-visits the same images across many pages, so cache by path.
const dimensionCache = new Map();

async function getLocalImageDimensions(src) {
  if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return null;
  }
  // Only handle root-relative paths that resolve into public/ — anything
  // else (relative paths, unknown schemes) is left alone rather than guessed.
  if (!src.startsWith('/')) return null;

  if (dimensionCache.has(src)) return dimensionCache.get(src);

  const filePath = path.join(PUBLIC_DIR, decodeURIComponent(src));
  let dimensions = null;
  try {
    if (fs.existsSync(filePath)) {
      const meta = await sharp(filePath).metadata();
      if (meta.width && meta.height) {
        dimensions = { width: meta.width, height: meta.height };
      }
    }
  } catch {
    dimensions = null;
  }

  dimensionCache.set(src, dimensions);
  return dimensions;
}

export function rehypeOptimizeImages() {
  return async (tree) => {
    const imgNodes = [];
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img') imgNodes.push(node);
    });

    await Promise.all(
      imgNodes.map(async (node) => {
        // 添加懒加载
        node.properties.loading = 'lazy';
        // 添加异步解码
        node.properties.decoding = 'async';
        // 添加 alt 如果不存在
        if (!node.properties.alt) {
          node.properties.alt = '';
        }

        // Reserve layout space for local images so they don't shift content
        // as they lazy-load in (remote images are left alone — fetching
        // their dimensions at build time would make builds slow/flaky).
        if (!node.properties.width && !node.properties.height) {
          const dimensions = await getLocalImageDimensions(node.properties.src);
          if (dimensions) {
            node.properties.width = dimensions.width;
            node.properties.height = dimensions.height;
          }
        }
      }),
    );
  };
}
