/**
 * Remark 插件：在 Markdown 正文里嵌入 Apple Music 播放器
 *
 * 配合 remark-directive 使用，写法：
 *   ::apple-music{url="https://music.apple.com/us/album/noman/1648876363"}
 *   ::apple-music{url="..." height="175"}   // 单曲建议用 175
 *
 * URL 必须用引号包起来（含有 : / ? 等字符）。渲染为官方 embed iframe，
 * 与 AppleMusicEmbed.astro 共用同一套解析逻辑。
 */
import { visit } from "unist-util-visit";
import { toAppleMusicEmbedUrl, defaultEmbedHeight } from "./appleMusic.mjs";

export function remarkAppleMusic() {
  return (tree) => {
    visit(tree, (node) => {
      // 只处理块级 leaf 指令 ::apple-music{...}
      if (
        (node.type === "leafDirective" || node.type === "containerDirective") &&
        node.name === "apple-music"
      ) {
        const attrs = node.attributes || {};
        const url = attrs.url || attrs.href;
        const embedUrl = url ? toAppleMusicEmbedUrl(url) : null;

        const data = node.data || (node.data = {});

        if (!embedUrl) {
          // URL 缺失或无法识别：降级为一条提示，避免静默吞掉
          data.hName = "p";
          data.hProperties = { className: ["apple-music-embed-error"] };
          data.hChildren = [
            {
              type: "text",
              value: `⚠️ apple-music: 无法识别的链接${url ? ` "${url}"` : ""}`,
            },
          ];
          return;
        }

        const height = Number(attrs.height) || defaultEmbedHeight(url);

        data.hName = "div";
        data.hProperties = {
          className: ["apple-music-embed"],
          style: `--am-height:${height}px`,
        };
        data.hChildren = [
          {
            type: "element",
            tagName: "iframe",
            properties: {
              src: embedUrl,
              title: attrs.title || "Apple Music",
              height,
              loading: "lazy",
              frameborder: "0",
              allow: "autoplay *; encrypted-media *; clipboard-write",
              sandbox:
                "allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation",
            },
            children: [],
          },
        ];
      }
    });
  };
}
