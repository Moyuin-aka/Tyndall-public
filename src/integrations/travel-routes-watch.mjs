import { BLOG_DIR, buildRoutesForFile, touchFile } from "../utils/travel-routes-core.mjs";

const DEBOUNCE_MS = 1500;

/**
 * dev-only：改完某篇文章 frontmatter 里的 map（加/改了 road:true 那天的
 * stops）保存后，自动重新生成对应的 src/data/routes/<id>.json，不需要手动
 * 跑 pnpm routes:build。
 *
 * 只挂在 astro:server:setup（只有 `astro dev` 会触发这个 hook，build 不会），
 * 复用 Vite 已经在跑的文件监听器，不额外起一个 watcher。
 *
 * 防抖 1.5 秒，避免正在手敲 YAML、坐标还没写完的时候半路触发请求——
 * buildRoutesForFile 内部对没写完的 YAML 也会直接跳过，这里的防抖只是减少
 * 没必要的重复调用。
 *
 * 生成失败（断网、OSRM 挂了、坐标不对）只 warn，不影响 dev server 继续跑，
 * 地图会退回直连折线。
 */
export function travelRoutesWatch() {
  return {
    name: "travel-routes-watch",
    hooks: {
      "astro:server:setup": ({ server, logger }) => {
        const timers = new Map();

        const run = async (filePath) => {
          timers.delete(filePath);
          let result;
          try {
            result = await buildRoutesForFile(filePath);
          } catch (err) {
            logger.warn(`[travel-routes] ${filePath}：${err instanceof Error ? err.message : err}`);
            return;
          }

          if (result.status === "generated") {
            logger.info(`[travel-routes] ${result.routeId}：路线已重新生成`);
            touchFile(filePath); // 让 Astro 重新渲染这篇文章、触发页面刷新
          } else if (result.status === "error") {
            logger.warn(`[travel-routes] ${result.routeId}：生成失败 —— ${result.error}`);
          }
          // no-map / invalid / no-road / unchanged：跟路线无关的改动，不用提
        };

        const onChange = (filePath) => {
          if (!filePath.endsWith(".md") || !filePath.startsWith(BLOG_DIR)) return;

          const existing = timers.get(filePath);
          if (existing) clearTimeout(existing);
          timers.set(
            filePath,
            setTimeout(() => run(filePath), DEBOUNCE_MS),
          );
        };

        server.watcher.on("change", onChange);

        server.httpServer?.once("close", () => {
          server.watcher.off("change", onChange);
          for (const timer of timers.values()) clearTimeout(timer);
          timers.clear();
        });
      },
    },
  };
}
