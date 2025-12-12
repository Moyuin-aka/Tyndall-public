/**
 * 智能预加载系统
 * 管理页面资源加载，避免重复加载
 */

interface PageFeatures {
  hasMermaid?: boolean;
  hasLatex?: boolean;
}

// 已加载的资源缓存
const loadedResources = new Set<string>();

/**
 * 确保 KaTeX CSS 已加载
 */
function ensureKatexLoaded(): void {
  const katexUrl = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  
  if (loadedResources.has('katex')) return;
  
  // 检查是否已经有 KaTeX 样式表
  if (document.querySelector(`link[href="${katexUrl}"]`)) {
    loadedResources.add('katex');
    return;
  }
  
  // 如果没有，不做任何操作（由页面的按需加载处理）
  // 这里只记录状态
}

/**
 * 确保 Mermaid 已加载
 */
function ensureMermaidLoaded(): void {
  if (loadedResources.has('mermaid')) return;
  
  // Mermaid 由 blog-enhancements.ts 按需动态导入
  // 这里只记录状态
}

/**
 * 初始化资源管理
 */
export function initSmartPreload(): void {
  // 简化为资源状态管理，不做额外的预加载
  // 避免与页面按需加载冲突
}

/**
 * 管理当前页面的资源
 */
export function preloadCurrentPageResources(): void {
  const features = (window as any).__pageFeatures as PageFeatures;
  
  if (features?.hasLatex) {
    ensureKatexLoaded();
  }
  
  if (features?.hasMermaid) {
    ensureMermaidLoaded();
  }
}

// 自动初始化
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      preloadCurrentPageResources();
    });
  } else {
    preloadCurrentPageResources();
  }
  
  // 支持 View Transitions
  document.addEventListener('astro:page-load', () => {
    preloadCurrentPageResources();
  });
}
