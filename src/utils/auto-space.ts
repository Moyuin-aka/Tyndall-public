const CJK_ALNUM_LEFT =
  /([\u2e80-\u2eff\u2f00-\u2fdf\u3040-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff])([A-Za-z0-9])/g;
const CJK_ALNUM_RIGHT =
  /([A-Za-z0-9])([\u2e80-\u2eff\u2f00-\u2fdf\u3040-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff])/g;

function autoSpaceInline(text: string): string {
  return String(text || "")
    .replace(CJK_ALNUM_LEFT, "$1 $2")
    .replace(CJK_ALNUM_RIGHT, "$1 $2");
}

function shouldSkip(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;

  return Boolean(
    parent.closest(
      "code, pre, kbd, samp, script, style, textarea, svg, math, .katex, .mermaid",
    ),
  );
}

export function applyAutoSpaceToTextNodes(root: ParentNode): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const raw = textNode.nodeValue || "";

    if (raw && !shouldSkip(textNode)) {
      const spaced = autoSpaceInline(raw);
      if (spaced !== raw) {
        textNode.nodeValue = spaced;
      }
    }

    current = walker.nextNode();
  }
}
