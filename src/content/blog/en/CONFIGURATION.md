---
title: Tyndall Configuration Guide
description: Detailed Tyndall theme configuration guide to help you quickly customize your blog
pubDate: 2025-01-15
translationKey: config
lang: en
---

# Tyndall Configuration Guide

This document provides detailed configuration instructions to help you quickly customize your blog. It's recommended to complete the configuration in order.

## 📋 Required Configuration

### 1. Basic Site Information

#### `astro.config.mjs`

This is Astro's core configuration file. You must configure your domain correctly:

```javascript
export default defineConfig({
  site: 'https://yourdomain.com',  // ⚠️ Must replace with your actual domain
  output: 'static', 
  adapter: vercel({}),  // Remove this line if not using Vercel
  integrations: [sitemap(), prefetch()],
  i18n: { 
    locales: ['en', 'zh'],  // Supported languages
    defaultLocale: 'zh',    // Default language
    routing: {
      prefixDefaultLocale: false  // Don't add prefix for default language
    }
  },
  // ... other configs
});
```

**Important Notes:**
- `site` is used for generating RSS, sitemap, etc. Must be a complete URL
- If using other deployment platforms, modify or remove `adapter`
- `i18n` configuration determines the site's language structure


### 2. Personal Information Configuration

#### `src/components/UserInfo.astro`

This component controls the personal information display on the homepage.

**Update social links:**

```javascript
// Find this section near the top of the file
const socialLinks = [
  { name: 'GitHub', icon: ICONS.github, url: 'https://github.com/yourusername' },
  { name: 'Twitter', icon: ICONS.twitter, url: 'https://twitter.com/yourusername' },
  { name: 'Telegram', icon: ICONS.telegram, url: 'https://t.me/yourusername' },
  { name: 'Email', icon: ICONS.mail, url: 'mailto:your@email.com' }
];
```

**Available icons:**
- `ICONS.github`, `ICONS.twitter`, `ICONS.telegram`, `ICONS.mail`
- `ICONS.linkedin`, `ICONS.mastodon`, etc.
- Check `src/utils/icons.ts` for the complete list

**Add new social links:**

```javascript
const socialLinks = [
  // ... existing links
  { name: 'LinkedIn', icon: ICONS.linkedin, url: 'https://linkedin.com/in/yourprofile' },
  { name: 'Mastodon', icon: ICONS.mastodon, url: 'https://mastodon.social/@yourname' },
];
```

**Update display name:**

Find and modify in the same file:
```astro
<span class="author-name">Your Name</span>
```

### 3. Friends Links Configuration

#### `src/data/friends.ts`

Configure your friendship links and application instructions.

**Add friends:**

```typescript
export const friends: Friend[] = [
  {
    name: "Friend Name",           // Friend's name
    url: "https://example.com",    // Friend's URL
    avatar: "https://example.com/avatar.png",  // Avatar URL
    description: "Friend's description",       // Brief description
    tags: ["Friends"]              // Category tags
  },
  {
    name: "Another Friend",
    url: "https://another.com",
    avatar: "https://github.com/username.png",  // Can use GitHub avatar
    description: "Another description",
    tags: ["Tech", "Blogger"]      // Supports multiple tags
  },
  // Add more friends...
];
```

**Available tags:**
- Customize any tags, e.g.: `["Friends"]`, `["Tech"]`, `["Blogger"]`, `["Developer"]`, etc.
- Tags will be displayed on the friends page to help categorize

**Configure friendship application instructions (bilingual):**

```typescript
export const friendshipGuidelines = {
  zh: {
    myInfo: {
      name: 'Your Name',                        // Your name
      avatar: 'https://yourdomain.com/avatar.webp',  // Your avatar URL
      url: 'https://yourdomain.com',           // Your website URL
      description: 'Your site description'      // Your description
    },
    howToApply: 'If you want to exchange links with me, feel free to contact via <a href="mailto:your@email.com">email</a>~'
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

**Notes:**
- `avatar` must be a complete URL (http:// or https://)
- Supports HTML tags (e.g., `<a>`, `<strong>`, etc.)

### 4. Service Status Configuration (Optional)

#### `src/data/services.json`

If you have self-hosted services, you can display their status on the Lab page.

**Basic configuration:**

```json
{
  "services": [
    {
      "name": "Service Name",                    // Service name
      "url": "https://service.yourdomain.com",  // Service URL
      "icon_svg": "<svg>...</svg>",             // SVG icon code
      "desc": "Service description",            // Service description
      "category": "Tools",                      // Category
      "status": {
        "state": "up",      // Status: up/down
        "http": 200         // HTTP status code
      }
    }
  ]
}
```

**Available categories:**
- `Tools` - Tools
- `Storage` - Storage
- `DevOps` - DevOps
- `Admin` - Admin

**Get SVG icons:**
- [Lucide Icons](https://lucide.dev/) - Recommended, consistent style
- [Heroicons](https://heroicons.com/)
- [Feather Icons](https://feathericons.com/)

When copying SVG code, ensure you include the complete `<svg>` tag and all attributes.

**⚠️ Internationalization support:**

Service descriptions only support one language by default. For multi-language support, configure in `src/utils/ui.ts`:

```typescript
// Add to the translations object in ui.ts:
"services": {
  "memos": { 
    "desc": "A lightweight, self-hosted memo hub.",
    "desc_zh": "轻量级的自托管备忘录中心。" 
  },
  // Add translations for each service...
}
```

Then reference the key in `services.json`:
```json
{
  "name": "Memos",
  "desc": "memos",  // Reference key in ui.ts
  // ...
}
```

**If you don't need this feature:**
- Delete `src/data/services.json`
- Remove related code in `src/pages/lab.astro`

### 5. Comment System Configuration (Optional)

#### `src/components/TwikooComments.astro`

The theme integrates the [Twikoo](https://twikoo.js.org/) comment system.

**Configuration steps:**

1. **Deploy Twikoo backend** (choose one):
   - Vercel deployment (recommended): [Official docs](https://twikoo.js.org/quick-start.html#vercel-deployment)
   - Railway deployment
   - Self-hosted server

2. **Get API address**:
   - Vercel: `https://your-twikoo-app.vercel.app`
   - Self-hosted: `https://your-domain.com/twikoo`

3. **Configure in component**:

Find this section and modify:
```javascript
window.twikoo.init({
  envId: 'https://your-twikoo-api.com',  // ⚠️ Replace with your Twikoo API URL
  el: '#tcomment',
  path: location.pathname,
  lang,  // Automatically follows site language
});
```

**If you don't need comments:**

Remove the comment component in blog post template:
- Edit `src/pages/blog/[...slug].astro`
- Delete or comment out `<TwikooComments />` component

### 6. Music Albums Configuration (Optional)

#### `src/data/favorites.ts`

Display your favorite music albums on the homepage.

**⚠️ Important: Must import images first!**

```typescript
// 1. Import album cover images at the top of the file
import AlbumCover1 from '@/assets/albums/album1.jpg';
import AlbumCover2 from '@/assets/albums/album2.jpg';
import AlbumCover3 from '@/assets/albums/album3.webp';

// 2. Use imported images in the array
export const favorites = [
  {
    name: 'Artist Name',           // Artist name
    subtitle: 'Album Title',       // Album title
    image: AlbumCover1,            // ⚠️ Use imported variable, not string!
    href: 'https://open.spotify.com/album/xxx',  // Spotify/Apple Music link
    alt: 'Artist - Album Title',   // Image description
  },
  {
    name: 'Another Artist',
    subtitle: 'Another Album',
    image: AlbumCover2,            // Each must be imported first
    href: 'https://music.apple.com/...',
    alt: 'Another Artist - Another Album',
  },
  // Add more albums...
];
```

**Prepare album cover images:**

1. Place images in `src/assets/albums/` directory
2. Recommended formats: `.jpg`, `.webp`, `.png`
3. Recommended size: 500x500 or 1000x1000 (square)
4. Use English filenames, e.g., `glass-animals.jpg`

**Why must import?**

Astro optimizes imported images (automatic compression, multiple sizes, lazy loading, etc.). Direct string paths can't benefit from these optimizations.

**Get album links:**
- Spotify: Open album page, click share → copy link
- Apple Music: Same process

**If you don't need this feature:**
- Remove music album display code in `src/pages/index.astro`
- Delete `src/data/favorites.ts`

## 📝 Creating Content

### Create Blog Posts

**1. Create Chinese post**

Create a `.md` file in `src/content/blog/`, e.g., `my-first-post.md`:

```markdown
---
title: My First Post
description: This is a test post
pubDate: 2025-01-15              # Publication date (required)
updatedDate: 2025-01-16          # Update date (optional)
heroImage: /images/hero.jpg      # Cover image (optional)
lang: zh                         # Language identifier (required)
translationKey: my-first-post    # Translation key (required, links different language versions)
category: Tech                   # Category (optional)
published: true                  # Whether published (optional, default true)
---

## Article Start

Article content goes here...

### Supported Markdown Features

- **Bold** and *italic*
- Code blocks
- Math formulas (KaTeX)
- Diagrams (Mermaid)
- And more...
```

**2. Add English translation (optional)**

Create the **same filename** in `src/content/blog/en/`, `my-first-post.md`:

```markdown
---
title: My First Post
description: This is a test post
pubDate: 2025-01-15
lang: en                         # ⚠️ Change to en
translationKey: my-first-post    # ⚠️ Must be same as Chinese version
category: Tech
---

## Article Start

Content in English...
```

**⚠️ Key points:**
- Both files use the **same `translationKey`** (so the theme can recognize them as the same article)
- `lang` must be set to the corresponding language (`zh` or `en`)
- Filenames can be the same or different, but keeping them consistent is recommended

**3. Frontmatter field explanation**

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `title` | ✅ | Article title | `"My Article"` |
| `description` | ✅ | Article description (for SEO) | `"An article about..."` |
| `pubDate` | ✅ | Publication date | `2025-01-15` |
| `lang` | ✅ | Language code | `zh` or `en` |
| `translationKey` | ✅ | Translation key | `unique-key` |
| `updatedDate` | ❌ | Last update date | `2025-01-16` |
| `heroImage` | ❌ | Cover image path | `/images/cover.jpg` |
| `category` | ❌ | Article category | `Tech`, `Life`, `Tutorial` |
| `published` | ❌ | Whether published | `true` or `false` |

### Adding Images

**Method 1: Use public directory (recommended for article images)**

1. Place images in `public/images/` directory, e.g.:
   ```
   public/images/
   ├── my-post/
   │   ├── image1.jpg
   │   └── image2.png
   ```

2. Reference in article (path from root):
   ```markdown
   ![Image description](/images/my-post/image1.jpg)
   ```

**Method 2: Use src/assets (for images needing optimization)**

1. Place in `src/assets/` directory
2. Import and use in article (needs to be in `.astro` file, `.md` files don't support this)

**Image optimization tips:**
- Use WebP format (smaller file size)
- Compress images (recommended tool: [TinyPNG](https://tinypng.com/))
- Use descriptive alt text (good for SEO and accessibility)

### Article Category Management

The theme automatically extracts the `category` field from all articles to generate category pages.

**Best practices:**
- Use English for category names (e.g., `Tech`, `Life`, `Tutorial`)
- Keep category count moderate (recommend 3-8)
- Add multi-language translations for categories in `src/utils/ui.ts`

## 🌍 Internationalization (i18n) Configuration

### UI Text Translation

All interface text is defined in `src/utils/ui.ts`.

**Structure:**

```typescript
export const translations = {
  zh: {
    // Chinese translations
    "home": "首页",
    "blog": "博客",
    "about": "关于",
    // ... more
  },
  en: {
    // English translations
    "home": "Home",
    "blog": "Blog",
    "about": "About",
    // ... more
  }
};
```

**Add new translation items:**

```typescript
// Must add to both language objects
zh: {
  // ... existing translations
  "new_text": "新文本",
},
en: {
  // ... existing translations
  "new_text": "New Text",
}
```

**Use in components:**

```astro
---
import { useTranslations } from '@utils/ui';
const t = useTranslations(Astro.currentLocale);
---

<h1>{t('new_text')}</h1>
```

**Modify existing text:**

1. Open `src/utils/ui.ts`
2. Find the corresponding key (e.g., `"Manifesto"`)
3. Modify Chinese and English values
4. Save and restart dev server

**Customize homepage manifesto:**

```typescript
zh: {
  "Manifesto": "Your new manifesto in Chinese",
  "introduction": "Your new introduction in Chinese...",
  // ...
},
en: {
  "Manifesto": "Your New Manifesto",
  "introduction": "Your new introduction...",
  // ...
}
```

### Adding New Languages

If you want to add Japanese, French, or other languages:

1. **Add language code in `astro.config.mjs`:**
   ```javascript
   i18n: { 
     locales: ['en', 'zh', 'ja'],  // Add 'ja'
     defaultLocale: 'zh',
   }
   ```

2. **Add translation object in `ui.ts`:**
   ```typescript
   export const translations = {
     zh: { /* ... */ },
     en: { /* ... */ },
     ja: {  // New
       "home": "ホーム",
       "blog": "ブログ",
       // ... translate all text
     }
   };
   ```

3. **Create corresponding content directory:**
   ```
   src/content/blog/ja/
   ```

4. **Create corresponding page directory:**
   ```
   src/pages/ja/
   ```

## 🎨 Custom Styles

### Theme Colors

Main color variables are defined in each component's `<style>` section.

**Core color variables:**

```css
/* Dark mode main colors */
--end-sky-deep: #2a0e3f;          /* Deep purple background */
--end-ambient-purple: #a259ec;    /* Purple accent */
--end-ambient-pale: #f2e7b9;      /* Light accent */
```

**Modify theme colors:**

1. Open `src/components/UserInfo.astro`
2. Find the `<style>` section
3. Modify color variables or add new global styles
4. Can also define global colors in `src/styles/GlobalStyles.astro`

**Example: Change to blue theme**

```css
:global(body)::before {
  background:
    radial-gradient(1200px 800px at 20% 10%, #0e1f3f 0%, ...),  /* Deep blue */
    radial-gradient(1000px 700px at 80% 30%, #4287f5 0%, ...),  /* Light blue */
    /* ... */
}
```

### Font Configuration

Configure fonts in `src/styles/fonts.css`.

**Default font stack:**

```css
/* Serif (for titles and manifesto) */
font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", 
             STSong, "LXGW WenKai", Garamond, "Times New Roman", 
             Georgia, serif;

/* Sans-serif (for body text) */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             "Noto Sans SC", sans-serif;
```

**Use custom fonts:**

1. **Using Google Fonts:**
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Your+Font&display=swap');
   
   body {
     font-family: 'Your Font', sans-serif;
   }
   ```

2. **Using self-hosted fonts:**
   - Place font files in `public/fonts/`
   - Add to `fonts.css`:
   ```css
   @font-face {
     font-family: 'Your Font';
     src: url('/fonts/your-font.woff2') format('woff2');
     font-weight: normal;
     font-display: swap;
   }
   ```

### Custom Component Styles

Each component has its own `<style>` section that can be modified directly.

**Common modification locations:**
- Homepage styles: `src/components/UserInfo.astro`
- Article styles: `src/styles/markdown.css`
- Global styles: `src/styles/GlobalStyles.astro`
- Header navigation: `src/components/Header.astro`

## 📡 RSS and Memos Configuration

### RSS Feed Configuration

RSS files are located at `src/pages/rss.xml.js` and `src/pages/en/rss.xml.js`.

**Places to modify:**

```javascript
return rss({
  title: 'Your Blog Name',           // ⚠️ Blog name
  description: 'Your blog description',  // ⚠️ Blog description
  site: context.site,
  // ...
  items: posts.map((post) => ({
    // ...
    author: 'Your Name',              // ⚠️ Author name
    customData: `<dc:creator>Your Name</dc:creator>`,  // ⚠️ Author name
  })),
  customData: `
    <copyright>© ${new Date().getFullYear()} Your Name</copyright>
    <webMaster>your@email.com</webMaster>  // ⚠️ Your email
    // ...
  `,
});
```

### Memos Configuration (Optional)

If using [Memos](https://github.com/usememos/memos) for micro-blogging:

**Configure API address:**

In `src/utils/memos-render.ts`:

```typescript
renderMemos(
  'memos-loading',
  'memos-content',
  'memos-error',
  'https://your-memos-api.com',  // ⚠️ Replace with your Memos API URL
  notFoundMsg,
  failedMsg
);
```

**Deploy Memos:**
- Docker deployment: [Official docs](https://github.com/usememos/memos#docker)
- Railway/Zeabur deployment
- Self-hosted server

**If you don't need Memos:**
- Delete `src/pages/memos.astro` and `src/pages/en/memos.astro`
- Remove Memos links from navigation

## 🚀 Deployment Configuration

### Vercel (Recommended)

The project is configured with Vercel adapter. Push to GitHub and import in Vercel.

**Steps:**
1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Vercel will auto-detect Astro and use correct config
4. Wait for deployment to complete

**Custom domain:**
- Add domain in Vercel project settings
- Add DNS records at your domain provider
- Update `site` field in `astro.config.mjs`

### Netlify

**Modify config:**

```javascript
// astro.config.mjs
import netlify from '@astrojs/netlify/static';

export default defineConfig({
  // ...
  adapter: netlify(),
});
```

**Deploy:**
1. Install adapter: `pnpm add @astrojs/netlify`
2. Push to GitHub
3. Import project in Netlify

### Cloudflare Pages

```javascript
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  // ...
  output: 'server',  // or 'hybrid'
  adapter: cloudflare(),
});
```

### GitHub Pages

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://username.github.io',
  base: '/repo-name',  // if deploying to subdirectory
  // remove adapter
});
```

**Auto-deploy with GitHub Actions:**

Create `.github/workflows/deploy.yml`:

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

### Static Hosting (Pure Static)

If you only need static files:

```javascript
// astro.config.mjs
export default defineConfig({
  // ...
  output: 'static',
  // remove adapter
});
```

After building, upload the contents of `dist/` directory to any static hosting:
- Nginx
- Apache
- AWS S3
- Alibaba Cloud OSS
- etc...

## ❓ FAQ

### How to disable particle background effects?

**Method 1: Completely disable**

In `src/components/UserInfo.astro`:
1. Find particle initialization script (bottom of file)
2. Comment or delete the entire `<script>` tag
3. Delete or comment `<div id="ender-particles">` element

**Method 2: Disable on mobile only**

Already heavily reduced particles on mobile by default. To completely disable:

```javascript
// Add to script at bottom of UserInfo.astro
if (window.matchMedia('(max-width: 768px)').matches) {
  // Don't load particles on mobile
  return;
}
```

### How to modify homepage manifesto text?

Modify in `src/utils/ui.ts`:

```typescript
zh: {
  "Manifesto": "Your new manifesto",
  "introduction": "Your new introduction...",
  // ...
},
en: {
  "Manifesto": "Your New Manifesto",
  "introduction": "Your new introduction...",
  // ...
}
```

### How to add new navigation pages?

**1. Create page file:**

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
    <!-- Page content -->
  </main>
</Layout>
```

**2. Add translation text:**

In `src/utils/ui.ts`:
```typescript
zh: {
  "my_page_title": "My Page · Your Blog Name",
  "my_page": "My Page",
  // ...
},
en: {
  "my_page_title": "My Page · Your Blog Name",
  "my_page": "My Page",
  // ...
}
```

**3. Add navigation link:**

Find navigation link section in `src/components/Header.astro` and add:
```astro
<a href={`/${currentLocale === 'zh' ? '' : 'en/'}my-page`}>
  {t('my_page')}
</a>
```

### How to modify article permalink format?

Default format is `/blog/slug/`. To modify:

See content collection config in `src/content/config.ts`. Routes are determined by file structure and `translationKey`.

For complete customization, modify routing logic in `src/pages/blog/[...slug].astro`.

### How to add Google Analytics / Umami analytics?

**Google Analytics:**

Add to `<head>` in `src/layouts/Layout.astro`:
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

**Umami:**

```astro
<script async defer data-website-id="your-website-id" 
        src="https://your-umami-instance.com/script.js"></script>
```

### How to optimize site loading speed?

**Already implemented optimizations:**
- ✅ Static generation (SSG)
- ✅ Automatic image optimization
- ✅ Code splitting
- ✅ Preload critical resources
- ✅ Reduced particles on mobile

**Additional optimizations:**

1. **Use WebP images:**
   - Conversion tool: [Squoosh](https://squoosh.app/)
   
2. **Compress images:**
   - [TinyPNG](https://tinypng.com/)
   - [ImageOptim](https://imageoptim.com/)

3. **Enable CDN:**
   - Vercel auto-provides CDN
   - Cloudflare Pages also includes CDN

4. **Remove unnecessary features:**
   - Don't need particles? Remove it
   - Don't need comments? Remove Twikoo
   - Don't need music albums? Remove related code

### Articles not displaying?

**Checklist:**

1. ✅ Frontmatter format correct? (YAML format, watch indentation)
2. ✅ `lang` field set? (`zh` or `en`)
3. ✅ `published` field is `true` or unset?
4. ✅ File extension is `.md`?
5. ✅ File in correct directory? (`src/content/blog/` or `src/content/blog/en/`)
6. ✅ Try restarting dev server?

### How to backup site content?

**Important files and directories:**

- ✅ `src/content/blog/` - All articles
- ✅ `public/images/` - Image resources
- ✅ `src/data/` - Configuration data
- ✅ `src/assets/` - Asset files
- ✅ Config files (`astro.config.mjs`, `package.json`, etc.)

**Recommended solutions:**
1. Use Git version control (recommended)
2. Regularly push to GitHub/GitLab
3. Keep local backups

## 💡 Best Practices

### Content Organization

- 📁 Create separate folders for each article's images
- 📝 Use meaningful filenames (e.g., `understanding-javascript.md`)
- 🏷️ Keep category count moderate (3-8)
- 📅 Update `updatedDate` field promptly

### Performance Optimization

- 🖼️ Use WebP format for images
- 📦 Regularly run `pnpm build` to check build size
- 🎯 Remove unnecessary features and dependencies
- ⚡ Use CDN to accelerate static resources

### SEO Optimization

- ✍️ Write good `description` for each article
- 🖼️ Add meaningful `alt` text to images
- 📑 Use proper heading hierarchy (H1, H2, H3)
- 🔗 Add internal links

### Security

- 🔒 Don't hardcode sensitive information
- 🔑 Use environment variables for API keys
- 📦 Regularly update dependencies (`pnpm update`)
- 🛡️ Review third-party scripts

### Maintainability

- 📝 Add code comments
- 🗂️ Keep project structure clear
- 🔄 Use Git commit message conventions
- 📚 Document important config changes

## 🆘 Getting Help

### Having issues?

1. **Check documentation:**
   - [Astro Official Docs](https://docs.astro.build/)
   - [Tyndall README](../README.md)

2. **Search existing Issues:**
   - Solutions may already exist in GitHub Issues

3. **Ask questions:**
   - Create new Issue on GitHub
   - Provide detailed error info and reproduction steps
   - Attach relevant config files

4. **Community resources:**
   - [Astro Discord](https://astro.build/chat)
   - [Astro Community](https://github.com/withastro/docs/discussions)

---

**After configuration, run `pnpm dev` to preview your blog and enjoy writing!** ✨

If you have other questions, feel free to open an Issue!
