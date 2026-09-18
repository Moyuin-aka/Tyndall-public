# Tyndall → Tyndall-public 同步与脱敏

公开版不是简化主题：页面结构、CSS、组件与功能跟随 Tyndall。公开版与个人部署的区别应当是**数据与配置**，不是重新设计或删除功能。

本轮基线：Tyndall `baad7dc`，另纳入工作区已有的 Telegram Memos Worker。逐文件来源和输出 SHA-256 见 `scripts/public-sync-manifest.json`。没有复制上游 Git 历史或私有内容子模块。

## 本轮功能

- 首页、About 的 Bento 卡片/日记翻面/兴趣展开/设备弹窗/内嵌网页、音乐滚动墙和 Apple Music 播放器。
- Lab 的写作热力图、服务器指标/折线、收藏墙和服务卡片。
- 双语博客、笔记、分类、归档、搜索、RSS、OG 图片及 JSON-LD。
- 评论延迟加载及 OAuth 回跳修复；Memos 渲染与通知 Worker。
- 旅迹胶卷（本地图片与 R2 两条管线）、EXIF 显示、Markdown 地图和离线路线生成。
- Nowcast presence API、自动过期、旧版 Now Playing 兼容、Telegram 相册聚合。

功能保留不意味着预装私人服务：评论、Memos、Nowcast 等需要部署者自己的 Supabase/Worker 凭据。无凭据时不访问原作者私人服务。Lab 的指标与旅程是明确标注的示例数据。作者本人要求保留公开博客友链及公开头像；检查器仅在友链源文件和友链构建页面中允许这两个精确地址，不放行任何私人子域名或其他路径。

## 数据边界

| 分类 | 处理 |
| --- | --- |
| `src/components`、`pages`、`styles`、`utils` 等代码 | 逐文件白名单同步；仅应用集中管理的公开适配 |
| `src/content` | 只同步 schema；文章/笔记/旅程保留公开版自有示例 |
| `src/data` | `now.ts` 和通用技术图标定义同步；其余使用公开示例 |
| About 日记、个人特质、兴趣 | 相同组件读取 `src/data/profile.ts`，不导出私人文字 |
| 照片、EXIF、地图路线快照 | 不复制私有资料；使用虚构旅程与原创 SVG 插画 |
| `.env*`、`.gitmodules`、部署状态、Git 历史 | 不同步；仅提供空值 `.env.example` |
| Worker / GitHub Actions | 保留实现；凭据由部署者提供，自动任务默认需显式开启 |
| 作者/项目署名 | 保留开源项目归属链接；站点身份、邮箱和社交链接换成示例 |

未复制原图目录 `public/images`、`src/assets`、真实头像、收藏记录、真实服务地址、服务器 ID、个人提交热力图或私人路线。已有公开版的专辑封面继续作为音乐组件示例，不新增私人媒体。

## 下次同步

两个仓库放在相邻目录时：

```bash
pnpm sync:plan       # 只列差异，不写文件
pnpm sync:apply      # 审核差异后应用；不 commit、不 push
pnpm sync:check      # 输出必须与白名单来源 + 适配一致
pnpm check:public
pnpm test
pnpm astro check
pnpm build
pnpm check:public --dist
```

其他源目录：`node scripts/sync-public.mjs --source=/path/to/Tyndall`，应用时另加 `--apply`。

新组件/接口不会自动带入：先审核并将文件加入清单。私人内容与数据不是“全文替换一下域名”就能公开，必须保留在数据边界之外。同步器会在预期替换位置改变、出现敏感模式或公开版已有手动改动时停止，避免静默覆盖。

需要改同步文件时，优先修改 `scripts/public-adapters.mjs`，再运行同步。公开版自有 `profile.ts`、示例内容、文档等不受同步覆盖。清单中的源文件哈希也记录尚未提交的工作区代码，因此不仅依赖上游 commit ID。

检查器会检查未跟踪文件、已跟踪环境文件及可选构建产物，只输出命中的规则/路径，不打印疑似秘密。它是启发式检查，不保证识别所有隐私；发布前仍要看 `git diff`，尤其是新增 URL、文字和二进制文件。此工具检查当前文件，不重写/审计既有公开仓库历史。

## 少量公开适配与兼容修复

集中记录在 `public-adapters.mjs`，便于与上游逐项对照：

- 域名、图床、OPDS 配置化；个人日记数据外置；缺少 Supabase 时显示未配置状态。
- 为公开版启用与上游相同的 Vercel adapter，修复旧公开版动态 API 无 adapter 的构建失败。
- 修正旅迹内联脚本中的类型标注、重复全局变量与容器定位；修复少量 DOM/Response 类型检查；移除一处多余 CSS 右括号，未调整设计参数。
- 移除上游早已不用、公开版残留的 `userinfo-effects.ts`；可从旧 Git 提交恢复。
- 旅行原图预处理不再默认带 `--cleanup`，避免下载主题后构建时自动删除原图。
- Telegram Webhook 增加独立 secret 校验；Bot 数据库操作使用仅服务端保存的 `SUPABASE_SERVICE_ROLE_KEY`，不再依赖匿名写权限。旧 Now Playing 表提供全新安装引导 SQL。
- 写作热力图在普通仓库中限制到 `src/content` 路径，避免统计主题代码提交；子模块结构仍统计内容仓库的历史。

## 配置入口

复制 `.env.example` 到 `.env`。`PUBLIC_` 变量会进浏览器，**不要**给 service-role key、通知密钥、Nowcast 写入密钥添加这个前缀。旧配置指南里的通知变量已改为服务端变量。

- 站点 URL：`PUBLIC_SITE_URL`；显示名称/简介：`src/utils/ui.ts`、UserInfo、RSS、OG 的示例文字。社交链接在 UserInfo，音乐链接在 Footer/favorites。
- 设备与简介：`src/data/equipment.ts` / `profile.ts`；友链：`friends.ts`。
- Travel：`src/content/travel/<slug>/index.md` 与 `exif.json`；图片 URL 为 `${PUBLIC_TRAVEL_IMAGE_BASE}/travel/<slug>/img/<filename>`。本地 WebP 文件存在时使用 Astro 图片管线。示例 SVG 只用于演示，不声称是真实相机 EXIF。
- 地图：文章 frontmatter `map.days` + `::travel-map`。`pnpm routes:build --all` 为 `road: true` 行程调用 OSRM，地图底图需访问 OpenFreeMap。
- 阅读书架：`PUBLIC_OPDS_URL`、`PUBLIC_BOOKS_BASE`，需允许浏览器跨域读取；未配置时读取本地示例 XML。
- 评论/Memos：`PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`。数据库 schema/RLS 需自行部署并审核；`PUBLIC_ADMIN_EMAILS` 只是界面识别，真正权限必须由 RLS/服务端控制。
- Nowcast：先运行 `scripts/supabase-nowcast-schema.sql`，配置服务端 `SUPABASE_SERVICE_ROLE_KEY` 与 `NOW_PLAYING_SECRET`。旧 Shortcut 还需要 `scripts/supabase-now-playing-schema.sql`。API 路径 `/api/presence`、`/api/now-playing` 与上游一致。
- 邮件通知：`workers/comment-notifier` 中配置自己的邮箱/域名，再用 Worker secrets 配置 Resend key 和通知 secret；站点端设置 `COMMENT_NOTIFY_URL`/`COMMENT_NOTIFY_SECRET`。
- Telegram Memos：`workers/telegram-memos-bot` 中配置自己的 R2 bucket 和 secrets；设置 Telegram webhook 时传入与 `TELEGRAM_WEBHOOK_SECRET` 相同的 `secret_token`。使用个人私聊 ID；数据库写入使用 `SUPABASE_SERVICE_ROLE_KEY`（当前 REST Bearer 实现使用 JWT 格式的 legacy service-role key），不要开放匿名写入。保留 chat ID 检查与 Durable Object 相册聚合。完整配置及命令见中英文 CONFIGURATION。
- Lab 数据：与上游相同 JSON 结构；`.github/scripts/fetch-servers.mjs` / `fetch-bookmarks.mjs` 用自己的 Beszel/Karakeep 环境变量运行。服务器指标与收藏内容会公开，导入前请自行筛选。服务巡检工作流需仓库变量 `ENABLE_LAB_SYNC=true`，内容子模块自动更新需 `ENABLE_CONTENT_SUBMODULE=true` 且自行配置子模块；公开版默认没有私有子模块。

首次构建 OG 图需要下载 Google Fonts 字体子集，之后使用本地缓存。默认部署目标为 Vercel（包含动态 API）；其他平台需换对应 Astro adapter，不可只上传静态文件后期待 API 自动可用。
