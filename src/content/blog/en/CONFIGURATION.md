---
title: Tyndall Configuration Guide
description: Tyndall v1.1.0 configuration guide to help you build your own blog
pubDate: 2025-01-15
updatedDate: 2026-02-06
translationKey: config
lang: en
---

# Tyndall Configuration Guide

> **Version: v1.1.0**  
> This guide will help you configure the Tyndall theme from scratch and build your own blog.

---

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| [Astro](https://astro.build/) | Static site generator |
| [Supabase](https://supabase.com/) | Comments & Memos data storage |
| [tsParticles](https://particles.js.org/) | Homepage particle effects |
| [KaTeX](https://katex.org/) | Math formula rendering |
| [Shiki](https://shiki.matsu.io/) | Code syntax highlighting |

---

## 🚀 Quick Start

```bash
# 1. Clone the project
git clone https://github.com/Moyuin-aka/tyndall-public.git
cd tyndall-public

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev

# 4. Build for production
pnpm build
```

---

## 📋 Required Configuration

### 1. Basic Site Information

#### `astro.config.mjs`

```javascript
export default defineConfig({
  site: 'https://yourdomain.com',  // ⚠️ Replace with your domain
  // ...
});
```

### 2. Personal Information

#### `src/components/UserInfo.astro`

Update social links and display name:

```javascript
// Social links configuration
const socialLinks = [
  { name: "GitHub", icon: ICONS.github, url: "https://github.com/yourusername" },
  { name: "Twitter", icon: ICONS.twitter, url: "https://twitter.com/yourusername" },
  { name: "Telegram", icon: ICONS.telegram, url: "https://t.me/yourusername" },
  { name: "Email", icon: ICONS.mail, url: "mailto:your@email.com" },
];
```

Search for `author-name` in the same file and modify:

```astro
<span class="author-name">Your Name</span>
```

**Available icons:** Check `src/utils/icons.ts` for the full list.

### 3. Brand Name

#### `src/components/Header.astro`

```astro
<a class="brand" href={t("nav_home_url")}>Your Brand</a>
```

### 4. Multilingual Text Configuration

#### `src/utils/ui.ts`

This is the centralized configuration for all UI text, supporting both Chinese and English:

```typescript
const translations = {
  zh: {
    "Manifesto": "你的宣言",
    "introduction": "你的自我介绍...",
    "home_title": "站点标题",
    // ... more text
  },
  en: {
    "Manifesto": "Your Manifesto",      // Homepage headline
    "introduction": "Your introduction...", // Homepage intro
    "home_title": "Site Title",
    // ... more text
  }
};
```

### 5. Friends Links Configuration

#### `src/data/friends.ts`

```typescript
export const friends: Friend[] = [
  {
    name: "Friend Name",
    url: "https://example.com",
    avatar: "https://example.com/avatar.png",
    description: "Short description",
    tags: ["Friends"]
  },
  // Add more friends...
];

// Friend link application guidelines (bilingual)
export const friendshipGuidelines = {
  zh: {
    // Chinese version...
  },
  en: {
    myInfo: {
      name: 'Your Name',
      avatar: 'https://yourdomain.com/avatar.webp',
      url: 'https://yourdomain.com',
      description: 'Your description'
    },
    howToApply: 'Want to exchange links? Contact me via <a href="mailto:your@email.com">email</a>!'
  }
};
```

---

## 💬 Comment System Configuration (Supabase)

v1.1.0 uses **Supabase** as the comment system backend.

### 1. Create Supabase Project

Go to [Supabase](https://supabase.com/) and create a project.

### 2. Create `comments` Table

Execute in SQL Editor:

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

-- Indexes
create index idx_comments_translation_key on comments(translation_key);
create index idx_comments_status on comments(status);

-- RLS policies (optional)
alter table comments enable row level security;

create policy "Public read approved comments" on comments
  for select using (status = 'approved');

create policy "Anyone can insert comments" on comments
  for insert with check (true);
```

### 3. Configure Environment Variables

Create `.env` file:

```bash
# Supabase configuration
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Admin emails (can delete any comment)
PUBLIC_ADMIN_EMAILS=admin@example.com,another@example.com

# Comment notifications (optional, requires deploying a Worker)
PUBLIC_COMMENT_NOTIFY_URL=https://your-notify-worker.workers.dev
PUBLIC_COMMENT_NOTIFY_SECRET=your-secret
```

### 4. Enable OAuth Login (Optional)

In Supabase Dashboard → Authentication → Providers, enable GitHub/Google and add redirect URLs:
- `https://yourdomain.com`
- `http://localhost:4321` (development)

### 5. Anonymous Comment 5-Minute Delete Window (Optional)

Create RPC in SQL Editor:

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

### Disable Comment System

Edit `src/pages/blog/[...slug].astro`, delete or comment out:

```astro
<SupabaseComments ... />
```

---

## 📝 Memos Configuration (Supabase)

v1.1.0 Memos also uses **Supabase** for storage, no longer depending on a standalone Memos service.

### Create `memos` Table

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

**Environment variables:** Shared with comment system, no additional configuration needed.

### Disable Memos

- Delete `src/pages/memos.astro` and `src/pages/en/memos.astro`
- Remove Memos navigation link in `src/components/Header.astro`

---

## 🎵 Music Albums Configuration

#### `src/data/favorites.ts`

**⚠️ Must import images first:**

```typescript
// 1. Import album covers
import AlbumCover1 from '@/assets/albums/album1.jpg';
import AlbumCover2 from '@/assets/albums/album2.webp';

// 2. Use imported variables
export const favorites = [
  {
    name: 'Artist Name',
    subtitle: 'Album Title',
    image: AlbumCover1,  // ⚠️ Use variable, not string path
    href: 'https://open.spotify.com/album/xxx',
    alt: 'Artist - Album Title',
  },
  // More albums...
];
```

**Prepare images:**
1. Place in `src/assets/albums/` directory
2. Recommended formats: `.webp` / `.jpg`
3. Recommended size: 500×500 or 1000×1000

### Disable Music Albums

Remove related code in `src/pages/index.astro`.

---

## 🔧 Service Status Configuration (Lab Page)

#### `src/data/services.json`

```json
{
  "services": [
    {
      "name": "Service Name",
      "url": "https://service.yourdomain.com",
      "icon_svg": "<svg>...</svg>",
      "desc": "Service description",
      "category": "Tools",
      "status": { "state": "up", "http": 200 }
    }
  ]
}
```

**Available categories:** `Tools` / `Storage` / `DevOps` / `Admin`

Add service description translations in `src/utils/ui.ts`:

```typescript
"services": {
  "your_service": { "desc": "Service description" }
}
```

---

## 📡 RSS Configuration

#### `src/pages/rss.xml.js` & `src/pages/en/rss.xml.js`

```javascript
return rss({
  title: 'Your Blog Name',
  description: 'Blog description',
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

## ✍️ Creating Content

### Blog Posts

Create `.md` files in `src/content/blog/`:

```markdown
---
title: Post Title
description: Post description (SEO)
pubDate: 2025-01-15
updatedDate: 2025-01-16        # Optional
lang: zh                        # zh or en
translationKey: my-post         # For multilingual pairing & URL slug
category: Tech                  # Optional
published: true                 # Optional, default true
---

Post content...
```

**English version:** Create in `src/content/blog/en/` with the same `translationKey`.

### Supported Markdown Features

- **Math formulas** (KaTeX): `$E=mc^2$` or `$$...$$`
- **Code highlighting** (Shiki): Light/Dark dual theme support
- **Auto heading anchors**
- **Image lazy loading optimization**
- **Soft line break support** (remark-breaks)

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables (Supabase configuration)
4. Deployment complete

### Other Platforms

**Netlify / Cloudflare Pages:**

```javascript
// astro.config.mjs
import netlify from '@astrojs/netlify/static';
// or
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: netlify(), // or cloudflare()
});
```

**GitHub Pages:**

```javascript
export default defineConfig({
  site: 'https://username.github.io',
  base: '/repo-name',
});
```

---

## 🎨 Custom Styles

| File | Purpose |
|------|---------|
| `src/components/GlobalStyles.astro` | Global CSS variables, colors |
| `src/styles/markdown.css` | Article content styles |
| `src/styles/fonts.css` | Font configuration |

### Modify Colors

Modify CSS variables in `GlobalStyles.astro`:

```css
:root {
  --primary: #a259ec;
  --text: #1a1a1a;
  --bg: #faf8f6;
  /* ... */
}
```

---

## ❓ FAQ

### Posts not showing?

✅ Frontmatter YAML format correct?  
✅ `lang` field set? (`zh` or `en`)  
✅ `published` is not `false`?  
✅ Restart dev server?

### Disable particle effects?

Delete the `<script>` tags and `#ender-particles` element at the bottom of `src/components/UserInfo.astro`.

### Add new navigation page?

1. Create page: `src/pages/my-page.astro`
2. Add translation: add `nav_mypage` in `ui.ts`
3. Modify navigation: add link in `Header.astro`

### Optimize loading speed?

- Use WebP image format
- Remove unnecessary features (particles, comments, music, etc.)
- Deploy to Vercel/Cloudflare for CDN

---

## 🆘 Get Help

1. [Astro Official Docs](https://docs.astro.build/)
2. [Supabase Official Docs](https://supabase.com/docs)
3. [GitHub Issues](https://github.com/Moyuin-aka/tyndall-public/issues)

---

**After configuration, run `pnpm dev` to preview your blog and enjoy writing!** ✨
