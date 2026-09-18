---
title: Tyndall 配置指南
description: Tyndall 配置指南，涵盖部署、评论通知、Memos、Nowcast 与文章特色功能。
pubDate: 2025-01-15
updatedDate: 2026-09-18
translationKey: config
lang: zh
---

# Tyndall 配置指南

> **更新：2026 年 9 月**
>
> 本指南将帮助你从零开始配置 Tyndall 主题，打造属于自己的博客。

---

## 📦 技术栈

| 技术 | 用途 |
|------|------|
| [Astro](https://astro.build/) | 静态站点生成框架 |
| [Supabase](https://supabase.com/) | 评论系统 & Memos 数据存储 |
| [tsParticles](https://particles.js.org/) | 首页粒子效果 |
| [KaTeX](https://katex.org/) | 数学公式渲染 |
| [Shiki](https://shiki.matsu.io/) | 代码高亮 |

---

## 🚀 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/Moyuin-aka/tyndall-public.git
cd tyndall-public

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev

# 4. 构建生产版本
pnpm build
```

---

## 📋 必须配置项

### 1. 基础站点信息

#### `astro.config.mjs`

```javascript
export default defineConfig({
  site: 'https://yourdomain.com',  // ⚠️ 替换为你的域名
  // ...
  markdown: {
    // 禁用 smartypants，防止中英混排时直引号被转换为弯引号
    smartypants: false,
    // ...
  },
});
```

> **关于 `smartypants: false`：** Astro 默认会将直引号（`"`/`'`）转换为排版引号（`""`/`''`），在中英混排时会破坏内容。此选项已在主题中默认关闭，无需额外修改，但保持原样即可。

### 2. 个人信息配置

#### `src/components/UserInfo.astro`

更新社交链接和显示名称：

```javascript
// 社交链接配置
const socialLinks = [
  { name: "GitHub", icon: ICONS.github, url: "https://github.com/yourusername" },
  { name: "Twitter", icon: ICONS.twitter, url: "https://twitter.com/yourusername" },
  { name: "Telegram", icon: ICONS.telegram, url: "https://t.me/yourusername" },
  { name: "Email", icon: ICONS.mail, url: "mailto:your@email.com" },
];
```

在同文件中搜索 `author-name` 并修改：

```astro
<span class="author-name">Your Name</span>
```

**可用图标：** 查看 `src/utils/icons.ts` 获取完整列表。

### 3. 品牌名称

#### `src/components/Header.astro`

```astro
<a class="brand" href={t("nav_home_url")}>Your Brand</a>
```

### 4. 多语言文本配置

#### `src/utils/ui.ts`

这是所有界面文本的集中配置，包含中英文双语：

```typescript
const translations = {
  zh: {
    "Manifesto": "你的宣言",           // 首页大标语
    "introduction": "你的自我介绍...", // 首页简介
    "home_title": "站点标题",
    // ... 更多文本
  },
  en: {
    "Manifesto": "Your Manifesto",
    "introduction": "Your introduction...",
    "home_title": "Site Title",
    // ... 更多文本
  }
};
```

### 5. 友情链接配置

#### `src/data/friends.ts`

```typescript
export const friends: Friend[] = [
  {
    name: "Friend Name",
    url: "https://example.com",
    avatar: "https://example.com/avatar.png",
    description: "简短描述",
    tags: ["Friends"]
  },
  // 添加更多友链...
];

// 友链申请说明（双语）
export const friendshipGuidelines = {
  zh: {
    myInfo: {
      name: '你的名字',
      avatar: 'https://yourdomain.com/avatar.webp',
      url: 'https://yourdomain.com',
      description: '你的简介'
    },
    howToApply: '想要交换友链？通过 <a href="mailto:your@email.com">邮件</a> 联系我～'
  },
  en: {
    // 英文版本...
  }
};
```

---

## 💬 评论系统配置（Supabase）

v1.1.0 使用 **Supabase** 作为评论系统后端。

### 1. 创建 Supabase 项目

前往 [Supabase](https://supabase.com/) 创建项目。

### 2. 创建 `comments` 表

在 SQL Editor 中执行：

```sql
create table comments (
  id uuid primary key default gen_random_uuid(),
  translation_key text not null,
  author_name text not null,
  author_email text not null,
  author_website text,
  author_avatar text,
  content text not null,
  parent_id uuid references comments(id),
  user_id uuid,
  status text default 'approved',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 索引
create index idx_comments_translation_key on comments(translation_key);
create index idx_comments_status on comments(status);

-- RLS 策略（可选）
alter table comments enable row level security;

create policy "Public read approved comments" on comments
  for select using (status = 'approved');

create policy "Anyone can insert comments" on comments
  for insert with check (true);
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# Supabase 配置
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# 管理员邮箱（可删除任意评论）
PUBLIC_ADMIN_EMAILS=admin@example.com,another@example.com

# 评论通知（可选，需自行部署 Worker）
COMMENT_NOTIFY_URL=https://your-notify-worker.workers.dev
COMMENT_NOTIFY_SECRET=your-secret
```

### 4. 启用 OAuth 登录（可选）

在 Supabase Dashboard → Authentication → Providers 中启用 GitHub/Google，并添加回调地址：
- `https://yourdomain.com`
- `http://localhost:4321`（开发环境）

### 5. 匿名评论 5 分钟内删除（可选）

在 SQL Editor 中创建 RPC：

```sql
create or replace function delete_anonymous_comment(
  comment_id uuid,
  created_within_minutes int
) returns boolean
language plpgsql security definer as $$
begin
  delete from comments
  where id = comment_id
    and created_at > now() - make_interval(mins => created_within_minutes);
  return found;
end;
$$;
```

### 6. 配置评论邮件通知（可选）

评论保存到 Supabase 后，网页会请求博客的 `/api/comment-notify`，再由独立的 Worker 调用 Resend 发邮件。博客仍然可以部署在 Vercel，不需要为了通知功能搬到 Cloudflare。

#### 准备发件邮箱

在 [Resend](https://resend.com/docs/dashboard/domains/introduction) 添加并验证自己的发信域名，再创建 API key。`FROM_EMAIL` 使用该域名下的邮箱，`ADMIN_EMAIL` 填写接收评论提醒的邮箱。

#### 修改 Worker 配置

编辑 `workers/comment-notifier/wrangler.toml`：

```toml
name = "comment-notifier"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
ADMIN_EMAIL = "author@example.com"
FROM_EMAIL = "noreply@example.com"
SITE_NAME = "我的博客"
SITE_URL = "https://example.com"
```

在项目根目录运行以下命令。`--config` 指向通知 Worker，不是博客的 Workers 配置：

```bash
pnpm dlx wrangler@4 login
pnpm dlx wrangler@4 deploy --config workers/comment-notifier/wrangler.toml
pnpm dlx wrangler@4 secret put RESEND_API_KEY --config workers/comment-notifier/wrangler.toml
pnpm dlx wrangler@4 secret put NOTIFY_SECRET --config workers/comment-notifier/wrangler.toml
```

根据提示输入密钥。`NOTIFY_SECRET` 自行生成一段随机字符串，例如用 `openssl rand -hex 32`；不要将实际值写进配置文件。

#### 连接博客

在博客的部署平台添加以下**服务端**环境变量，再重新部署：

```dotenv
COMMENT_NOTIFY_URL=https://comment-notifier.your-account.workers.dev
COMMENT_NOTIFY_SECRET=与上面的NOTIFY_SECRET保持一致
```

`COMMENT_NOTIFY_URL` 填写刚才部署得到的 Worker 地址，不是博客自己的 `/api/comment-notify`。本地开发则填写在 `.env` 中。

发送一条带有效邮箱的测试评论，再回复它：新评论会通知博主；回复会按收件人规则通知博主和原评论者，不给自己回复自己重复发信。

> **没有收到邮件？** 先确认评论已经保存，再查看浏览器中 `/api/comment-notify` 的响应。`skipped: true` 表示博客没有配置通知变量，`502` 表示 Worker 调用失败。用 `pnpm dlx wrangler@4 tail --config workers/comment-notifier/wrangler.toml` 查看日志，并检查 Resend 的域名验证和发送记录。不要仅凭 HTTP 200 判断邮件已经送达。

通知入口目前没有完整的防刷机制；公开使用前应为 `/api/comment-notify` 配置限流，并按需补充验证码或身份校验。GitHub Pages 本身不能运行这个接口。

### 禁用评论系统

编辑 `src/pages/blog/[...slug].astro`，删除或注释：

```astro
<SupabaseComments ... />
```

---

## 📝 Memos 碎碎念配置（Supabase）

Memos 使用 **Supabase** 保存碎碎念，不需要额外安装 usememos 服务。日常发布可以直接给 Telegram Bot 发消息，不用打开数据库手动插入记录。

### 创建 `memos` 表

```sql
create table memos (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  visibility text default 'public',
  tags text[],
  resources jsonb,
  user_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table memos enable row level security;

create policy "Public read public memos" on memos
  for select using (visibility = 'public');

-- 访客只能读取公开内容，发布和删除交给服务端 Bot
revoke all on public.memos from anon, authenticated;
grant select on public.memos to anon, authenticated;
grant select, insert, update, delete on public.memos to service_role;
```

博客的读取配置与评论系统共用 `PUBLIC_SUPABASE_URL` 和 `PUBLIC_SUPABASE_ANON_KEY`。下面是 Bot 的独立配置，不会自动继承博客的环境变量。

> **已有数据库：** 上面的建表语句用于首次安装。已有表无需重建，但请核对字段、授权和 RLS；不要为解决发布失败而开放匿名写入。服务端 key 会绕过 RLS，只能保存在受控后端。[Supabase 权限说明](https://supabase.com/docs/guides/database/postgres/row-level-security)

### 通过 Telegram 发布

发布过程是：**给 Bot 发消息 → Worker 验证消息来源 → 保存到 Supabase → 博客读取并显示**。图片会先上传到 R2。

#### 1. 创建 Bot

1. 在 Telegram 向 `@BotFather` 发送 `/newbot`，按提示创建 Bot 并保存 token。
2. 给自己的 Bot 发一条消息。在尚未设置 webhook 时，通过 Bot API 的 `getUpdates` 查看 `message.chat.id`，将它作为 `TELEGRAM_CHAT_ID`。
3. 使用自己的私聊 ID，不要填群聊 ID：当前权限检查以整个 chat 为单位，群里的其他成员也可能触发发布。

以下命令使用你在本机临时设置的 `TELEGRAM_BOT_TOKEN` 环境变量；输出包含聊天信息，不要公开分享：

```bash
read -rs TELEGRAM_BOT_TOKEN  # 输入 Bot token 后回车（不会显示输入内容）
export TELEGRAM_BOT_TOKEN
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates"
```

#### 2. 配置图片存储

在 Cloudflare R2 创建一个专门存放公开 Memos 图片的 bucket，并绑定图片域名，例如 `https://images.example.com`。`r2.dev` 地址适合开发测试，正式使用建议绑定自己的域名。[R2 公开访问说明](https://developers.cloudflare.com/r2/buckets/public-buckets/)

编辑 `workers/telegram-memos-bot/wrangler.toml`，将 `bucket_name` 替换为实际名称，保留其他绑定：

```toml
name = "telegram-memos-bot"
main = "worker.js"
compatibility_date = "2026-02-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-memos-bucket"

[[durable_objects.bindings]]
name = "MEDIA_GROUPS"
class_name = "MediaGroupAggregator"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["MediaGroupAggregator"]
```

`MEDIA_GROUPS` 用来把一次发送的多张照片合并为一条 Memo，不要删掉。图片域名应能直接访问对象，不是 R2 的 S3 API 地址。

#### 3. 部署并填写变量

以下命令都在项目根目录执行：

```bash
pnpm dlx wrangler@4 login
pnpm dlx wrangler@4 deploy --config workers/telegram-memos-bot/wrangler.toml
pnpm dlx wrangler@4 secret put TELEGRAM_BOT_TOKEN --config workers/telegram-memos-bot/wrangler.toml
pnpm dlx wrangler@4 secret put TELEGRAM_CHAT_ID --config workers/telegram-memos-bot/wrangler.toml
pnpm dlx wrangler@4 secret put TELEGRAM_WEBHOOK_SECRET --config workers/telegram-memos-bot/wrangler.toml
pnpm dlx wrangler@4 secret put SUPABASE_URL --config workers/telegram-memos-bot/wrangler.toml
pnpm dlx wrangler@4 secret put SUPABASE_SERVICE_ROLE_KEY --config workers/telegram-memos-bot/wrangler.toml
pnpm dlx wrangler@4 secret put R2_PUBLIC_URL --config workers/telegram-memos-bot/wrangler.toml
```

- `SUPABASE_URL`：与博客使用同一个 Supabase 项目。
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 的服务端 `service_role` key，不是网页使用的 anon key。当前 Bot 以此 key 同时发送 `apikey` 和 Bearer 请求头，按此方式配置 JWT 格式的 legacy service-role key。
- `R2_PUBLIC_URL`：图片域名，如 `https://images.example.com`，末尾不加 `/`，也不加 `/memos`。
- `TELEGRAM_WEBHOOK_SECRET`：自行生成的随机字符串，与 Bot token 不同。

#### 4. 连接 Telegram

在本机临时设置 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_WEBHOOK_SECRET` 和 `MEMOS_WORKER_URL` 环境变量，最后一个填写 Bot Worker 的 HTTPS 地址，再注册 webhook：

```bash
read -rs TELEGRAM_WEBHOOK_SECRET  # 输入已保存到 Worker 的相同密钥
export TELEGRAM_WEBHOOK_SECRET
export MEMOS_WORKER_URL=https://telegram-memos-bot.your-account.workers.dev
curl --request POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=${MEMOS_WORKER_URL}" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  --data-urlencode 'allowed_updates=["message"]'

curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

`setWebhook` 返回 `ok: true` 后，给 Bot 发送 `/start`。Telegram 会在每次回调中携带 `secret_token`，Worker 校验通过后才处理消息。设置 webhook 后不要再同时使用 `getUpdates` 拉取更新。[Telegram Bot API](https://core.telegram.org/bots/api#setwebhook)

#### 5. 发一条碎碎念

| 发给 Bot 的内容 | 结果 |
| --- | --- |
| `今天读完了一本书 #阅读` | 发布一条公开 Memo，并提取标签 |
| 一张照片，附上说明 | 上传图片并发布 |
| 一组照片，附上说明 | 合并为一条带多图的 Memo |
| `/private 今天的私人记录` | 保存私有文本，不显示在公开页面 |
| `/list` | 查看最近 5 条及其 ID |
| `/delete` 或 `/delete <id>` | 删除最新一条，或最近 20 条中匹配 ID 前缀的记录 |
| `/stats` | 查看统计 |

目前接收文本和 Telegram 的“照片”消息，不支持视频、语音或作为文件发送的图片。`/private` 是文本命令，不会将随后发送的照片变成私有照片。删除 Memo 不会同时删除 R2 中的图片。

收到成功回复后，刷新博客的 `/memos` 或 `/en/memos` 即可看到新内容，不用重新构建。若发布失败，检查 Worker 日志和数据库权限；文字能显示而图片不能显示时，检查 R2 的公开域名和绑定。

### 接入飞书、Discord 或其他工具

目前仓库提供的是 **Telegram 专用接收端**，没有通用的 `/api/memos`。它内部通过 Supabase 的 `/rest/v1/memos` 写入内容，不代表要把数据库密钥交给聊天软件或访客。

其他平台可以采用同样的流程，但需要另写接收端，不能把它们的回调地址直接指向 Telegram Worker：

- **飞书：** 使用带机器人能力的应用，订阅 `im.message.receive_v1` 消息事件，按官方说明完成回调验证，再校验发送者身份、解析文本和图片。群内“自定义机器人”的 webhook 用于向群里推送消息，不是接收用户消息的入口。参考[接收消息事件](https://open.feishu.cn/document/server-docs/im-v1/message/events/receive)与[自定义机器人说明](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)。
- **Discord：** 可以从 `/memo 内容` 这样的应用命令开始，用 HTTP Interactions 接收请求，验证签名和用户 ID，及时响应或延迟确认，再保存 Memo。若要直接接收普通聊天消息，需要另外实现 Gateway Bot。普通频道 webhook 只负责往频道发消息。参考 [Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)。

新增接收端时，还要处理平台重试的消息去重、附件转存和失败回复。当前 Telegram 实现只有相册聚合时的局部去重，不保证所有重投消息都只发布一次。

> **接入状态：** Telegram 已有代码；飞书、Discord 是扩展方向，尚未随主题提供。无论接哪种平台，都要在服务端验证平台签名或共享密钥，以及允许发布的用户，不能只隐藏一个难猜的接口地址。

### 禁用 Memos

- 删除 `src/pages/memos.astro` 和 `src/pages/en/memos.astro`
- 在 `src/components/Header.astro` 中移除 Memos 导航链接

---

## 🟢 Nowcast 实时状态

Memos 用来保存“我说了什么”，Nowcast 用来展示“我现在在做什么”。两者独立配置：给 Bot 发 Memo 不会自动改变状态卡片，Nowcast 也不会把活动保存为碎碎念。

### 1. 准备数据库

在 Supabase SQL Editor 中执行 `scripts/supabase-nowcast-schema.sql` 的完整内容，它会创建状态表和写入函数。若还要使用原来的快捷指令接口，再执行 `scripts/supabase-now-playing-schema.sql`。

### 2. 配置博客

在博客部署平台添加以下变量，本地开发则填写到 `.env`：

```dotenv
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的服务端key
NOW_PLAYING_SECRET=自行生成的随机写入密钥
```

重新部署后，访问 `https://你的域名/api/presence`。首次还没有上报时，返回 `state: "unconfigured"` 属于正常情况；`503` 表示配置或存储需要检查。这个功能需要 Vercel 或 Cloudflare Workers 等可运行服务端接口的平台。

### 3. 连接 Nowcast

在 [Nowcast](https://github.com/Moyuin-aka/Nowcast) 的「状态与设置…」中填写：

| 设置 | 填写内容 |
| --- | --- |
| API 地址 | `https://你的域名/api/presence`，不是博客首页 |
| 写入密钥 | 与博客的 `NOW_PLAYING_SECRET` 完全一致 |
| 识别浏览器中的网站 | 按需开启 |
| 显示后台 Apple Music | 按需开启 |

点击「保存设置」，再「开始共享」。按提示授予需要的 macOS 自动化权限，并先检查规则中的活动文案是否适合公开。**不要将 Supabase 服务端 key 填进 Nowcast。**

### 4. 查看展示效果

打开 `/about` 或 `/en/about` 查看“现在在做”卡片。页面每 20 秒刷新状态，无需重新构建博客：

- 有活动时显示活动描述和来源；同时播放音乐时可以显示歌曲信息。
- 只有音乐时，以歌曲作为当前状态。
- 主动发送空状态时显示空闲；超过 3 分钟没有新上报时，旧活动过期，不会一直显示在线。
- 接口请求失败时显示不可用，不会把旧数据当成实时状态。

首次 Nowcast 上报前，卡片可以兼容读取 `/api/now-playing` 的旧快捷指令状态；第一次上报后，不会在暂停共享时重新显示旧状态。音乐专辑墙使用 `src/data/favorites.ts`，不由 Nowcast 自动更新。

### 自己发送状态（可选）

脚本也可以调用同一接口。将 `NOWCAST_ENDPOINT` 和 `NOWCAST_WRITE_SECRET` 设置为自己的端点与写入密钥，再运行这个 Node.js 示例：

```javascript
const response = await fetch(process.env.NOWCAST_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-now-playing-secret': process.env.NOWCAST_WRITE_SECRET,
  },
  body: JSON.stringify({
    version: 1,
    activity: { kind: 'writing', title: '写一篇新文章', source: 'Obsidian' },
    music: null,
    observedAt: new Date().toISOString(),
  }),
});
console.log(response.status, await response.json());
```

保存为 `.mjs` 文件后用 Node.js 运行。返回 `200` 和 `ok: true` 表示上报成功。清空状态时将 `activity` 和 `music` 都设为 `null`，仍需发送当前的 `observedAt`。

`401` 表示写入密钥不匹配，`400` 请检查字段和设备时间，`409` 表示已有更新的状态，`503` 请检查环境变量及 SQL 迁移。一次上报只展示约 3 分钟；持续展示需要心跳更新。不要上传原始窗口标题、网页地址或笔记正文，字段格式见 `src/utils/presence.ts`。

---

## 🎵 音乐专辑配置

#### `src/data/favorites.ts`

**⚠️ 必须先导入图片：**

```typescript
// 1. 导入专辑封面
import AlbumCover1 from '@/assets/albums/album1.jpg';
import AlbumCover2 from '@/assets/albums/album2.webp';

// 2. 使用导入的变量
export const favorites = [
  {
    name: 'Artist Name',
    subtitle: 'Album Title',
    image: AlbumCover1,  // ⚠️ 使用变量，不是字符串路径
    href: 'https://open.spotify.com/album/xxx',
    alt: 'Artist - Album Title',
  },
  // 更多专辑...
];
```

**准备图片：**
1. 放入 `src/assets/albums/` 目录
2. 推荐格式：`.webp` / `.jpg`
3. 推荐尺寸：500×500 或 1000×1000

### 禁用音乐专辑

在 `src/pages/index.astro` 中移除相关代码。

---

## 🗺️ 文章音乐与旅行地图

完整的可复制示例与实际效果见[欢迎使用 Tyndall 主题](/blog/welcome)。这两种文章指令不需要 Supabase，也不依赖 Memos 或 Nowcast。

### Apple Music 播放器

将分享链接放进 `::apple-music{url="分享链接"}`，独占一行，前后留空行。支持歌曲、专辑和公开歌单；`height` 可以调整高度，`title` 可以设置播放器的无障碍标题：

```markdown
::apple-music{url="https://music.apple.com/us/album/how-to-be-a-human-being/1440840097" height="450" title="文章配乐"}
```

不需要 Apple API key。如果出现“无法识别的链接”，请使用完整的 `https://music.apple.com/...` 地址，并保留单曲链接中的 `?i=` 参数。普通 `[文字](链接)` 仍然是普通链接，不会自动变成播放器。

### 地点与多日行程

文章 frontmatter 的 `map.days` 中，每天填写 `day`、`color` 和至少一个地点（`stops`）。每个地点填写 `name`、`coords: [经度, 纬度]`，可选 `note`。正文使用 `::travel-map{height="480"}`。

`map` 还支持 `center: [经度, 纬度]`、`zoom` 和 `basemap`；最后一项是可供 MapLibre 加载的 style JSON 地址，不是地图网页链接。默认底图来自 OpenFreeMap，浏览器需要能访问底图及其资源。没有特殊需求时保留默认值即可。

### 自驾路线（可选）

默认按地点顺序连直线。需要沿道路显示时，在对应天的数据中添加 `road: true`，并确保至少两个地点。在项目根目录运行：

```bash
pnpm routes:build --all
```

脚本会向 OSRM 的 driving 路由服务查询，生成 `src/data/routes/<translationKey>.json`。发布自己的站点时，需要让生成文件进入构建环境；正式 `pnpm build` 不会自动查询路线。开发模式下，修改文章后会尝试自动更新路线。

`translationKey` 要保持稳定且不含路径分隔符；中英文共享同一个 key 时，天数和坐标也应一致。没有路线文件时会退回直线；修改或取消 `road` 后，请重新核对生成文件，旧文件不会总是自动清理。

> **关于路线：** 这是驾车路线，不是步行或公交导航。生成时会将地点坐标发送给第三方路由服务；不要填入不愿公开的位置。`/travel` 的照片相册是另一项功能，文章地图不会自动读取照片的 EXIF。

---

## 🔧 实验室配置（Lab 页面）

实验室不是打开页面后实时请求你的私人服务，而是先生成 JSON，再在构建博客时展示。公开版带有示例数据；不接外部服务也能预览，但不会自动变成你的真实数据。

| 内容 | 数据来源 | 本地文件 |
| --- | --- | --- |
| 写作节奏 | `src/content` 的 Git 提交历史 | `src/data/writing-heatmap.json` |
| 最近收藏 | Karakeep API | `src/data/bookmarks.json` |
| 服务器指标 | Beszel API | `src/data/servers.json` |
| 自建服务列表与可达状态 | 手动填写的服务地址、Actions HTTP 检查 | `src/data/services.json` |

更新流程是：**Actions 运行脚本 → 保存并提交 JSON → 重新构建博客 → 页面显示新快照**。只抓取成功但没有部署，线上内容仍然是上一次构建的数据。

### 1. 写作节奏

在项目根目录运行：

```bash
node .github/scripts/generate-heatmap.mjs
```

它统计最近 15 个月的提交日期和次数，不需要 GitHub API token，也不是统计字数或写作时长。普通仓库只统计涉及 `src/content` 的提交；如果内容目录本身是 Git 子模块，则统计内容仓库的历史。未提交的本地草稿不会计入。

Actions 的 checkout 需要 `fetch-depth: 0`，否则浅克隆可能只统计到少量提交。默认公开版不是子模块，不需要启用 `ENABLE_CONTENT_SUBMODULE`。只有自己改为子模块结构后，才使用 `.github/workflows/update-submodule.yml`；其中的 `SUBMODULE_TOKEN` 既要能读取内容仓库，也要能向博客主仓库写入提交。该流程接受手动触发或 `submodule-updated` dispatch，不是定时自动检查。

### 2. 最近收藏（Karakeep）

在 Karakeep 的 **Settings → API Keys** 创建 key。脚本需要 `KARAKEEP_URL`（实例根地址，不带末尾 `/`）和 `KARAKEEP_API_KEY`，通过 Bearer 请求 `/api/v1/bookmarks?limit=12`。参考 [Karakeep API](https://docs.karakeep.app/api/karakeep-api/)。

```bash
node .github/scripts/fetch-bookmarks.mjs
```

运行前需在终端配置上述环境变量；Node 脚本不会自动读取 Astro 的 `.env`。Actions 则按下方步骤使用仓库 Secrets。

**⚠️ 先确认哪些收藏可以公开：** 当前脚本取 API 返回的前 12 条，再保留链接类型，不会按“公开列表”或“已加星”过滤，因此结果也可能少于 12 条。它还会写入标签、备注和原始链接，即使页面没有展示备注，提交到公开仓库后仍然可见。建议使用只存公开收藏的专用账号，或先修改脚本增加明确的导出筛选。

### 3. 服务器指标（Beszel）

先部署自己的 Beszel Hub 和 Agent，确认 Hub 内已经有机器与历史数据，再配置：

- `BESZEL_URL`：Hub 根地址，不带末尾 `/`。
- `BESZEL_EMAIL`、`BESZEL_PASSWORD`：当前脚本登录 PocketBase `_superusers` 使用的账号和密码。

```bash
node .github/scripts/fetch-servers.mjs
```

脚本读取最多 50 个系统，并为每个系统读取最多 24 个 `10m` 历史点，生成 CPU、内存和磁盘指标。它依赖 Beszel/PocketBase 的具体字段，升级服务后应重新检查；官方也提示 [API 结构可能变化](https://beszel.dev/guide/rest-api)。

> **关于权限与隐私：** 当前实现使用高权限 superuser 登录，并非只读 token。只在你信任的私有运行环境中配置，或先改为适合自己实例的最小权限访问。导出的系统名称、ID 和指标将公开，不要直接导出包含敏感机器信息的完整实例。

### 4. 自建服务列表

#### `src/data/services.json`

```json
{
  "services": [
    {
      "name": "Service Name",
      "url": "https://service.yourdomain.com",
      "icon_svg": "<svg>...</svg>",
      "desc": "服务描述",
      "category": "Tools",
      "status": { "state": "up", "http": 200 }
    }
  ]
}
```

**可用分类：** `Tools` / `Storage` / `DevOps` / `Admin`

在 `src/utils/ui.ts` 中添加服务描述翻译：

```typescript
"services": {
  "your_service": { "desc": "服务描述" }
}
```

---

### 5. 用 GitHub Actions 更新

仓库现有 `.github/workflows/update-lab-status.yml` 只更新 `services.json`，设置仓库 **Variables** 中的 `ENABLE_LAB_SYNC=true` 后，可手动运行，也会按每小时一次的计划执行。它不会顺便抓取收藏或服务器指标。

写作节奏、收藏和服务器指标使用单独的示例。先审查脚本会公开的数据，再在自己的 fork 中复制：

```bash
cp docs/examples/sync-lab-data.yml .github/workflows/sync-lab-data.yml
```

在 **Settings → Secrets and variables → Actions** 配置：

| Variables | 含义 |
| --- | --- |
| `ENABLE_LAB_DATA_SYNC=true` | 开启这份数据同步示例 |
| `ENABLE_WRITING_HEATMAP=true` | 更新写作节奏 |
| `ENABLE_KARAKEEP_SYNC=true` | 更新最近收藏 |
| `ENABLE_BESZEL_SYNC=true` | 更新服务器指标 |

没有开启的项目会保留原 JSON，可以只使用其中一项。对应凭据添加到 **Secrets**，名称就是上文列出的 `KARAKEEP_*` 和 `BESZEL_*`。所有这些凭据都不加 `PUBLIC_` 前缀，也不需要放进博客前端。

这份示例用于普通内容目录，不会克隆私人子模块；子模块用户需自行补上 checkout 权限和完整历史。提交工作流后，允许 Actions 写入仓库，在 **Actions → Sync Lab Data → Run workflow** 首次运行并检查输出，之后默认每 6 小时更新。分支保护仍可能阻止机器人 push，需要按自己的仓库规则改成 PR 流程。

如果服务只在内网，GitHub 托管 runner 无法直接访问，需要自己的 runner 或受控网络连接。脚本支持 `CI_BYPASS_SECRET` 对应的 `X-CI-Bypass` 请求头，示例分别从 `KARAKEEP_CI_BYPASS_SECRET` 和 `BESZEL_CI_BYPASS_SECRET` 读取；它只适用于你自己配置过的网关规则，**不是 Cloudflare Access 的通用凭据**。没有这样的规则就留空，不要为了 CI 关闭访问保护。

### 6. 让线上页面更新

生成 JSON 后仍然需要重新构建。Vercel 等平台若没有自动响应机器人提交，可以创建该站点的 Deploy Hook，将地址保存为 `LAB_DEPLOY_HOOK_URL` Secret；`sync-lab-data.yml` 示例会在提交成功后调用它。原有 `update-lab-status.yml` 不包含这一步，如也依赖 Hook 更新服务状态，需要为它添加同样的部署步骤。

GitHub Pages 的 `push` 工作流通常不会被 `GITHUB_TOKEN` 产生的提交再次触发。可以显式运行部署工作流，或将构建部署合并到同步流程，不能把“提交成功”等同于“部署成功”。[GitHub 的工作流触发规则](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)

服务可达检查把 2xx、3xx、401、403、405 都视为可达，只代表 HTTP 端点回应，不代表应用内部功能健康。Actions 定时任务也不是实时监控；同步失败时线上通常仍保留旧快照，请同时查看 Actions 和部署日志。

如果暂时不接这些服务，保留示例或手动维护 JSON 即可。想清空展示时，将对应的 `days`、`bookmarks`、`systems` 数组设为 `[]`，再重新构建。

---

## 📡 RSS 配置

#### `src/pages/rss.xml.js` & `src/pages/en/rss.xml.js`

```javascript
return rss({
  title: 'Your Blog Name',
  description: '博客描述',
  site: context.site,
  items: posts.map((post) => ({
    author: 'Your Name',
    customData: `<dc:creator>Your Name</dc:creator>`,
  })),
  customData: `
    <copyright>© ${new Date().getFullYear()} Your Name</copyright>
    <webMaster>your@email.com</webMaster>
  `,
});
```

---

## ✍️ 创建内容

### 博客文章

在 `src/content/blog/` 创建 `.md` 文件：

```markdown
---
title: 文章标题
description: 文章描述（SEO）
pubDate: 2025-01-15
updatedDate: 2025-01-16        # 可选
lang: zh                        # zh 或 en
translationKey: my-post         # 用于多语言配对 & URL slug
category: Tech                  # 可选
published: true                 # 可选，默认 true
---

正文内容...
```

**英文版本：** 在 `src/content/blog/en/` 创建同名文件，使用相同的 `translationKey`。

### Notes 笔记

Notes 是与博客文章共用 `blog` 集合的独立内容区，通过 `category: 'notes'` 字段区分，有独立的列表页（`/notes`）和详情页（`/notes/[slug]`），支持分页和多语言。

在 `src/content/blog/` 创建 `.md` 文件，`category` 设为 `notes`：

```markdown
---
title: 笔记标题
description: 简短描述（可选）
pubDate: 2025-06-01
lang: zh
translationKey: my-note
category: notes          # ⚠️ 必须为 'notes' 才会出现在 Notes 页面
published: true
---

笔记正文...
```

**子目录分组：** 将笔记文件放入子目录（如 `src/content/blog/reading/my-note.md`），笔记列表页会自动将目录路径显示为话题标签（如 `reading`）。

**英文版本：** 在 `src/content/blog/en/` 下同样使用 `category: 'notes'`，保持相同的 `translationKey`。

### 支持的 Markdown 功能

- **数学公式**（KaTeX）：`$E=mc^2$` 或 `$$...$$`
- **代码高亮**（Shiki）：支持 Light/Dark 双主题
- **自动标题锚点**
- **图片懒加载优化**
- **软换行支持**（remark-breaks）

---

## ⚡ Service Worker

主题内置了 `public/sw.js`，在生产环境中自动注册，为静态资源、字体和图片提供缓存加速：

| 缓存策略 | 适用资源 | 有效期 |
|----------|----------|--------|
| Cache-First | 字体文件 | 30 天 |
| Cache-First | CDN 脚本 | 7 天 |
| Cache-First | 图片 | 7 天 |
| Network-First | 页面 HTML | 1 天 |

**开发模式下** Service Worker 会被自动注销，避免 Vite HMR 缓存冲突。

### 禁用 Service Worker

若不需要离线缓存，删除 `public/sw.js`，并在 `src/layouts/Layout.astro` 中移除以下脚本块：

```javascript
// Service Worker lifecycle
if (!isDev && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

---

## 🚀 部署

推荐使用 Vercel，导入仓库就可以开始部署。也可以选择 Cloudflare Workers 或 GitHub Pages，按对应步骤配置即可。

### Vercel（推荐）

1. Fork 本项目，将修改后的代码推送到 GitHub。
2. 在 [Vercel](https://vercel.com) 导入仓库，框架选择 **Astro**，根目录选择 `package.json` 所在目录，Node.js 选择 **22.x**。
3. 安装命令填写 `pnpm install --frozen-lockfile`，构建命令填写 `pnpm build`，输出目录保持默认。
4. 在 **Environment Variables** 中添加 `PUBLIC_SITE_URL`，填写你的完整站点地址，如 `https://your-blog.vercel.app`。其他变量参考 `.env.example`，按需填写。
5. 点击 **Deploy**，等待部署完成。

绑定自己的域名后，记得更新 `PUBLIC_SITE_URL`，并重新部署。使用 Supabase 登录时，也要同步修改 Site URL 和 Redirect URLs。

> **关于环境变量：** 不要将 `.env` 提交到仓库。服务端密钥不能加 `PUBLIC_` 前缀；修改公共变量后需要重新部署。评论通知和 Telegram 的配套 Worker 需要单独部署。

更多配置可参考 [Astro 的 Vercel 部署指南](https://v5.docs.astro.build/en/guides/deploy/vercel/)。

### Cloudflare Workers

如果你习惯使用 Cloudflare，也可以把博客部署到 Workers。

#### 1. 安装适配器

本项目使用 Astro 5，安装对应版本的适配器：

```bash
pnpm add @astrojs/cloudflare@12.6.12
pnpm add -D wrangler@4
```

修改 `astro.config.mjs`，将 Vercel 的导入和 `adapter` 替换为以下内容，其他配置保持不变：

```javascript
import cloudflare from '@astrojs/cloudflare'; // 替换 vercel import
// defineConfig 内：
output: 'static',
adapter: cloudflare({ imageService: 'compile' }),
```

保留 `output: 'static'`，让文章和 OG 图片继续在构建时生成。

#### 2. 添加配置文件

在项目根目录创建 `wrangler.jsonc`，将名称和 Supabase 地址替换为自己的配置：

```json
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-tyndall-site",
  "main": "dist/_worker.js/index.js",
  "compatibility_date": "2026-09-18",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]
  },
  "vars": {
    "PUBLIC_SUPABASE_URL": "https://your-project.supabase.co"
  }
}
```

创建 `public/.assetsignore`，避免将服务端代码作为静态文件发布：

```text
_worker.js
_routes.json
```

#### 3. 构建并部署

先参考 `.env.example` 在本地 `.env` 中填写 `PUBLIC_SITE_URL` 和需要的 Supabase 公共配置，再运行：

```bash
pnpm build
pnpm exec wrangler dev
# 本地确认后停止预览，再登录并部署
pnpm exec wrangler login
pnpm exec wrangler deploy
```

启用 Nowcast 或评论通知时，按需添加对应密钥，运行后根据提示输入：

```bash
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put NOW_PLAYING_SECRET
pnpm exec wrangler secret put COMMENT_NOTIFY_URL
pnpm exec wrangler secret put COMMENT_NOTIFY_SECRET
```

> **关于密钥：** 构建变量和 Worker 运行时密钥需要分别配置。本地预览的密钥放在 `.dev.vars` 中，不要提交到仓库，也不要写进 `wrangler.jsonc`。

如果想通过 GitHub 自动部署，可以在 Workers Builds 中导入仓库，安装命令填写 `pnpm install --frozen-lockfile`，构建命令填写 `pnpm build`，部署命令填写 `pnpm exec wrangler deploy`，并添加同样的构建变量。

更多配置可参考 [Astro 5 的 Cloudflare 部署指南](https://v5.docs.astro.build/en/guides/deploy/cloudflare/)。`vercel.json` 在此平台不生效，响应头和缓存规则需要另行配置。

### GitHub Pages（静态部署）

GitHub Pages 适合只需要静态博客的用户。文章、地图和相册可以正常使用；评论和 Memos 可以连接 Supabase，但 Nowcast 和评论邮件通知需要另外部署后端。

**⚠️ 域名要求：** 使用 `username.github.io` 仓库，或为仓库绑定自定义域名。主题目前使用根路径，`username.github.io/repo-name/` 这样的子路径还需要额外适配，不能只修改 `base`。

#### 1. 调整为静态构建

在自己的部署分支中，将动态接口移出页面目录，保留源码：

```bash
mkdir -p src/server
mv src/pages/api src/server/api
```

在 `astro.config.mjs` 中删除 Vercel 的导入和 `adapter: vercel({})`，保留 `output: 'static'`。

#### 2. 配置自动部署

打开仓库 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。

创建 `.github/workflows/deploy-pages.yml`（下面假设默认分支叫 `main`）：

```yaml
name: Deploy static site to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: github-pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.17.1
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: actions/configure-pages@v5
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          PUBLIC_SITE_URL: ${{ vars.PUBLIC_SITE_URL }}
          PUBLIC_SUPABASE_URL: ${{ vars.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ vars.PUBLIC_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 3. 设置站点地址

在 **Settings → Secrets and variables → Actions → Variables** 中添加 `PUBLIC_SITE_URL`，填写 `https://username.github.io` 或自己的完整域名。Supabase 的两项公共变量按需填写，不要添加服务端密钥。

使用自定义域名时，在 Pages 设置中绑定域名并配置 DNS，再创建 `public/CNAME`，只填写域名，不带 `https://`。

提交修改后，等待 Actions 运行完成，就可以访问你的博客了。

更多配置可参考 [Astro 的 GitHub Pages 部署指南](https://v5.docs.astro.build/en/guides/deploy/github/)。

---

## 🎨 自定义样式

| 文件 | 用途 |
|------|------|
| `src/components/GlobalStyles.astro` | 全局 CSS 变量、颜色 |
| `src/styles/markdown.css` | 文章内容样式 |
| `src/styles/fonts.css` | 字体配置（font-family 变量） |
| `public/fonts/google-fonts.css` | 本地 Google Fonts 字体声明 |
| `public/fonts/google/` | 本地化 woff2 字体文件目录 |

### 本地字体方案

主题使用**本地镜像 Google Fonts** 替代 CDN 请求，字体文件存放在 `public/fonts/google/` 目录，由 `public/fonts/google-fonts.css` 统一声明。`Layout.astro` 通过异步非阻塞方式加载该样式表：

```html
<link rel="stylesheet" href="/fonts/google-fonts.css"
      media="print" onload="this.media='all'; this.onload=null;" />
<noscript><link rel="stylesheet" href="/fonts/google-fonts.css" /></noscript>
```

如需更换字体，替换 `public/fonts/` 下的 woff2 文件和 CSS 声明，并同步修改 `src/styles/fonts.css` 中的 `font-family` 变量即可。

### 修改配色

在 `GlobalStyles.astro` 中修改 CSS 变量：

```css
:root {
  --primary: #a259ec;
  --text: #1a1a1a;
  --bg: #faf8f6;
  /* ... */
}
```

---

## ❓ 常见问题

### 文章不显示？

✅ Frontmatter YAML 格式正确？  
✅ `lang` 字段设置了？（`zh` 或 `en`）  
✅ `published` 不是 `false`？  
✅ 重启开发服务器？

### 禁用粒子效果？

在 `src/components/UserInfo.astro` 底部删除 `<script>` 标签和 `#ender-particles` 元素。

### 添加新导航页面？

1. 创建页面：`src/pages/my-page.astro`
2. 添加翻译：在 `ui.ts` 中添加 `nav_mypage`
3. 修改导航：在 `Header.astro` 中添加链接

### 优化加载速度？

- 使用 WebP 图片格式
- 移除不需要的功能（粒子、评论、音乐等）
- 部署到 Vercel/Cloudflare 享受 CDN

---

## 🆘 获取帮助

1. [Astro 官方文档](https://docs.astro.build/)
2. [Supabase 官方文档](https://supabase.com/docs)
3. [GitHub Issues](https://github.com/Moyuin-aka/tyndall-public/issues)

---

**配置完成后，运行 `pnpm dev` 预览你的博客，享受写作吧！** ✨
