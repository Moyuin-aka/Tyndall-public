// Mermaid 客户端初始化脚本
// 用于在浏览器中渲染 Mermaid 图表

let mermaidInitialized = false;
let mermaidModule: any = null;

async function initMermaid() {
  try {
    // 只在第一次加载 Mermaid 模块
    if (!mermaidModule) {
      const module = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
      mermaidModule = module.default;
      console.log('Mermaid module loaded');
    }
    
    // 检测当前主题
    const isDark = document.documentElement.classList.contains('dark');
    
    // 配置 Mermaid
    mermaidModule.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'var(--font-sans, sans-serif)',
    });
    
    // 查找所有未处理的 mermaid 代码块
    const mermaidBlocks = document.querySelectorAll('pre:has(> code.language-mermaid)');
    
    if (mermaidBlocks.length === 0) {
      console.log('No Mermaid blocks found');
      return;
    }
    
    console.log(`Found ${mermaidBlocks.length} Mermaid blocks`);
    
    for (const pre of mermaidBlocks) {
      const code = pre.querySelector('code.language-mermaid');
      if (!code) continue;
      
      // 创建一个 div 来替换 pre 标签
      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      div.textContent = code.textContent || '';
      div.style.textAlign = 'center';
      div.style.margin = '2em 0';
      
      // 替换原来的 pre 标签
      pre.replaceWith(div);
    }
    
    // 渲染所有 Mermaid 图表
    await mermaidModule.run({
      querySelector: '.mermaid-diagram',
    });
    
    mermaidInitialized = true;
    console.log('Mermaid initialized and rendered successfully');
  } catch (error) {
    console.error('Failed to initialize Mermaid:', error);
  }
}

// 主题切换时重新渲染
async function handleThemeChange() {
  if (!mermaidModule) return;
  
  const isDark = document.documentElement.classList.contains('dark');
  
  // 重新配置主题
  mermaidModule.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'var(--font-sans, sans-serif)',
  });
  
  // 查找所有已渲染的 Mermaid 图表并重新渲染
  const diagrams = document.querySelectorAll('.mermaid-diagram');
  for (const diagram of diagrams) {
    // 清空现有内容
    const textContent = diagram.getAttribute('data-original-code') || diagram.textContent;
    diagram.innerHTML = '';
    diagram.textContent = textContent || '';
  }
  
  await mermaidModule.run({
    querySelector: '.mermaid-diagram',
  });
  
  console.log('Mermaid theme updated');
}

// 页面加载时初始化
function onPageLoad() {
  // 稍微延迟以确保 DOM 完全加载
  setTimeout(initMermaid, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onPageLoad);
} else {
  onPageLoad();
}

// Astro 页面切换时重新初始化
document.addEventListener('astro:page-load', onPageLoad);

// 监听主题变化
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.attributeName === 'class') {
      const isDark = document.documentElement.classList.contains('dark');
      const wasDark = mutation.oldValue?.includes('dark');
      if (isDark !== wasDark) {
        handleThemeChange();
      }
    }
  }
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeOldValue: true,
  attributeFilter: ['class'],
});

