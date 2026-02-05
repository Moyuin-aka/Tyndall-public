import { getPublicMemos, type Memo } from './supabase';

// Memos AST Node Types
type MemosAstNode = {
  type?: string;
  [key: string]: unknown;
};

type MemoRecord = {
  displayTime?: string | number | Date;
  createTime?: string | number | Date;
  content?: string;
  nodes?: MemosAstNode[];
  attachments?: any[];
};

export async function renderMemos(
  loadingId: string,
  contentId: string,
  errorId: string,
  notFoundMsg = 'No memos found.',
  failedMsg = 'Failed to load memos.'
) {
  const loading = document.getElementById(loadingId);
  const container = document.getElementById(contentId);
  const errorBox = document.getElementById(errorId);
  if (!loading || !container || !errorBox) return;

  // 工具：从 Memos AST 节点提取数据，并用 DOM API 而非字符串拼接
  const pick = (node: any, prop: string) => {
    for (const k in node) {
      if (k.endsWith('Node') && node[k] && Object.prototype.hasOwnProperty.call(node[k], prop)) {
        return node[k][prop];
      }
    }
    return undefined;
  };
  const getChildren = (n: any) => pick(n, 'children') || [];
  const getContent = (n: any) => pick(n, 'content') || '';
  const getUrl = (n: any) => pick(n, 'url') || '';
  const getAltText = (n: any) => pick(n, 'alt') || '';
  const getLang = (n: any) => pick(n, 'language') || '';

  const appendChildren = (el: HTMLElement, nodes: MemosAstNode[]) => {
    for (const child of nodes) {
      const rendered = renderNode(child);
      if (rendered) el.appendChild(rendered);
    }
  };

  const renderPlaintext = (content: string) => {
    const frag = document.createDocumentFragment();
    const lines = String(content || '').split('\n');
    lines.forEach((line, idx) => {
      frag.appendChild(document.createTextNode(line));
      if (idx < lines.length - 1) frag.appendChild(document.createElement('br'));
    });
    return frag;
  };

  const renderNode = (node: MemosAstNode): Node | null => {
    const type = node?.type;
    switch (type) {
      case 'PARAGRAPH': {
        const p = document.createElement('p');
        appendChildren(p, getChildren(node));
        return p;
      }
      case 'TEXT':
        return document.createTextNode(String(getContent(node)));
      case 'BOLD': {
        const strong = document.createElement('strong');
        appendChildren(strong, getChildren(node));
        return strong;
      }
      case 'ITALIC': {
        const em = document.createElement('em');
        appendChildren(em, getChildren(node));
        return em;
      }
      case 'UNDERLINE': {
        const u = document.createElement('u');
        appendChildren(u, getChildren(node));
        return u;
      }
      case 'STRIKETHROROW': {
        const s = document.createElement('s');
        appendChildren(s, getChildren(node));
        return s;
      }
      case 'IMAGE': {
        const img = document.createElement('img');
        img.className = 'memo-img';
        img.loading = 'lazy';
        const src = getUrl(node);
        const alt = getAltText(node);
        if (src) img.src = String(src);
        if (alt) img.alt = String(alt);
        return img;
      }
      case 'LINK':
      case 'AUTO_LINK': {
        const a = document.createElement('a');
        const href = getUrl(node);
        if (href) a.href = String(href);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        const children = getChildren(node);
        if (children?.length) appendChildren(a, children);
        else a.textContent = href ? String(href) : '';
        return a;
      }
      case 'BLOCKQUOTE':
      case 'QUOTE': {
        const bq = document.createElement('blockquote');
        appendChildren(bq, getChildren(node));
        return bq;
      }
      case 'CODE': {
        const code = document.createElement('code');
        code.textContent = String(getContent(node));
        return code;
      }
      case 'CODE_BLOCK': {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const lang = getLang(node) || 'text';
        code.className = `language-${String(lang)}`;
        code.textContent = String(getContent(node));
        pre.appendChild(code);
        return pre;
      }
      case 'UNORDERED_LIST': {
        const ul = document.createElement('ul');
        appendChildren(ul, getChildren(node));
        return ul;
      }
      case 'ORDERED_LIST': {
        const ol = document.createElement('ol');
        appendChildren(ol, getChildren(node));
        return ol;
      }
      case 'LIST_ITEM': {
        const li = document.createElement('li');
        appendChildren(li, getChildren(node));
        return li;
      }
      default: {
        const children = getChildren(node);
        if (children?.length) {
          const frag = document.createDocumentFragment();
          children.forEach((child: MemosAstNode) => {
            const rendered = renderNode(child);
            if (rendered) frag.appendChild(rendered);
          });
          return frag;
        }
        const content = getContent(node);
        return content ? document.createTextNode(String(content)) : null;
      }
    }
  };

  const fmtTime = (input: string | number | Date) => {
    const d = new Date(input);
    const lang = document.documentElement.lang || navigator.language || 'zh-CN';
    if (Number.isNaN(d.getTime())) return String(input ?? '');
    return d.toLocaleString(lang, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  try {
    loading.style.display = 'flex';
    container.innerHTML = '';
    errorBox.textContent = '';

    // 从 Supabase 获取 memos
    const memos = await getPublicMemos(50);

    if (!memos.length) {
      errorBox.textContent = notFoundMsg;
      return;
    }

    // 将 Supabase 数据转换为渲染格式
    memos.forEach((memo: Memo) => {
      const card = document.createElement('div');
      card.className = 'memo-card';

      const header = document.createElement('div');
      header.className = 'memo-header';

      const timeEl = document.createElement('time');
      timeEl.className = 'memo-time';
      const dt = new Date(memo.created_at);
      if (!Number.isNaN(dt.getTime())) timeEl.dateTime = dt.toISOString();
      timeEl.textContent = fmtTime(dt);
      header.appendChild(timeEl);

      const body = document.createElement('div');
      body.className = 'memo-body markdown-content';
      
      // Supabase 的 memos 直接使用纯文本 content
      body.appendChild(renderPlaintext(memo.content));

      card.appendChild(header);
      card.appendChild(body);

      // 处理图片资源
      if (memo.resources && memo.resources.length > 0) {
        const imgResources = memo.resources.filter((r) => 
          r.type?.startsWith('image/') || /(\.png|\.jpe?g|\.gif|\.webp|\.svg)$/i.test(r.filename || '')
        );
        
        if (imgResources.length) {
          const gallery = document.createElement('div');
          gallery.className = 'memo-attachments';
          
          imgResources.forEach((resource) => {
            const link = document.createElement('a');
            link.href = resource.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            const img = document.createElement('img');
            img.className = 'memo-img';
            img.loading = 'lazy';
            img.src = resource.url;
            if (resource.filename) img.alt = resource.filename;

            link.appendChild(img);
            gallery.appendChild(link);
          });
          
          card.appendChild(gallery);
        }
      }

      container.appendChild(card);
    });
  } catch (e) {
    console.error('[memos] fetch failed:', e);
    errorBox.textContent = failedMsg;
  } finally {
    loading.style.display = 'none';
  }
}


function run() {
  const root = document.querySelector<HTMLElement>('.memos-container');
  if (!root) return;

  const notFoundMsg = root.dataset.notFound;
  const failedMsg = root.dataset.failed;

  renderMemos(
    'memos-loading',
    'memos-content',
    'memos-error',
    notFoundMsg,
    failedMsg
  );
}

export function initMemos() {
  // @ts-ignore
  if (window.__memosRun) {
    // @ts-ignore
    document.removeEventListener('astro:page-load', window.__memosRun);
  }
  // @ts-ignore
  window.__memosRun = run;

  document.addEventListener('astro:page-load', run);
}
