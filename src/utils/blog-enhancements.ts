/**
 * 博客页面增强功能
 * 统一处理 Mermaid 图表、表格包装和代码块增强
 */

interface BlogEnhancements {
  initMermaid: () => Promise<void>;
  wrapTables: () => void;
  enhanceCodeBlocks: () => void;
  addImageCaptions: () => void;
  initializeAll: () => void;
}

// Mermaid 类型定义
interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  run: (config: { querySelector: string }) => Promise<void>;
}

// Mermaid 模块缓存
let mermaidModule: MermaidAPI | null = null;
let mermaidInitialized = false;
let resizeTimeout: number | null = null;

/**
 * 获取响应式 Mermaid 配置
 */
function getMermaidConfig() {
  const isDark = document.documentElement.classList.contains('dark');
  const isMobile = window.innerWidth <= 768;

  return {
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'var(--font-sans, sans-serif)',
    flowchart: {
      useMaxWidth: true,
    },
    sequence: {
      useMaxWidth: true,
    },
    gantt: {
      titleTopMargin: 25,
      barHeight: 20,
      barGap: 4,
      topPadding: 50,
      leftPadding: 75,
      gridLineStartPadding: 35,
      fontSize: 11,
      sectionFontSize: 11,
      numberSectionStyles: 4,
      axisFormat: '%Y-%m-%d',
      useWidth: isMobile ? 600 : 1000,
    },
    journey: {
      useMaxWidth: true,
    },
    timeline: {
      useMaxWidth: true,
    },
    gitGraph: {
      useMaxWidth: true,
    },
    class: {
      useMaxWidth: true,
    },
    state: {
      useMaxWidth: true,
    },
    pie: {
      useMaxWidth: true,
    },
  };
}

/**
 * 渲染或重新渲染 Mermaid 图表
 */
async function renderMermaid(): Promise<void> {
  if (!mermaidModule) return;

  const config = getMermaidConfig();
  mermaidModule.initialize(config);

  const diagrams = document.querySelectorAll('.mermaid-diagram');

  if (diagrams.length === 0) return;

  // 收集所有原始代码和父元素
  const diagramData: Array<{ code: string; parent: HTMLElement; nextSibling: Node | null }> = [];

  for (const diagram of diagrams) {
    const originalCode = diagram.getAttribute('data-original-code');
    if (!originalCode) continue;

    const parent = diagram.parentElement;
    const nextSibling = diagram.nextSibling;

    if (!parent) continue;

    diagramData.push({ code: originalCode, parent, nextSibling });

    // 完全移除旧的图表
    diagram.remove();
  }

  // 等待 DOM 更新
  await new Promise(resolve => setTimeout(resolve, 50));

  // 创建新的图表元素
  for (const { code, parent, nextSibling } of diagramData) {
    const newDiv = document.createElement('div');
    newDiv.className = 'mermaid-diagram';
    newDiv.textContent = code;
    newDiv.setAttribute('data-original-code', code);
    newDiv.style.textAlign = 'center';
    newDiv.style.margin = '2em 0';
    newDiv.style.opacity = '0'; // 先隐藏，渲染完成后再显示
    newDiv.style.transition = 'opacity 0.2s ease';

    // 插入到正确的位置
    if (nextSibling) {
      parent.insertBefore(newDiv, nextSibling);
    } else {
      parent.appendChild(newDiv);
    }
  }

  // 再等待一下确保 DOM 完全更新
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    await mermaidModule.run({
      querySelector: '.mermaid-diagram',
    });

    // 渲染完成后显示图表
    const renderedDiagrams = document.querySelectorAll('.mermaid-diagram');
    renderedDiagrams.forEach(diagram => {
      (diagram as HTMLElement).style.opacity = '1';
    });
  } catch (error) {
    console.error('Mermaid render error:', error);
    // 即使出错也显示元素，避免一直隐藏
    const renderedDiagrams = document.querySelectorAll('.mermaid-diagram');
    renderedDiagrams.forEach(diagram => {
      (diagram as HTMLElement).style.opacity = '1';
    });
  }
}

/**
 * 处理窗口大小变化
 */
function handleResize(): void {
  if (!mermaidModule || !mermaidInitialized) return;

  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  resizeTimeout = window.setTimeout(() => {
    renderMermaid();
  }, 300);
}

/**
 * 初始化 Mermaid
 */
async function initMermaid(): Promise<void> {
  // 提前检测：如果页面没有 Mermaid 图表，立即退出，避免加载模块
  const mermaidBlocks = document.querySelectorAll<HTMLPreElement>('pre[data-language="mermaid"], .language-mermaid');
  if (mermaidBlocks.length === 0) {
    return;
  }

  try {
    if (!mermaidModule) {
      // 使用动态导入
      // @ts-ignore - CDN 导入不需要类型声明
      const module = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
      mermaidModule = module.default as MermaidAPI;
    }

    if (!mermaidModule) {
      console.error('Failed to load Mermaid module');
      return;
    }

    // 使用响应式配置初始化
    mermaidModule.initialize(getMermaidConfig());

    const blocks = document.querySelectorAll<HTMLPreElement>('pre[data-language="mermaid"]');

    if (blocks.length === 0) {
      return;
    }

    for (const pre of blocks) {
      const code = pre.querySelector('code');
      if (!code) continue;

      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      const originalCode = code.textContent || '';
      div.textContent = originalCode;
      div.setAttribute('data-original-code', originalCode);
      div.style.textAlign = 'center';
      div.style.margin = '2em 0';

      pre.replaceWith(div);
    }

    await mermaidModule.run({
      querySelector: '.mermaid-diagram',
    });

    mermaidInitialized = true;

    // 注册窗口大小变化监听器（只注册一次）
    if (!(window as any).__mermaidResizeListenerAdded) {
      window.addEventListener('resize', handleResize);
      (window as any).__mermaidResizeListenerAdded = true;
    }
  } catch (error) {
    console.error('Failed to initialize Mermaid:', error);
  }
}

/**
 * 为表格添加滚动容器包装器
 */
function wrapTables(): void {
  const tables = document.querySelectorAll<HTMLTableElement>('.markdown-content table');

  tables.forEach(table => {
    if (table.parentElement?.classList.contains('table-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

/**
 * 为代码块添加语言标签和复制按钮
 */
function enhanceCodeBlocks(): void {
  // 选择所有可能的代码块（包括 Astro 默认的 .astro-code）
  const codeBlocks = document.querySelectorAll<HTMLPreElement>('.markdown-content pre, .markdown-content .astro-code');

  codeBlocks.forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block-wrapper')) {
      return;
    }

    // 检测 Mermaid 图表（多种方式）
    const dataLanguage = pre.getAttribute('data-language');
    const classAttr = pre.className || '';
    if (dataLanguage === 'mermaid' || classAttr.includes('language-mermaid')) {
      return;
    }

    // 从多个可能的属性中获取语言信息
    let language = dataLanguage || pre.getAttribute('class')?.match(/language-(\w+)/)?.[1] || '';

    // 如果没有从 pre 标签获取到，尝试从 code 标签获取
    if (!language) {
      const code = pre.querySelector('code');
      if (code) {
        const codeClass = code.className || '';
        language = codeClass.match(/language-(\w+)/)?.[1] || '';
      }
    }

    // 如果还是没有，默认为 text
    if (!language) {
      language = 'text';
    }

    // 语言名称规范化映射
    const languageDisplayNames: Record<string, string> = {
      // 编程语言
      'javascript': 'JavaScript',
      'js': 'JavaScript',
      'typescript': 'TypeScript',
      'ts': 'TypeScript',
      'python': 'Python',
      'py': 'Python',
      'rust': 'Rust',
      'go': 'Go',
      'golang': 'Go',
      'java': 'Java',
      'kotlin': 'Kotlin',
      'swift': 'Swift',
      'csharp': 'C#',
      'cs': 'C#',
      'cpp': 'C++',
      'c': 'C',
      'ruby': 'Ruby',
      'rb': 'Ruby',
      'php': 'PHP',
      'scala': 'Scala',
      'dart': 'Dart',
      'lua': 'Lua',
      'perl': 'Perl',
      'r': 'R',
      'julia': 'Julia',
      'elixir': 'Elixir',
      'haskell': 'Haskell',
      'clojure': 'Clojure',
      'fsharp': 'F#',
      'ocaml': 'OCaml',
      'erlang': 'Erlang',
      'zig': 'Zig',
      'nim': 'Nim',
      'v': 'V',

      // Web 技术
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'jsx': 'JSX',
      'tsx': 'TSX',
      'vue': 'Vue',
      'svelte': 'Svelte',
      'astro': 'Astro',

      // 数据格式
      'json': 'JSON',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'toml': 'TOML',
      'csv': 'CSV',

      // Shell/脚本
      'bash': 'Bash',
      'sh': 'Shell',
      'shell': 'Shell',
      'zsh': 'Zsh',
      'powershell': 'PowerShell',
      'ps1': 'PowerShell',
      'bat': 'Batch',
      'cmd': 'CMD',

      // 数据库
      'sql': 'SQL',
      'mysql': 'MySQL',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'graphql': 'GraphQL',

      // 配置/文档
      'markdown': 'Markdown',
      'md': 'Markdown',
      'dockerfile': 'Dockerfile',
      'docker': 'Docker',
      'nginx': 'Nginx',
      'apache': 'Apache',
      'makefile': 'Makefile',
      'cmake': 'CMake',
      'ini': 'INI',
      'env': 'ENV',
      'properties': 'Properties',

      // 硬件描述语言
      'verilog': 'Verilog',
      'systemverilog': 'SystemVerilog',
      'sv': 'SystemVerilog',
      'vhdl': 'VHDL',
      'tcl': 'Tcl',

      // 汇编/底层
      'asm': 'Assembly',
      'assembly': 'Assembly',
      'nasm': 'NASM',
      'masm': 'MASM',
      'wasm': 'WebAssembly',
      'llvm': 'LLVM IR',

      // 移动开发
      'objectivec': 'Objective-C',
      'objc': 'Objective-C',
      'groovy': 'Groovy',

      // 模板/标记
      'latex': 'LaTeX',
      'tex': 'TeX',
      'rst': 'reStructuredText',
      'asciidoc': 'AsciiDoc',
      'handlebars': 'Handlebars',
      'hbs': 'Handlebars',
      'ejs': 'EJS',
      'pug': 'Pug',
      'jade': 'Jade',
      'liquid': 'Liquid',
      'twig': 'Twig',
      'jinja': 'Jinja',
      'jinja2': 'Jinja2',
      'mustache': 'Mustache',

      // 游戏/脚本
      'gdscript': 'GDScript',
      'glsl': 'GLSL',
      'hlsl': 'HLSL',
      'cuda': 'CUDA',
      'opencl': 'OpenCL',

      // 其他
      'regex': 'Regex',
      'regexp': 'Regex',
      'diff': 'Diff',
      'patch': 'Patch',
      'log': 'Log',
      'plaintext': 'Plain Text',
      'text': 'Text',
      'txt': 'Text',
      'output': 'Output',
      'console': 'Console',
      'terminal': 'Terminal',
    };

    const copyText = document.documentElement.lang === 'en' ? 'Copy' : '复制';
    const copiedText = document.documentElement.lang === 'en' ? 'Copied' : '已复制';
    const failedText = document.documentElement.lang === 'en' ? 'Failed' : '复制失败';

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    const header = document.createElement('div');
    header.className = 'code-block-header';

    const langLabel = document.createElement('span');
    langLabel.className = 'code-block-language';
    langLabel.textContent = languageDisplayNames[language.toLowerCase()] || language;

    const copyButton = document.createElement('button');
    copyButton.className = 'code-block-copy';
    copyButton.setAttribute('aria-label', copyText);
    copyButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span class="copy-text">${copyText}</span>
    `;

    copyButton.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code.textContent || '');

        copyButton.classList.add('copied');
        const textSpan = copyButton.querySelector('.copy-text');
        if (textSpan) {
          textSpan.textContent = copiedText;
        }

        setTimeout(() => {
          copyButton.classList.remove('copied');
          if (textSpan) {
            textSpan.textContent = copyText;
          }
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        const textSpan = copyButton.querySelector('.copy-text');
        if (textSpan) {
          textSpan.textContent = failedText;
          setTimeout(() => {
            textSpan.textContent = copyText;
          }, 2000);
        }
      }
    });

    header.appendChild(langLabel);
    header.appendChild(copyButton);

    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}

/**
 * 为 Markdown 图片添加说明文字
 */
function addImageCaptions(): void {
  const images = document.querySelectorAll<HTMLImageElement>('.markdown-content img');

  images.forEach((img) => {
    if (!img.alt || !img.alt.trim()) {
      return;
    }

    if (img.closest('figure.image-figure')) {
      return;
    }

    const wrapperTarget = img.parentElement?.tagName.toLowerCase() === 'a' ? img.parentElement : img;
    const parent = wrapperTarget?.parentElement;
    if (!wrapperTarget || !parent) {
      return;
    }

    if (parent.tagName.toLowerCase() === 'p') {
      const hasExtraContent = Array.from(parent.childNodes).some((node) => {
        if (node === wrapperTarget) return false;
        if (node.nodeType === Node.TEXT_NODE) {
          return (node.textContent || '').trim().length > 0;
        }
        return true;
      });

      if (hasExtraContent) {
        return;
      }
    }

    const figure = document.createElement('figure');
    figure.className = 'image-figure';

    const caption = document.createElement('figcaption');
    caption.textContent = img.alt;

    if (parent.tagName.toLowerCase() === 'p') {
      parent.replaceWith(figure);
    } else {
      parent.insertBefore(figure, wrapperTarget);
    }

    figure.appendChild(wrapperTarget);
    figure.appendChild(caption);
  });
}

/**
 * 初始化所有博客增强功能
 */
let initTimeout: number | null = null;

function initializeAll(): void {
  // 防抖：避免快速切换页面时重复执行
  // 100ms 延迟在快速切换时仍然响应迅速，但减少了不必要的重复执行
  if (initTimeout) {
    clearTimeout(initTimeout);
  }

  initTimeout = window.setTimeout(() => {
    enhanceCodeBlocks();
    wrapTables();
    addImageCaptions();
    // Mermaid 延迟初始化，避免阻塞主要功能
    setTimeout(() => {
      initMermaid();
    }, 100);
    initTimeout = null;
  }, 100);
}

// 监听主题变化，重新渲染 Mermaid
if (typeof document !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        const isDark = document.documentElement.classList.contains('dark');
        const oldValue = mutation.oldValue || '';
        const wasDark = oldValue.includes('dark');

        if (isDark !== wasDark && mermaidModule && mermaidInitialized) {
          renderMermaid();
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['class'],
  });
}

// 只导出函数，不自动初始化
// 初始化由页面脚本控制，避免重复执行
export { initMermaid, wrapTables, enhanceCodeBlocks, addImageCaptions, initializeAll };
export type { BlogEnhancements };
