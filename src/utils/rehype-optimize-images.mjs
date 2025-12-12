/**
 * Rehype 插件：为图片自动添加懒加载和优化属性
 */
import { visit } from 'unist-util-visit';

export function rehypeOptimizeImages() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img') {
        // 添加懒加载
        node.properties.loading = 'lazy';
        // 添加异步解码
        node.properties.decoding = 'async';
        // 添加 alt 如果不存在
        if (!node.properties.alt) {
          node.properties.alt = '';
        }
      }
    });
  };
}
