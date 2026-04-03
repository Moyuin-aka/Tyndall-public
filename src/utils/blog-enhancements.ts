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
  render: (id: string, code: string) => Promise<{ svg: string }>;
}

// Mermaid 模块缓存
let mermaidModule: MermaidAPI | null = null;
let mermaidInitialized = false;
let resizeTimeout: number | null = null;
let lastMermaidViewportWidth = 0;
let mermaidRendering = false;
const MERMAID_PREVIEW_ID = 'mermaid-preview';
let mermaidPreviewTrigger: HTMLElement | null = null;
const MERMAID_PREVIEW_EPSILON = 0.001;
const mermaidPreviewState = {
  width: 0,
  height: 0,
  minScale: 1,
  maxScale: 4,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};
let mermaidPreviewMouseDragging = false;
let mermaidPreviewTouchMode: 'none' | 'drag' | 'pinch' = 'none';
let mermaidPreviewDragStartX = 0;
let mermaidPreviewDragStartY = 0;
let mermaidPreviewDragOriginX = 0;
let mermaidPreviewDragOriginY = 0;
let mermaidPreviewPinchDistance = 0;
let mermaidPreviewPinchScale = 1;
let mermaidPreviewPinchContentX = 0;
let mermaidPreviewPinchContentY = 0;
let mermaidPreviewSuppressClick = false;

function getMermaidPreviewText() {
  const isEnglish = document.documentElement.lang === 'en';

  return {
    action: isEnglish ? 'Open diagram preview' : '打开图表预览',
    title: isEnglish ? 'Diagram preview' : '图表预览',
    close: isEnglish ? 'Close preview' : '关闭预览',
  };
}

function getMermaidPreviewElements() {
  const preview = document.getElementById(MERMAID_PREVIEW_ID);
  if (!(preview instanceof HTMLElement)) {
    return null;
  }

  const viewport = preview.querySelector<HTMLElement>('.mermaid-preview__viewport');
  const content = preview.querySelector<HTMLElement>('.mermaid-preview__content');
  const closeButton = preview.querySelector<HTMLButtonElement>('.mermaid-preview__close');

  if (!viewport || !content || !closeButton) {
    return null;
  }

  return { preview, viewport, content, closeButton };
}

function closeMermaidPreview(options: { restoreFocus?: boolean } = {}): void {
  const elements = getMermaidPreviewElements();

  document.body.classList.remove('mermaid-preview-open');
  mermaidPreviewMouseDragging = false;
  mermaidPreviewTouchMode = 'none';
  mermaidPreviewSuppressClick = false;

  if (elements) {
    elements.preview.hidden = true;
    elements.preview.setAttribute('aria-hidden', 'true');
    elements.viewport.classList.remove('is-zoomed', 'is-dragging');
    elements.content.replaceChildren();
    elements.content.style.width = '';
    elements.content.style.height = '';
    elements.content.style.transform = '';
  }

  mermaidPreviewState.width = 0;
  mermaidPreviewState.height = 0;
  mermaidPreviewState.minScale = 1;
  mermaidPreviewState.maxScale = 4;
  mermaidPreviewState.scale = 1;
  mermaidPreviewState.offsetX = 0;
  mermaidPreviewState.offsetY = 0;

  if (options.restoreFocus !== false && mermaidPreviewTrigger) {
    mermaidPreviewTrigger.focus();
  }

  mermaidPreviewTrigger = null;
}

function syncMermaidPreviewText(preview: HTMLElement): void {
  const text = getMermaidPreviewText();
  const closeButton = preview.querySelector<HTMLButtonElement>('.mermaid-preview__close');
  const viewport = preview.querySelector<HTMLElement>('.mermaid-preview__viewport');

  if (closeButton) {
    closeButton.setAttribute('aria-label', text.close);
    closeButton.title = text.close;
  }

  if (viewport) {
    viewport.setAttribute('aria-label', text.title);
  }
}

function clampMermaidPreviewValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampMermaidPreviewOffset(viewport: HTMLElement): void {
  const scaledWidth = mermaidPreviewState.width * mermaidPreviewState.scale;
  const scaledHeight = mermaidPreviewState.height * mermaidPreviewState.scale;
  const maxOffsetX = Math.max(0, (scaledWidth - viewport.clientWidth) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - viewport.clientHeight) / 2);

  mermaidPreviewState.offsetX = clampMermaidPreviewValue(
    mermaidPreviewState.offsetX,
    -maxOffsetX,
    maxOffsetX,
  );
  mermaidPreviewState.offsetY = clampMermaidPreviewValue(
    mermaidPreviewState.offsetY,
    -maxOffsetY,
    maxOffsetY,
  );
}

function applyMermaidPreviewTransform(): void {
  const elements = getMermaidPreviewElements();
  if (!elements) {
    return;
  }

  elements.content.style.transform = `translate3d(${mermaidPreviewState.offsetX}px, ${mermaidPreviewState.offsetY}px, 0) scale(${mermaidPreviewState.scale})`;
  elements.viewport.classList.toggle(
    'is-zoomed',
    mermaidPreviewState.scale > mermaidPreviewState.minScale + MERMAID_PREVIEW_EPSILON,
  );
}

function fitMermaidPreviewToViewport(resetPosition = false): void {
  const elements = getMermaidPreviewElements();
  if (!elements || mermaidPreviewState.width <= 0 || mermaidPreviewState.height <= 0) {
    return;
  }

  const previewPadding = window.innerWidth <= 768 ? 32 : 96;
  const availableWidth = Math.max(120, elements.viewport.clientWidth - previewPadding);
  const availableHeight = Math.max(120, elements.viewport.clientHeight - previewPadding);
  const nextMinScale = Math.min(
    availableWidth / mermaidPreviewState.width,
    availableHeight / mermaidPreviewState.height,
    1,
  );

  const previousMinScale = mermaidPreviewState.minScale;
  mermaidPreviewState.minScale = Number.isFinite(nextMinScale) && nextMinScale > 0 ? nextMinScale : 1;
  mermaidPreviewState.maxScale = Math.max(4, mermaidPreviewState.minScale * 12);

  if (
    resetPosition ||
    mermaidPreviewState.scale <= previousMinScale + MERMAID_PREVIEW_EPSILON ||
    mermaidPreviewState.scale < mermaidPreviewState.minScale
  ) {
    mermaidPreviewState.scale = mermaidPreviewState.minScale;
    mermaidPreviewState.offsetX = 0;
    mermaidPreviewState.offsetY = 0;
  } else {
    clampMermaidPreviewOffset(elements.viewport);
  }

  applyMermaidPreviewTransform();
}

function getMermaidPreviewPoint(clientX: number, clientY: number, viewport: HTMLElement) {
  const rect = viewport.getBoundingClientRect();

  return {
    x: clientX - (rect.left + rect.width / 2),
    y: clientY - (rect.top + rect.height / 2),
  };
}

function setMermaidPreviewScale(nextScale: number, originX = 0, originY = 0): void {
  const elements = getMermaidPreviewElements();
  if (!elements) {
    return;
  }

  const clampedScale = clampMermaidPreviewValue(
    nextScale,
    mermaidPreviewState.minScale,
    mermaidPreviewState.maxScale,
  );

  if (Math.abs(clampedScale - mermaidPreviewState.scale) < MERMAID_PREVIEW_EPSILON) {
    return;
  }

  const previousScale = mermaidPreviewState.scale;
  const scaleRatio = clampedScale / previousScale;

  mermaidPreviewState.offsetX = originX - (originX - mermaidPreviewState.offsetX) * scaleRatio;
  mermaidPreviewState.offsetY = originY - (originY - mermaidPreviewState.offsetY) * scaleRatio;
  mermaidPreviewState.scale = clampedScale;

  clampMermaidPreviewOffset(elements.viewport);
  applyMermaidPreviewTransform();
}

function getMermaidPreviewSize(svg: SVGSVGElement) {
  const viewBox = svg.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return {
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  const widthAttr = Number.parseFloat(svg.getAttribute('width') || '');
  const heightAttr = Number.parseFloat(svg.getAttribute('height') || '');
  if (Number.isFinite(widthAttr) && widthAttr > 0 && Number.isFinite(heightAttr) && heightAttr > 0) {
    return {
      width: widthAttr,
      height: heightAttr,
    };
  }

  const rect = svg.getBoundingClientRect();

  return {
    width: Math.max(rect.width, 1),
    height: Math.max(rect.height, 1),
  };
}

function startMermaidPreviewDrag(clientX: number, clientY: number, viewport: HTMLElement): void {
  if (mermaidPreviewState.scale <= mermaidPreviewState.minScale + MERMAID_PREVIEW_EPSILON) {
    return;
  }

  mermaidPreviewDragStartX = clientX;
  mermaidPreviewDragStartY = clientY;
  mermaidPreviewDragOriginX = mermaidPreviewState.offsetX;
  mermaidPreviewDragOriginY = mermaidPreviewState.offsetY;
  viewport.classList.add('is-dragging');
}

function updateMermaidPreviewDrag(clientX: number, clientY: number, viewport: HTMLElement): void {
  mermaidPreviewState.offsetX = mermaidPreviewDragOriginX + (clientX - mermaidPreviewDragStartX);
  mermaidPreviewState.offsetY = mermaidPreviewDragOriginY + (clientY - mermaidPreviewDragStartY);
  clampMermaidPreviewOffset(viewport);
  applyMermaidPreviewTransform();

  if (
    Math.abs(clientX - mermaidPreviewDragStartX) > 3 ||
    Math.abs(clientY - mermaidPreviewDragStartY) > 3
  ) {
    mermaidPreviewSuppressClick = true;
  }
}

function stopMermaidPreviewDrag(): void {
  mermaidPreviewMouseDragging = false;

  const elements = getMermaidPreviewElements();
  elements?.viewport.classList.remove('is-dragging');
}

function getTouchDistance(firstTouch: Touch, secondTouch: Touch): number {
  return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
}

function getTouchCenter(firstTouch: Touch, secondTouch: Touch) {
  return {
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2,
  };
}

function ensureMermaidPreview(): HTMLElement {
  let preview = document.getElementById(MERMAID_PREVIEW_ID);

  if (!(preview instanceof HTMLElement)) {
    preview = document.createElement('div');
    preview.id = MERMAID_PREVIEW_ID;
    preview.className = 'mermaid-preview';
    preview.hidden = true;
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML = `
      <div class="mermaid-preview__backdrop" data-mermaid-preview-close></div>
      <div class="mermaid-preview__viewport" role="dialog" aria-modal="true">
        <button type="button" class="mermaid-preview__close" data-mermaid-preview-close>
          <span aria-hidden="true">×</span>
        </button>
        <div class="mermaid-preview__stage">
          <div class="mermaid-preview__content"></div>
        </div>
      </div>
    `;

    const previewElement = preview;
    const viewport = previewElement.querySelector<HTMLElement>('.mermaid-preview__viewport');
    if (viewport) {
      viewport.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        if (mermaidPreviewSuppressClick) {
          mermaidPreviewSuppressClick = false;
          return;
        }

        if (target === viewport || target.closest('[data-mermaid-preview-close]')) {
          closeMermaidPreview();
        }
      });

      viewport.addEventListener(
        'wheel',
        (event) => {
          if (previewElement.hidden || !mermaidPreviewState.width || !mermaidPreviewState.height) {
            return;
          }

          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-mermaid-preview-close]')) {
            return;
          }

          event.preventDefault();

          const point = getMermaidPreviewPoint(event.clientX, event.clientY, viewport);
          const zoomFactor = Math.exp(-event.deltaY * 0.0015);
          setMermaidPreviewScale(mermaidPreviewState.scale * zoomFactor, point.x, point.y);
          mermaidPreviewSuppressClick = true;
        },
        { passive: false },
      );

      viewport.addEventListener('mousedown', (event) => {
        if (previewElement.hidden || event.button !== 0) {
          return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-mermaid-preview-close]')) {
          return;
        }

        if (mermaidPreviewState.scale <= mermaidPreviewState.minScale + MERMAID_PREVIEW_EPSILON) {
          return;
        }

        mermaidPreviewMouseDragging = true;
        mermaidPreviewSuppressClick = false;
        startMermaidPreviewDrag(event.clientX, event.clientY, viewport);
        event.preventDefault();
      });

      viewport.addEventListener(
        'touchstart',
        (event) => {
          if (previewElement.hidden) {
            return;
          }

          if (event.touches.length >= 2) {
            const [firstTouch, secondTouch] = [event.touches[0], event.touches[1]];
            const center = getTouchCenter(firstTouch, secondTouch);
            const previewPoint = getMermaidPreviewPoint(center.x, center.y, viewport);

            mermaidPreviewTouchMode = 'pinch';
            mermaidPreviewPinchDistance = getTouchDistance(firstTouch, secondTouch);
            mermaidPreviewPinchScale = mermaidPreviewState.scale;
            mermaidPreviewPinchContentX =
              (previewPoint.x - mermaidPreviewState.offsetX) / mermaidPreviewState.scale;
            mermaidPreviewPinchContentY =
              (previewPoint.y - mermaidPreviewState.offsetY) / mermaidPreviewState.scale;
            viewport.classList.add('is-dragging');
            mermaidPreviewSuppressClick = true;
            return;
          }

          if (
            event.touches.length === 1 &&
            mermaidPreviewState.scale > mermaidPreviewState.minScale + MERMAID_PREVIEW_EPSILON
          ) {
            mermaidPreviewTouchMode = 'drag';
            mermaidPreviewSuppressClick = false;
            startMermaidPreviewDrag(event.touches[0].clientX, event.touches[0].clientY, viewport);
          }
        },
        { passive: true },
      );

      viewport.addEventListener(
        'touchmove',
        (event) => {
          if (previewElement.hidden) {
            return;
          }

          if (event.touches.length >= 2 && mermaidPreviewTouchMode === 'pinch') {
            const [firstTouch, secondTouch] = [event.touches[0], event.touches[1]];
            const center = getTouchCenter(firstTouch, secondTouch);
            const previewPoint = getMermaidPreviewPoint(center.x, center.y, viewport);
            const distance = getTouchDistance(firstTouch, secondTouch);
            const nextScale =
              mermaidPreviewPinchScale * (distance / Math.max(mermaidPreviewPinchDistance, 1));
            const clampedScale = clampMermaidPreviewValue(
              nextScale,
              mermaidPreviewState.minScale,
              mermaidPreviewState.maxScale,
            );

            mermaidPreviewState.scale = clampedScale;
            mermaidPreviewState.offsetX =
              previewPoint.x - mermaidPreviewPinchContentX * mermaidPreviewState.scale;
            mermaidPreviewState.offsetY =
              previewPoint.y - mermaidPreviewPinchContentY * mermaidPreviewState.scale;

            clampMermaidPreviewOffset(viewport);
            applyMermaidPreviewTransform();
            mermaidPreviewSuppressClick = true;
            event.preventDefault();
            return;
          }

          if (event.touches.length === 1 && mermaidPreviewTouchMode === 'drag') {
            updateMermaidPreviewDrag(event.touches[0].clientX, event.touches[0].clientY, viewport);
            event.preventDefault();
          }
        },
        { passive: false },
      );

      const handleTouchEnd = (event: TouchEvent) => {
        if (previewElement.hidden) {
          return;
        }

        if (event.touches.length >= 2) {
          const [firstTouch, secondTouch] = [event.touches[0], event.touches[1]];
          const center = getTouchCenter(firstTouch, secondTouch);
          const previewPoint = getMermaidPreviewPoint(center.x, center.y, viewport);

          mermaidPreviewTouchMode = 'pinch';
          mermaidPreviewPinchDistance = getTouchDistance(firstTouch, secondTouch);
          mermaidPreviewPinchScale = mermaidPreviewState.scale;
          mermaidPreviewPinchContentX =
            (previewPoint.x - mermaidPreviewState.offsetX) / mermaidPreviewState.scale;
          mermaidPreviewPinchContentY =
            (previewPoint.y - mermaidPreviewState.offsetY) / mermaidPreviewState.scale;
          viewport.classList.add('is-dragging');
          return;
        }

        if (
          event.touches.length === 1 &&
          mermaidPreviewState.scale > mermaidPreviewState.minScale + MERMAID_PREVIEW_EPSILON
        ) {
          mermaidPreviewTouchMode = 'drag';
          startMermaidPreviewDrag(event.touches[0].clientX, event.touches[0].clientY, viewport);
          return;
        }

        mermaidPreviewTouchMode = 'none';
        viewport.classList.remove('is-dragging');
      };

      viewport.addEventListener('touchend', handleTouchEnd);
      viewport.addEventListener('touchcancel', handleTouchEnd);
    }

    preview.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target === preview || target.closest('[data-mermaid-preview-close]')) {
        closeMermaidPreview();
      }
    });

    document.body.appendChild(preview);
  }

  syncMermaidPreviewText(preview);

  if (!(window as any).__mermaidPreviewKeydownAdded) {
    document.addEventListener('keydown', (event) => {
      const elements = getMermaidPreviewElements();
      if (!elements || elements.preview.hidden) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMermaidPreview();
      }
    });

    window.addEventListener('mousemove', (event) => {
      const elements = getMermaidPreviewElements();
      if (!elements || elements.preview.hidden || !mermaidPreviewMouseDragging) {
        return;
      }

      updateMermaidPreviewDrag(event.clientX, event.clientY, elements.viewport);
    });

    window.addEventListener('mouseup', () => {
      stopMermaidPreviewDrag();
    });

    window.addEventListener('resize', () => {
      const elements = getMermaidPreviewElements();
      if (!elements || elements.preview.hidden) {
        return;
      }

      fitMermaidPreviewToViewport();
    });

    (window as any).__mermaidPreviewKeydownAdded = true;
  }

  return preview;
}

function openMermaidPreview(diagram: HTMLElement, trigger: HTMLElement): void {
  const svg = diagram.querySelector('svg');
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }

  const preview = ensureMermaidPreview();
  const elements = getMermaidPreviewElements();
  if (!elements) {
    return;
  }

  closeMermaidPreview({ restoreFocus: false });

  const previewSvg = svg.cloneNode(true) as SVGSVGElement;
  const previewSize = getMermaidPreviewSize(svg);
  previewSvg.setAttribute('width', String(previewSize.width));
  previewSvg.setAttribute('height', String(previewSize.height));
  previewSvg.style.width = `${previewSize.width}px`;
  previewSvg.style.height = `${previewSize.height}px`;

  elements.content.replaceChildren(previewSvg);
  elements.content.style.width = `${previewSize.width}px`;
  elements.content.style.height = `${previewSize.height}px`;

  mermaidPreviewState.width = previewSize.width;
  mermaidPreviewState.height = previewSize.height;
  mermaidPreviewState.offsetX = 0;
  mermaidPreviewState.offsetY = 0;

  mermaidPreviewTrigger = trigger;
  preview.hidden = false;
  preview.setAttribute('aria-hidden', 'false');
  document.body.classList.add('mermaid-preview-open');

  requestAnimationFrame(() => {
    fitMermaidPreviewToViewport(true);
    elements.closeButton.focus();
  });
}

function enhanceMermaidDiagrams(): void {
  const text = getMermaidPreviewText();
  const diagrams = document.querySelectorAll<HTMLElement>('.mermaid-diagram');

  diagrams.forEach((diagram) => {
    diagram.classList.add('mermaid-diagram--interactive');
    diagram.setAttribute('role', 'button');
    diagram.setAttribute('tabindex', '0');
    diagram.setAttribute('aria-label', text.action);

    if (!diagram.dataset.mermaidPreviewBound) {
      diagram.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (!target || target.closest('a')) return;

        openMermaidPreview(diagram, diagram);
      });

      diagram.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        openMermaidPreview(diagram, diagram);
      });

      diagram.dataset.mermaidPreviewBound = 'true';
    }
  });
}

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
  if (!mermaidModule || mermaidRendering) return;
  mermaidRendering = true;

  try {
    const config = getMermaidConfig();
    mermaidModule.initialize(config);

    const diagrams = document.querySelectorAll<HTMLElement>('.mermaid-diagram');

    if (diagrams.length === 0) return;

    // 保存滚动位置
    const scrollY = window.scrollY;

    let renderIndex = 0;
    for (const diagram of diagrams) {
      const originalCode = diagram.getAttribute('data-original-code');
      if (!originalCode) continue;

      // 保持高度避免布局偏移
      const rect = diagram.getBoundingClientRect();
      diagram.style.minHeight = `${rect.height}px`;
      diagram.style.opacity = '0';
      diagram.style.transition = 'opacity 0.2s ease';

      try {
        const { svg } = await mermaidModule.render(`mermaid-rerender-${renderIndex++}`, originalCode);
        diagram.innerHTML = svg;
      } catch (e) {
        console.error('Mermaid render error for diagram:', e);
      }

      diagram.style.minHeight = '';
      diagram.style.opacity = '1';
    }

    // 恢复滚动位置，防止渲染导致的位置跳变
    window.scrollTo(0, scrollY);

    enhanceMermaidDiagrams();
  } catch (error) {
    console.error('Mermaid render error:', error);
  } finally {
    mermaidRendering = false;
  }
}

/**
 * 处理窗口大小变化
 */
function handleResize(): void {
  if (!mermaidModule || !mermaidInitialized) return;

  const currentViewportWidth = window.innerWidth;
  // 移动端首滑时浏览器地址栏收起通常只改变高度，不需要整页重渲染 Mermaid。
  if (Math.abs(currentViewportWidth - lastMermaidViewportWidth) < 2) {
    return;
  }
  lastMermaidViewportWidth = currentViewportWidth;

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

    let renderIndex = 0;
    for (const pre of blocks) {
      const code = pre.querySelector('code');
      if (!code) continue;

      const originalCode = code.textContent || '';
      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      div.setAttribute('data-original-code', originalCode);

      try {
        const { svg } = await mermaidModule.render(`mermaid-init-${renderIndex++}`, originalCode);
        div.innerHTML = svg;
      } catch (e) {
        console.error('Mermaid render error:', e);
        div.textContent = originalCode;
      }

      pre.replaceWith(div);
    }

    enhanceMermaidDiagrams();

    mermaidInitialized = true;
    lastMermaidViewportWidth = window.innerWidth;

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
    closeMermaidPreview({ restoreFocus: false });
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
