---
title: Tyndall 配置指南
description: 详细的 Tyndall 主题配置指南，帮助你快速定制你的博客
pubDate: 2025-01-15
translationKey: config
lang: zh
---

# Tyndall 配置指南

本文档提供详细的配置说明，帮助你快速定制你的博客。建议按顺序完成配置。

## 📋 必须配置项

### 1. 基础站点信息

#### `astro.config.mjs`

这是 Astro 的核心配置文件，必须正确配置你的域名：

```javascript
export default defineConfig({
  site: 'https://yourdomain.com',  // ⚠️ 必须替换为你的实际域名
  output: 'static', 
  adapter: vercel({}),  // 如果不用 Vercel，可以移除此行
  integrations: [sitemap(), prefetch()],
  i18n: { 
    locales: ['en', 'zh'],  // 支持的语言
    defaultLocale: 'zh',    // 默认语言
    routing: {
      prefixDefaultLocale: false  // 默认语言不加前缀
    }
  },
  // ... 其他配置
});
```

**重要说明：**
- `site` 用于生成 RSS、sitemap 等，必须是完整的 URL
- 如果使用其他部署平台，需要修改或移除 `adapter`
- `i18n` 配置决定了网站的语言结构


### 2. 个人信息配置

#### `src/components/UserInfo.astro`

这个组件控制首页的个人信息展示。

**更新社交链接：**

```javascript
// 在文件顶部附近找到这部分代码
const socialLinks = [
  { name: 'GitHub', icon: ICONS.github, url: 'https://github.com/yourusername' },
  { name: 'Twitter', icon: ICONS.twitter, url: 'https://twitter.com/yourusername' },
  { name: 'Telegram', icon: ICONS.telegram, url: 'https://t.me/yourusername' },
  { name: 'Email', icon: ICONS.mail, url: 'mailto:your@email.com' }
];
```

**可用的图标：**
- `ICONS.github`, `ICONS.twitter`, `ICONS.telegram`, `ICONS.mail`
- `ICONS.linkedin`, `ICONS.mastodon` 等
- 查看 `src/utils/icons.ts` 获取完整列表

**添加新的社交链接：**

```javascript
const socialLinks = [
  // ... 现有链接
  { name: 'LinkedIn', icon: ICONS.linkedin, url: 'https://linkedin.com/in/yourprofile' },
  { name: 'Mastodon', icon: ICONS.mastodon, url: 'https://mastodon.social/@yourname' },
];
```

**更新显示名称：**

在同一文件中找到并修改：
```astro
<span class="author-name">Your Name</span>
```

### 3. 友情链接配置

#### `src/data/friends.ts`

配置你的友情链接和申请说明。

**添加友链：**

```typescript
export const friends: Friend[] = [
  {
    name: "Friend Name",           // 友链名称
    url: "https://example.com",    // 友链地址
    avatar: "https://example.com/avatar.png",  // 头像 URL
    description: "Friend's description",       // 简短描述
    tags: ["Friends"]              // 标签分类
  },
  {
    name: "Another Friend",
    url: "https://another.com",
    avatar: "https://github.com/username.png",  // 可以使用 GitHub 头像
    description: "Another description",
    tags: ["Tech", "Blogger"]      // 支持多个标签
  },
  // 添加更多友链...
];
```

**可用的标签：**
- 自定义任意标签，如：`["Friends"]`, `["Tech"]`, `["Blogger"]`, `["Developer"]` 等
- 标签会在友链页面显示，帮助分类

**配置友链申请说明（双语）：**

```typescript
export const friendshipGuidelines = {
  zh: {
    myInfo: {
      name: 'Your Name',                        // 你的名字
      avatar: 'https://yourdomain.com/avatar.webp',  // 你的头像 URL
      url: 'https://yourdomain.com',           // 你的网站地址
      description: '你的网站简介'               // 你的简介
    },
    howToApply: '如果你也想和我交换友链，可以通过 <a href="mailto:your@email.com">邮件</a> 或者其他方式联系我～'
  },
  en: {
    myInfo: {
      name: 'Your Name',
      avatar: 'https://yourdomain.com/avatar.webp',
      url: 'https://yourdomain.com',
      description: 'Your site description'
    },
    howToApply: 'If you\'d like to exchange links, feel free to reach out via <a href="mailto:your@email.com">email</a>!'
  }
};
```

**注意：**
- `avatar` 必须是完整的 URL（http:// 或 https://）
- 支持 HTML 标签（如 `<a>`, `<strong>` 等）

### 4. 服务状态配置（可选）

#### `src/data/services.json`

如果你有自托管服务，可以在 Lab 页面展示它们的状态。

**基本配置：**

```json
{
  "services": [
    {
      "name": "Service Name",                    // 服务名称
      "url": "https://service.yourdomain.com",  // 服务地址
      "icon_svg": "<svg>...</svg>",             // SVG 图标代码
      "desc": "Service description",            // 服务描述
      "category": "Tools",                      // 分类
      "status": {
        "state": "up",      // 状态：up/down
        "http": 200         // HTTP 状态码
      }
    }
  ]
}
```

**可用的分类（category）：**
- `Tools` - 工具
- `Storage` - 存储
- `DevOps` - 运维
- `Admin` - 管理

**获取 SVG 图标：**
- [Lucide Icons](https://lucide.dev/) - 推荐，风格统一
- [Heroicons](https://heroicons.com/)
- [Feather Icons](https://feathericons.com/)

复制 SVG 代码时，确保包含完整的 `<svg>` 标签和所有属性。

**⚠️ 国际化支持：**

服务描述默认只支持一种语言。如需多语言，需在 `src/utils/ui.ts` 中配置：

```typescript
// 在 ui.ts 的 translations 对象中添加：
"services": {
  "memos": { 
    "desc": "轻量级的自托管备忘录中心。",
    "desc_en": "A lightweight, self-hosted memo hub." 
  },
  // 为每个服务添加翻译...
}
```

然后在 `services.json` 中使用键名引用：
```json
{
  "name": "Memos",
  "desc": "memos",  // 引用 ui.ts 中的键
  // ...
}
```

**如果不需要此功能：**
- 删除 `src/data/services.json`
- 在 `src/pages/lab.astro` 中移除相关代码
### 5. 评论系统配置（可选）

#### `src/components/TwikooComments.astro`

主题集成了 [Twikoo](https://twikoo.js.org/) 评论系统。

**配置步骤：**

1. **部署 Twikoo 后端**（选择一种）：
   - Vercel 部署（推荐）：[官方文档](https://twikoo.js.org/quick-start.html#vercel-%E9%83%A8%E7%BD%B2)
   - Railway 部署
   - 自建服务器

2. **获取 API 地址**：
   - Vercel：`https://your-twikoo-app.vercel.app`
   - 自建：`https://your-domain.com/twikoo`

3. **在组件中配置**：

找到这部分代码并修改：
```javascript
window.twikoo.init({
  envId: 'https://your-twikoo-api.com',  // ⚠️ 替换为你的 Twikoo API 地址
  el: '#tcomment',
  path: location.pathname,
  lang,  // 自动跟随网站语言
});
```

**如果不需要评论系统：**

在博客文章模板中移除评论组件：
- 编辑 `src/pages/blog/[...slug].astro`
- 删除或注释 `<TwikooComments />` 组件

### 6. 音乐专辑配置（可选）

#### `src/data/favorites.ts`

在首页展示你喜欢的音乐专辑。

**⚠️ 重要：必须先导入图片！**

```typescript
// 1. 先在文件顶部导入专辑封面图片
import AlbumCover1 from '@/assets/albums/album1.jpg';
import AlbumCover2 from '@/assets/albums/album2.jpg';
import AlbumCover3 from '@/assets/albums/album3.webp';

// 2. 然后在数组中使用导入的图片
export const favorites = [
  {
    name: 'Artist Name',           // 艺术家名称
    subtitle: 'Album Title',       // 专辑名称
    image: AlbumCover1,            // ⚠️ 使用导入的变量，不是字符串！
    href: 'https://open.spotify.com/album/xxx',  // Spotify/Apple Music 链接
    alt: 'Artist - Album Title',   // 图片描述
  },
  {
    name: 'Another Artist',
    subtitle: 'Another Album',
    image: AlbumCover2,            // 每个都要先导入
    href: 'https://music.apple.com/...',
    alt: 'Another Artist - Another Album',
  },
  // 添加更多专辑...
];
```

**准备专辑封面图片：**

1. 将图片放在 `src/assets/albums/` 目录
2. 推荐格式：`.jpg`, `.webp`, `.png`
3. 推荐尺寸：500x500 或 1000x1000（正方形）
4. 文件名使用英文，如：`glass-animals.jpg`

**为什么必须导入？**

Astro 会优化导入的图片（自动压缩、生成多种尺寸、懒加载等）。直接使用字符串路径无法享受这些优化。

**获取专辑链接：**
- Spotify：打开专辑页面，点击分享 → 复制链接
- Apple Music：同样操作

**如果不需要此功能：**
- 在 `src/pages/index.astro` 中移除音乐专辑展示相关代码
- 删除 `src/data/favorites.ts`

## 📝 创建内容

### 新建博客文章

**1. 创建中文文章**

在 `src/content/blog/` 目录下创建 `.md` 文件，例如 `my-first-post.md`：

```markdown
---
title: 我的第一篇文章
description: 这是一篇测试文章
pubDate: 2025-01-15              # 发布日期（必填）
updatedDate: 2025-01-16          # 更新日期（可选）
lang: zh                         # 语言标识（必填）
translationKey: my-first-post    # 翻译关联键（必填，用于关联不同语言版本，且用于生成文章链接）
category: Tech                   # 分类（可填）
published: true                  # 是否发布（可选，默认 true）
---

## 文章开始

这里是文章内容...

### 支持的 Markdown 功能

- **加粗** 和 *斜体*
- 代码块
- 数学公式（KaTeX）
- 图表（Mermaid）
- 等等...
```

**2. 添加英文翻译（可选）**

在 `src/content/blog/en/` 创建**同名**文件 `my-first-post.md`：

```markdown
---
title: My First Post
description: This is a test post
pubDate: 2025-01-15
lang: en                         # ⚠️ 改为 en
translationKey: my-first-post    # ⚠️ 必须与中文版相同
category: Tech
---

## Article Start

Content in English...
```

**⚠️ 关键要点：**
- 两个文件使用**相同的 `translationKey`**（这样主题才能识别它们是同一篇文章）
- `lang` 必须设置为对应语言（`zh` 或 `en`）
- 文件名可以相同也可以不同，但建议保持一致

**3. Frontmatter 字段说明**

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `title` | ✅ | 文章标题 | `"我的文章"` |
| `description` | ✅ | 文章描述（用于 SEO） | `"这是一篇关于...的文章"` |
| `pubDate` | ✅ | 发布日期 | `2025-01-15` |
| `lang` | ✅ | 语言代码 | `zh` 或 `en` |
| `translationKey` | ✅ | 翻译关联键 | `unique-key` |
| `updatedDate` | ❌ | 最后更新日期 | `2025-01-16` |
| `heroImage` | ❌ | 封面图片路径 | `/images/cover.jpg` |
| `category` | ❌ | 文章分类 | `Tech`, `Life`, `Tutorial` |
| `published` | ❌ | 是否发布 | `true` 或 `false` |

### 添加图片

**方法 1：使用 public 目录（推荐用于文章图片）**

1. 将图片放在 `public/images/` 目录，例如：
   ```
   public/images/
   ├── my-post/
   │   ├── image1.jpg
   │   └── image2.png
   ```

2. 在文章中引用（路径从根目录开始）：
   ```markdown
   ![图片描述](/images/my-post/image1.jpg)
   ```

**方法 2：使用 src/assets（用于需要优化的图片）**

1. 放在 `src/assets/` 目录
2. 在文章中导入并使用（需要在 `.astro` 文件中，`.md` 文件不支持）

**图片优化建议：**
- 使用 WebP 格式（更小的文件大小）
- 压缩图片（推荐工具：[TinyPNG](https://tinypng.com/)）
- 使用描述性的 alt 文本（有利于 SEO 和无障碍）

### 文章分类管理

主题会自动从所有文章中提取 `category` 字段，生成分类页面。

**最佳实践：**
- 使用英文命名分类（如 `Tech`, `Life`, `Tutorial`）
- 保持分类数量适中（建议 3-8 个）
- 在 `src/utils/ui.ts` 中添加分类的多语言翻译

## 🌍 国际化 (i18n) 配置

### UI 文本翻译

所有界面文本都在 `src/utils/ui.ts` 中定义。

**结构说明：**

```typescript
export const translations = {
  zh: {
    // 中文翻译
    "home": "首页",
    "blog": "博客",
    "about": "关于",
    // ... 更多
  },
  en: {
    // 英文翻译
    "home": "Home",
    "blog": "Blog",
    "about": "About",
    // ... 更多
  }
};
```

**添加新的翻译项：**

```typescript
// 在两个语言对象中都要添加
zh: {
  // ... 现有翻译
  "new_text": "新文本",
},
en: {
  // ... 现有翻译
  "new_text": "New Text",
}
```

**在组件中使用：**

```astro
---
import { useTranslations } from '@utils/ui';
const t = useTranslations(Astro.currentLocale);
---

<h1>{t('new_text')}</h1>
```

**修改现有文本：**

1. 打开 `src/utils/ui.ts`
2. 找到对应的键（如 `"Manifesto"`）
3. 修改中英文值
4. 保存后重启开发服务器

**个性化主页宣言：**

```typescript
zh: {
  "Manifesto": "你的中文宣言",
  "introduction": "你的中文自我介绍...",
  // ...
},
en: {
  "Manifesto": "Your English Manifesto",
  "introduction": "Your English introduction...",
  // ...
}
```

### 添加新语言

如果要添加日语、法语等其他语言：

1. **在 `astro.config.mjs` 中添加语言代码：**
   ```javascript
   i18n: { 
     locales: ['en', 'zh', 'ja'],  // 添加 'ja'
     defaultLocale: 'zh',
   }
   ```

2. **在 `ui.ts` 中添加翻译对象：**
   ```typescript
   export const translations = {
     zh: { /* ... */ },
     en: { /* ... */ },
     ja: {  // 新增
       "home": "ホーム",
       "blog": "ブログ",
       // ... 翻译所有文本
     }
   };
   ```

3. **创建对应的内容目录：**
   ```
   src/content/blog/ja/
   ```

4. **创建对应的页面目录：**
   ```
   src/pages/ja/
   ```

## 🎨 自定义样式

### 主题颜色

主要颜色变量定义在各组件的 `<style>` 部分。

**核心颜色变量：**

```css
/* 深色模式主色调 */
--end-sky-deep: #2a0e3f;          /* 深紫色背景 */
--end-ambient-purple: #a259ec;    /* 紫色强调色 */
--end-ambient-pale: #f2e7b9;      /* 浅色点缀 */
```

**修改主题色：**

1. 打开 `src/components/UserInfo.astro`
2. 找到 `<style>` 部分
3. 修改颜色变量或添加新的全局样式
4. 也可以在 `src/styles/GlobalStyles.astro` 中定义全局颜色

**示例：改为蓝色主题**

```css
:global(body)::before {
  background:
    radial-gradient(1200px 800px at 20% 10%, #0e1f3f 0%, ...),  /* 深蓝 */
    radial-gradient(1000px 700px at 80% 30%, #4287f5 0%, ...),  /* 亮蓝 */
    /* ... */
}
```

### 字体配置

在 `src/styles/fonts.css` 中配置字体。

**默认字体栈：**

```css
/* 衬线字体（用于标题和宣言） */
font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", 
             STSong, "LXGW WenKai", Garamond, "Times New Roman", 
             Georgia, serif;

/* 无衬线字体（用于正文） */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             "Noto Sans SC", sans-serif;
```

**使用自定义字体：**

1. **使用 Google Fonts：**
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Your+Font&display=swap');
   
   body {
     font-family: 'Your Font', sans-serif;
   }
   ```

2. **使用自托管字体：**
   - 将字体文件放在 `public/fonts/`
   - 在 `fonts.css` 中添加：
   ```css
   @font-face {
     font-family: 'Your Font';
     src: url('/fonts/your-font.woff2') format('woff2');
     font-weight: normal;
     font-display: swap;
   }
   ```

### 自定义组件样式

每个组件都有自己的 `<style>` 部分，可以直接修改。

**常见修改位置：**
- 首页样式：`src/components/UserInfo.astro`
- 文章样式：`src/styles/markdown.css`
- 全局样式：`src/styles/GlobalStyles.astro`
- 头部导航：`src/components/Header.astro`

## RSS 和 Memos 配置

### RSS 订阅配置

RSS 文件位于 `src/pages/rss.xml.js` 和 `src/pages/en/rss.xml.js`。

**需要修改的地方：**

```javascript
return rss({
  title: 'Your Blog Name',           // ⚠️ 博客名称
  description: '你的博客描述',        // ⚠️ 博客描述
  site: context.site,
  // ...
  items: posts.map((post) => ({
    // ...
    author: 'Your Name',              // ⚠️ 作者名称
    customData: `<dc:creator>Your Name</dc:creator>`,  // ⚠️ 作者名称
  })),
  customData: `
    <copyright>© ${new Date().getFullYear()} Your Name</copyright>
    <webMaster>your@email.com</webMaster>  // ⚠️ 你的邮箱
    // ...
  `,
});
```

### Memos 碎碎念配置（可选）

如果使用 [Memos](https://github.com/usememos/memos) 作为碎碎念功能：

**配置 API 地址：**

在 `src/utils/memos-render.ts` 中：

```typescript
renderMemos(
  'memos-loading',
  'memos-content',
  'memos-error',
  'https://your-memos-api.com',  // ⚠️ 替换为你的 Memos API 地址
  notFoundMsg,
  failedMsg
);
```

**部署 Memos：**
- Docker 部署：[官方文档](https://github.com/usememos/memos#docker)
- Railway/Zeabur 部署
- 自建服务器

**如果不需要 Memos：**
- 删除 `src/pages/memos.astro` 和 `src/pages/en/memos.astro`
- 在导航中移除 Memos 链接

## 🚀 部署配置

### Vercel（推荐）

项目已配置 Vercel 适配器，推送到 GitHub 后在 Vercel 导入即可。

**步骤：**
1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. Vercel 会自动检测 Astro 并使用正确的配置
4. 等待部署完成

**自定义域名：**
- 在 Vercel 项目设置中添加域名
- 在域名提供商处添加 DNS 记录
- 更新 `astro.config.mjs` 中的 `site` 字段

### Netlify

**修改配置：**

```javascript
// astro.config.mjs
import netlify from '@astrojs/netlify/static';

export default defineConfig({
  // ...
  adapter: netlify(),
});
```

**部署：**
1. 安装适配器：`pnpm add @astrojs/netlify`
2. 推送到 GitHub
3. 在 Netlify 导入项目

### Cloudflare Pages

```javascript
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  // ...
  output: 'server',  // 或 'hybrid'
  adapter: cloudflare(),
});
```

### GitHub Pages

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://username.github.io',
  base: '/repo-name',  // 如果部署在子目录
  // 移除 adapter
});
```

**使用 GitHub Actions 自动部署：**

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 静态托管（纯静态）

如果只需要静态文件：

```javascript
// astro.config.mjs
export default defineConfig({
  // ...
  output: 'static',
  // 移除 adapter
});
```

构建后，将 `dist/` 目录内容上传到任何静态托管服务：
- Nginx
- Apache
- AWS S3
- 阿里云 OSS
- 等等...

## ❓ 常见问题

### 如何禁用粒子背景效果？

**方法 1：完全禁用**

在 `src/components/UserInfo.astro` 中：
1. 找到粒子初始化脚本（文件底部）
2. 注释或删除整个 `<script>` 标签
3. 删除或注释 `<div id="ender-particles">` 元素

**方法 2：只在移动端禁用**

默认已经在移动端大幅降低粒子数量，如果想完全禁用：

```javascript
// 在 UserInfo.astro 底部的 script 中添加
if (window.matchMedia('(max-width: 768px)').matches) {
  // 移动端不加载粒子
  return;
}
```

### 如何修改主页宣言文字？

在 `src/utils/ui.ts` 中修改：

```typescript
zh: {
  "Manifesto": "你的新宣言",
  "introduction": "你的新自我介绍",
  // ...
},
en: {
  "Manifesto": "Your New Manifesto",
  "introduction": "Your new introduction",
  // ...
}
```

### 如何添加新的导航页面？

**1. 创建页面文件：**

```astro
// src/pages/my-page.astro
---
import Layout from '@layouts/Layout.astro';
import { useTranslations } from '@utils/ui';

const t = useTranslations(Astro.currentLocale);
---

<Layout title={t('my_page_title')}>
  <main>
    <h1>My New Page</h1>
    <!-- 页面内容 -->
  </main>
</Layout>
```

**2. 添加翻译文本：**

在 `src/utils/ui.ts` 中：
```typescript
zh: {
  "my_page_title": "我的页面 · Your Blog Name",
  "my_page": "我的页面",
  // ...
},
en: {
  "my_page_title": "My Page · Your Blog Name",
  "my_page": "My Page",
  // ...
}
```

**3. 添加导航链接：**

在 `src/components/Header.astro` 中找到导航链接部分并添加：
```astro
<a href={`/${currentLocale === 'zh' ? '' : 'en/'}my-page`}>
  {t('my_page')}
</a>
```

### 如何修改文章的永久链接格式？

默认格式是 `/blog/slug/`。如果要修改：

在 `src/content/config.ts` 中可以看到内容集合配置。路由由文件结构和 `translationKey` 决定。

如果需要完全自定义，可以在 `src/pages/blog/[...slug].astro` 中修改路由逻辑。

### 如何添加 Google Analytics / Umami 等分析工具？

**Google Analytics：**

在 `src/layouts/Layout.astro` 的 `<head>` 中添加：
```astro
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Umami：**

```astro
<script async defer data-website-id="your-website-id" 
        src="https://your-umami-instance.com/script.js"></script>
```

### 如何优化网站加载速度？

**已经实现的优化：**
- ✅ 静态生成（SSG）
- ✅ 图片自动优化
- ✅ 代码分割
- ✅ 预加载关键资源
- ✅ 移动端降低粒子数量

**额外优化：**

1. **使用 WebP 图片：**
   - 转换工具：[Squoosh](https://squoosh.app/)
   
2. **压缩图片：**
   - [TinyPNG](https://tinypng.com/)
   - [ImageOptim](https://imageoptim.com/)

3. **启用 CDN：**
   - Vercel 自动提供 CDN
   - Cloudflare Pages 也自带 CDN

4. **移除不需要的功能：**
   - 不需要粒子效果？移除它
   - 不需要评论？移除 Twikoo
   - 不需要音乐专辑？移除相关代码

### 文章不显示怎么办？

**检查清单：**

1. ✅ Frontmatter 格式正确？（YAML 格式，注意缩进）
2. ✅ `lang` 字段设置了吗？（`zh` 或 `en`）
3. ✅ `published` 字段是 `true` 或未设置？
4. ✅ 文件扩展名是 `.md`？
5. ✅ 文件放在正确的目录？（`src/content/blog/` 或 `src/content/blog/en/`）
6. ✅ 重启开发服务器试试？

### 如何备份网站内容？

**重要文件和目录：**

- ✅ `src/content/blog/` - 所有文章
- ✅ `public/images/` - 图片资源
- ✅ `src/data/` - 配置数据
- ✅ `src/assets/` - 资源文件
- ✅ 配置文件（`astro.config.mjs`, `package.json` 等）

**推荐方案：**
1. 使用 Git 版本控制（推荐）
2. 定期推送到 GitHub/GitLab
3. 本地保存副本

## 💡 最佳实践

### 内容组织

- 📁 为每篇文章的图片创建单独文件夹
- 📝 使用有意义的文件名（如 `understanding-javascript.md`）
- 🏷️ 保持分类数量适中（3-8 个）
- 📅 及时更新 `updatedDate` 字段

### 性能优化

- 🖼️ 图片使用 WebP 格式
- 📦 定期运行 `pnpm build` 检查构建大小
- 🎯 移除不需要的功能和依赖
- ⚡ 使用 CDN 加速静态资源

### SEO 优化

- ✍️ 每篇文章都写好 `description`
- 🖼️ 图片添加有意义的 `alt` 文本
- 📑 使用合理的标题层级（H1, H2, H3）
- 🔗 添加内部链接

### 安全性

- 🔒 不要在代码中硬编码敏感信息
- 🔑 使用环境变量存储 API 密钥
- 📦 定期更新依赖（`pnpm update`）
- 🛡️ 审查第三方脚本

### 可维护性

- 📝 添加代码注释
- 🗂️ 保持项目结构清晰
- 🔄 使用 Git 提交信息规范
- 📚 记录重要的配置变更

## 🆘 获取帮助

### 遇到问题？

1. **查看文档：**
   - [Astro 官方文档](https://docs.astro.build/)
   - [Tyndall README](https://github.com/Moyuin-aka/tyndall-public)

2. **搜索现有 Issues：**
   - GitHub Issues 中可能已有解决方案

3. **提问：**
   - 在 GitHub 创建新 Issue
   - 提供详细的错误信息和复现步骤
   - 附上相关配置文件

4. **社区资源：**
   - [Astro Discord](https://astro.build/chat)
   - [Astro 中文社区](https://github.com/withastro/docs/discussions)

---

**配置完成后，运行 `pnpm dev` 预览你的博客，享受写作吧！** ✨

如有其他问题，欢迎提 Issue！
