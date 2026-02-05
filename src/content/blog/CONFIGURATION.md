---
title: Tyndall 配置指南
description: Tyndall v1.1.0 配置指南，帮助你快速搭建属于自己的博客
pubDate: 2025-01-15
updatedDate: 2026-02-06
translationKey: config
lang: zh
---

# Tyndall 配置指南

> **版本：v1.1.0**  
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
});
```

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
PUBLIC_COMMENT_NOTIFY_URL=https://your-notify-worker.workers.dev
PUBLIC_COMMENT_NOTIFY_SECRET=your-secret
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

### 禁用评论系统

编辑 `src/pages/blog/[...slug].astro`，删除或注释：

```astro
<SupabaseComments ... />
```

---

## 📝 Memos 碎碎念配置（Supabase）

v1.1.0 的 Memos 功能也使用 **Supabase** 存储，不再依赖独立的 Memos 服务。

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
```

**环境变量：** 与评论系统共享，无需额外配置。

### 禁用 Memos

- 删除 `src/pages/memos.astro` 和 `src/pages/en/memos.astro`
- 在 `src/components/Header.astro` 中移除 Memos 导航链接

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

## 🔧 服务状态配置（Lab 页面）

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

### 支持的 Markdown 功能

- **数学公式**（KaTeX）：`$E=mc^2$` 或 `$$...$$`
- **代码高亮**（Shiki）：支持 Light/Dark 双主题
- **自动标题锚点**
- **图片懒加载优化**
- **软换行支持**（remark-breaks）

---

## 🚀 部署

### Vercel（推荐）

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 添加环境变量（Supabase 配置）
4. 部署完成

### 其他平台

**Netlify / Cloudflare Pages：**

```javascript
// astro.config.mjs
import netlify from '@astrojs/netlify/static';
// 或
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: netlify(), // 或 cloudflare()
});
```

**GitHub Pages：**

```javascript
export default defineConfig({
  site: 'https://username.github.io',
  base: '/repo-name',
});
```

---

## 🎨 自定义样式

| 文件 | 用途 |
|------|------|
| `src/components/GlobalStyles.astro` | 全局 CSS 变量、颜色 |
| `src/styles/markdown.css` | 文章内容样式 |
| `src/styles/fonts.css` | 字体配置 |

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
