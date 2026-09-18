/**
 * Remark 插件：Tyndall 统一的 directive 词表。
 *
 * 把一组固定的 directive 映射成 HTML 元素，取代过去散落在正文里的原始 HTML
 * （<kbd> <mark> <details> …），让站点、CMS 预览、Milkdown 编辑器用同一套源语法
 * 渲染出同样的结果。
 *
 * 必须在 remark-directive 之后运行（它先把 :name 解析成 *Directive 节点）。
 * 与 CMS 端 src/markdown/remark-tyndall-directives.ts 保持同步（vendored twin）。
 *
 * 行内（text directive）：:kbd[Ctrl] :mark[x] :sub[2] :sup[2] :abbr[HTML]{title="…"}
 * 块级（container）：     :::details[摘要]\n正文\n:::
 */
import { visit } from 'unist-util-visit';

const INLINE_TAGS = {
  kbd: 'kbd',
  mark: 'mark',
  u: 'u',
  del: 'del',
  ins: 'ins',
  small: 'small',
  sub: 'sub',
  sup: 'sup',
  abbr: 'abbr',
};

export function remarkTyndallDirectives() {
  return (tree) => {
    visit(tree, (node) => {
      // 行内装饰标签
      if (node.type === 'textDirective' && INLINE_TAGS[node.name]) {
        const data = node.data || (node.data = {});
        data.hName = INLINE_TAGS[node.name];
        if (node.attributes && Object.keys(node.attributes).length > 0) {
          data.hProperties = { ...node.attributes };
        }
        return;
      }

      // 折叠块 :::details[摘要] … :::
      if (node.type === 'containerDirective' && node.name === 'details') {
        const data = node.data || (node.data = {});
        data.hName = 'details';
        if (node.attributes && node.attributes.open !== undefined) {
          data.hProperties = { open: true };
        }
        const label = (node.children || []).find(
          (c) => c.data && c.data.directiveLabel,
        );
        if (label) {
          const ld = label.data || (label.data = {});
          ld.hName = 'summary';
        }
      }
    });
  };
}
