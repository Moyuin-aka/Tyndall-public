// Memos AST Node Types
interface BaseNode {
  type: string;
}

interface NodeWithChildren extends BaseNode {
  children: BaseNode[];
}

interface NodeWithContent extends BaseNode {
  content: string;
}

interface LinkNode extends NodeWithChildren {
  url: string;
}

interface CodeBlockNode extends BaseNode {
  language: string;
}

type MemoNode = BaseNode | NodeWithChildren | NodeWithContent | LinkNode | CodeBlockNode;

export async function renderMemos(
  loadingId: string,
  contentId: string,
  errorId: string,
  apiUrl: string,
  notFoundMsg = 'No memos found.',
  failedMsg = 'Failed to load memos.'
) {
  const loading = document.getElementById(loadingId);
  const container = document.getElementById(contentId);
  const errorBox = document.getElementById(errorId);
  if (!loading || !container || !errorBox) return;

  // 工具
  const esc = (s = '') =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escAttr = (s = '') => String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');

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

  const renderNodes = (nodes: any[]): string => {
    if (!Array.isArray(nodes)) return '';
    let html = '';
    for (const node of nodes) {
      switch (node?.type) {
        case 'PARAGRAPH': html += `<p>${renderNodes(getChildren(node))}</p>`; break;
        case 'TEXT': html += esc(getContent(node)); break;
        case 'BOLD': html += `<strong>${renderNodes(getChildren(node))}</strong>`; break;
        case 'ITALIC': html += `<em>${renderNodes(getChildren(node))}</em>`; break;
        case 'UNDERLINE': html += `<u>${renderNodes(getChildren(node))}</u>`; break;
        case 'STRIKETHROROW': html += `<s>${renderNodes(getChildren(node))}</s>`; break;
        case 'IMAGE': {
          const src = getUrl(node);
          const alt = getAltText(node);
          html += `<img class="memo-img" src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" />`;
          break;
        }
        case 'LINK': {
          const href = getUrl(node);
          const text = renderNodes(getChildren(node)) || esc(href);
          html += `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          break;
        }
        case 'AUTO_LINK': {
          const href = getUrl(node);
          const text = renderNodes(getChildren(node)) || esc(href);
          html += `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          break;
        }
        case 'BLOCKQUOTE':
        case 'QUOTE':
          html += `<blockquote>${renderNodes(getChildren(node))}</blockquote>`; break;
        case 'CODE': html += `<code>${esc(getContent(node))}</code>`; break;
        case 'CODE_BLOCK': {
          const lang = getLang(node) || 'text';
          const code = getContent(node);
          html += `<pre><code class="language-${escAttr(lang)}">${esc(code)}</code></pre>`;
          break;
        }
        case 'UNORDERED_LIST': html += `<ul>${renderNodes(getChildren(node))}</ul>`; break;
        case 'ORDERED_LIST': html += `<ol>${renderNodes(getChildren(node))}</ol>`; break;
        case 'LIST_ITEM': html += `<li>${renderNodes(getChildren(node))}</li>`; break;
        default: {
          const children = getChildren(node);
          if (children?.length) html += renderNodes(children);
          else if (getContent(node)) html += esc(getContent(node));
        }
      }
    }
    return html;
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

    const res = await fetch(apiUrl, { credentials: 'omit' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    const list: any[] = data?.memos || [];

    if (!list.length) {
      errorBox.textContent = notFoundMsg;
      return;
    }

    list.forEach((memo) => {
      const card = document.createElement('div');
      card.className = 'memo-card';

      const header = document.createElement('div');
      header.className = 'memo-header';

      const timeEl = document.createElement('time');
      timeEl.className = 'memo-time';
      const dt = new Date(memo.displayTime || memo.createTime || Date.now());
      if (!Number.isNaN(dt.getTime())) timeEl.dateTime = dt.toISOString();
      timeEl.textContent = fmtTime(dt);
      header.appendChild(timeEl);

      const body = document.createElement('div');
      body.className = 'memo-body markdown-content';
      const nodesHtml = (memo.nodes && memo.nodes.length) ? renderNodes(memo.nodes) : '';
      body.innerHTML = nodesHtml && nodesHtml.trim().length
        ? nodesHtml
        : esc(memo.content || '').replace(/\n/g, '<br>');

      card.appendChild(header);
      card.appendChild(body);

      // attachments (e.g., images) fallback when nodes don't include IMAGE
      const atts = Array.isArray(memo.attachments) ? memo.attachments : [];
      if (atts.length) {
        const imgAtts = atts.filter((a: any) => {
          const t = String(a?.type || '');
          const fn = String(a?.filename || '');
          return (t.startsWith('image/')) || /(\.png|\.jpe?g|\.gif|\.webp|\.svg)$/i.test(fn);
        });
        if (imgAtts.length) {
          const gallery = document.createElement('div');
          gallery.className = 'memo-attachments';
          gallery.innerHTML = imgAtts.map((a: any) => {
            const src = a?.externalLink || a?.content || '';
            const alt = a?.filename || '';
            return src
              ? `<a href="${escAttr(src)}" target="_blank" rel="noopener noreferrer"><img class="memo-img" src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" /></a>`
              : '';
          }).join('');
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
    'https://api.YOURSITE',
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