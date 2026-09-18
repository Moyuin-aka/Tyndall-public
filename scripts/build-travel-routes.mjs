#!/usr/bin/env node
/**
 * 手动跑的行程路线生成脚本：
 *
 *   node scripts/build-travel-routes.mjs <文章路径关键字或 translationKey>
 *   node scripts/build-travel-routes.mjs --all             # 扫描所有带 map 的文章
 *   node scripts/build-travel-routes.mjs --all --force      # 忽略哈希缓存，强制全部重新生成
 *
 * 日常写 frontmatter 时不需要手动跑这个——开着 pnpm dev 保存文件会自动触发
 * （见 src/integrations/travel-routes-watch.mjs）。这个 CLI 主要用于：
 * 没开 dev server 时的一次性生成、CI/发布前的兜底检查、或者强制重新生成。
 *
 * 核心逻辑在 src/utils/travel-routes-core.mjs，和 dev watcher 共用。
 */
import path from 'node:path';
import { findMdFiles, buildRoutesForFile, BLOG_DIR } from '../src/utils/travel-routes-core.mjs';

function relPath(p) {
  return path.relative(process.cwd(), p);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const arg = args.find((a) => a !== '--force');

  if (!arg) {
    console.error('用法: node scripts/build-travel-routes.mjs <文章路径关键字|translationKey> | --all [--force]');
    process.exit(1);
  }

  const allFiles = findMdFiles(BLOG_DIR);
  const files = arg === '--all' ? allFiles : allFiles.filter((f) => f.includes(arg));

  if (files.length === 0) {
    console.error(`没找到匹配 "${arg}" 的文章`);
    process.exit(1);
  }

  let hasError = false;

  for (const file of files) {
    const result = await buildRoutesForFile(file, { force });
    switch (result.status) {
      case 'no-map':
        break; // 没有 map 数据，不用提
      case 'invalid':
        console.warn(`跳过（frontmatter 解析失败）: ${relPath(file)}`);
        break;
      case 'no-road':
        console.log(`跳过（没有 day 标 road:true）: ${relPath(file)}`);
        break;
      case 'unchanged':
        console.log(`未变化，跳过: ${result.routeId}`);
        break;
      case 'generated':
        console.log(`已生成 src/data/routes/${result.routeId}.json`);
        break;
      case 'error':
        console.error(`生成失败: ${result.routeId} —— ${result.error}`);
        hasError = true;
        break;
    }
  }

  if (hasError) process.exitCode = 1;
}

main();
