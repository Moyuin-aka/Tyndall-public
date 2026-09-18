---
title: Tyndall Configuration Guide
description: Configure Tyndall deployment, comment notifications, Memos, Nowcast and article features.
pubDate: 2025-01-15
updatedDate: 2026-09-18
translationKey: config
lang: en
---

# Tyndall Configuration Guide

> **Updated: September 2026**
>
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
  markdown: {
    // Disable smartypants to prevent straight quotes from being converted
    // to typographic quotes, which breaks mixed CJK/English content.
    smartypants: false,
    // ...
  },
});
```

> **About `smartypants: false`:** Astro converts straight quotes (`"`/`'`) to typographic quotes (`""`/`''`) by default, which can corrupt mixed Chinese/English content. This option is disabled in the theme by default — just leave it as-is.

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
COMMENT_NOTIFY_URL=https://your-notify-worker.workers.dev
COMMENT_NOTIFY_SECRET=your-secret
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

### 6. Set Up Comment Email Notifications (Optional)

After saving a comment to Supabase, the browser calls your blog's `/api/comment-notify`. That endpoint forwards the request to a separate Worker, which sends email through Resend. Your blog can stay on Vercel.

#### Prepare a sender address

Add and verify your sending domain in [Resend](https://resend.com/docs/dashboard/domains/introduction), then create an API key. Use an address on that domain for `FROM_EMAIL`; `ADMIN_EMAIL` is where you receive comment notifications.

#### Configure the Worker

Edit `workers/comment-notifier/wrangler.toml`:

```toml
name = "comment-notifier"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
ADMIN_EMAIL = "author@example.com"
FROM_EMAIL = "noreply@example.com"
SITE_NAME = "My Blog"
SITE_URL = "https://example.com"
```

Run these commands from the project root. The config path selects the notification Worker, not your site's Worker:

```bash
pnpm dlx wrangler@4 login
pnpm dlx wrangler@4 deploy --config workers/comment-notifier/wrangler.toml
pnpm dlx wrangler@4 secret put RESEND_API_KEY --config workers/comment-notifier/wrangler.toml
pnpm dlx wrangler@4 secret put NOTIFY_SECRET --config workers/comment-notifier/wrangler.toml
```

Enter the secrets when prompted. Generate your own random `NOTIFY_SECRET`, for example with `openssl rand -hex 32`. Keep actual values out of configuration files.

#### Connect your blog

Add these **server-side** variables on your blog's hosting platform, then redeploy:

```dotenv
COMMENT_NOTIFY_URL=https://comment-notifier.your-account.workers.dev
COMMENT_NOTIFY_SECRET=same-value-as-NOTIFY_SECRET
```

Use the deployed Worker's URL, not your blog's `/api/comment-notify`. For local development, put these values in `.env`.

Post a test comment with a valid email address, then reply to it. New comments notify the owner; replies notify the owner and original commenter where applicable, without sending duplicate self-reply notifications.

> **No email?** Check that the comment was saved, then inspect `/api/comment-notify` in the browser's network panel. `skipped: true` means the blog's notification variables are missing; `502` means the Worker request failed. Run `pnpm dlx wrangler@4 tail --config workers/comment-notifier/wrangler.toml` and check Resend's domain verification and delivery logs. HTTP 200 alone does not prove delivery.

The notification endpoint does not include complete abuse protection. Add rate limiting to `/api/comment-notify` and, as needed, CAPTCHA or authentication before public use. GitHub Pages cannot run this endpoint itself.

### Disable Comment System

Edit `src/pages/blog/[...slug].astro`, delete or comment out:

```astro
<SupabaseComments ... />
```

---

## 📝 Memos Configuration (Supabase)

Memos stores short posts in **Supabase**, without a separate usememos installation. To publish, send a message to your Telegram Bot; you do not need to insert database rows by hand.

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

-- Visitors read public posts; the server-side Bot handles writes.
revoke all on public.memos from anon, authenticated;
grant select on public.memos to anon, authenticated;
grant select, insert, update, delete on public.memos to service_role;
```

The blog shares `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` with comments. The Bot has its own configuration and does not inherit the blog's environment variables.

> **Existing databases:** The table creation above is for a fresh installation. Keep existing tables and check their fields, grants and RLS instead. Do not enable anonymous writes to fix publishing errors. A service-role key bypasses RLS and belongs only on a trusted backend. [Supabase permissions](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Publish Through Telegram

The flow is: **send a message → Worker verifies the sender → save to Supabase → blog reads the post**. Photos are uploaded to R2 first.

#### 1. Create a Bot

1. Send `/newbot` to `@BotFather` in Telegram. Follow the prompts and save the Bot token.
2. Send your Bot a message. Before configuring a webhook, call `getUpdates` and use `message.chat.id` as `TELEGRAM_CHAT_ID`.
3. Use your private chat ID, not a group ID. The current check authorizes the whole chat, so other group members could also publish.

This command uses a temporary local `TELEGRAM_BOT_TOKEN` environment variable. Its output contains chat details; do not share it publicly:

```bash
read -rs TELEGRAM_BOT_TOKEN  # Enter your Bot token, then press Return (input is hidden)
export TELEGRAM_BOT_TOKEN
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates"
```

#### 2. Set up photo storage

Create a Cloudflare R2 bucket for public Memo photos and connect an image domain, such as `https://images.example.com`. Use `r2.dev` for development; a custom domain is recommended for production. [R2 public access](https://developers.cloudflare.com/r2/buckets/public-buckets/)

Edit `workers/telegram-memos-bot/wrangler.toml`. Replace `bucket_name` with your bucket name and keep the bindings:

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

Keep `MEDIA_GROUPS`: it combines photos sent as an album into one Memo. The image domain must serve objects directly, not point to the R2 S3 API.

#### 3. Deploy and add variables

Run from the project root:

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

- `SUPABASE_URL`: the same Supabase project as your blog.
- `SUPABASE_SERVICE_ROLE_KEY`: a server-side `service_role` key, not the browser's anon key. This Bot sends the key in both `apikey` and Bearer headers; use the JWT-format legacy service-role key for this implementation.
- `R2_PUBLIC_URL`: your image domain, such as `https://images.example.com`, without a trailing `/` or `/memos`.
- `TELEGRAM_WEBHOOK_SECRET`: your own random secret, separate from the Bot token.

#### 4. Connect Telegram

Set temporary local environment variables for `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` and `MEMOS_WORKER_URL`. The last one is your Bot Worker's HTTPS URL. Register the webhook:

```bash
read -rs TELEGRAM_WEBHOOK_SECRET  # Enter the same secret saved to the Worker
export TELEGRAM_WEBHOOK_SECRET
export MEMOS_WORKER_URL=https://telegram-memos-bot.your-account.workers.dev
curl --request POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=${MEMOS_WORKER_URL}" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  --data-urlencode 'allowed_updates=["message"]'

curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

After `setWebhook` returns `ok: true`, send `/start` to your Bot. Telegram includes the secret token with each callback, and the Worker checks it before handling messages. Do not use `getUpdates` alongside an active webhook. [Telegram Bot API](https://core.telegram.org/bots/api#setwebhook)

#### 5. Publish a Memo

| Send to your Bot | Result |
| --- | --- |
| `Finished a good book today #reading` | Publish a public Memo and extract the tag |
| A photo with a caption | Upload and publish the photo |
| A photo album with a caption | Publish one Memo with multiple photos |
| `/private A personal note` | Save private text without displaying it publicly |
| `/list` | Show the latest 5 posts and their IDs |
| `/delete` or `/delete <id>` | Delete the latest post, or an ID prefix match among the latest 20 |
| `/stats` | Show statistics |

The Bot handles text and Telegram photo messages, not video, voice or images sent as files. `/private` is a text command; it does not make your next photo private. Deleting a Memo does not remove its R2 photos.

After the success reply, refresh `/memos` or `/en/memos` to see the post. No rebuild is needed. If publishing fails, check Worker logs and database permissions. If text appears but photos do not, check the R2 binding and public domain.

### Connect Feishu, Discord or Other Tools

The repository currently provides a **Telegram-specific receiver**, not a generic `/api/memos`. Internally it writes through Supabase's `/rest/v1/memos`; this does not mean handing database credentials to chat users or browsers.

Other platforms can use the same flow, but need their own receiver. Their callbacks cannot be pointed directly at the Telegram Worker:

- **Feishu:** enable an application's Bot capability and subscribe to `im.message.receive_v1`. Complete callback verification, check the sender and parse text or images. A group's custom-Bot webhook sends messages into the group; it does not receive user messages. See [message events](https://open.feishu.cn/document/server-docs/im-v1/message/events/receive) and [custom Bots](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot).
- **Discord:** start with an application command such as `/memo text`. Receive HTTP Interactions, verify signatures and user IDs, acknowledge promptly or defer, then save the Memo. Receiving ordinary chat messages needs a separate Gateway Bot implementation. A regular channel webhook only sends messages into a channel. See [Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding).

New receivers also need retry deduplication, attachment storage and failure replies. The existing Telegram implementation deduplicates within album aggregation only; it does not guarantee exactly-once publishing for all redelivered messages.

> **Availability:** Telegram code is included. Feishu and Discord are extension options, not bundled integrations. Every receiver must verify the platform signature or shared secret and authorize the publishing user; an obscure URL is not authentication.

### Disable Memos

- Delete `src/pages/memos.astro` and `src/pages/en/memos.astro`
- Remove Memos navigation link in `src/components/Header.astro`

---

## 🟢 Nowcast Live Status

Memos records what you want to say; Nowcast shows what you are doing now. They are separate: publishing a Memo does not update your status card, and Nowcast does not save activity as posts.

### 1. Prepare the database

Run all of `scripts/supabase-nowcast-schema.sql` in the Supabase SQL Editor to create the table and write function. To also use the older Shortcut endpoint, run `scripts/supabase-now-playing-schema.sql`.

### 2. Configure your blog

Add these variables on your blog's hosting platform, or in `.env` for local development:

```dotenv
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-key
NOW_PLAYING_SECRET=your-random-write-secret
```

Redeploy and visit `https://your-domain/api/presence`. Before the first upload, `state: "unconfigured"` is normal. A `503` means configuration or storage needs attention. This feature requires server endpoints, such as those on Vercel or Cloudflare Workers.

### 3. Connect Nowcast

In [Nowcast](https://github.com/Moyuin-aka/Nowcast), open “状态与设置…” (Status and Settings):

| Setting | Value |
| --- | --- |
| API endpoint | `https://your-domain/api/presence`, not the homepage |
| Write secret | The same value as the blog's `NOW_PLAYING_SECRET` |
| Browser detection | Enable if desired |
| Background Apple Music | Enable if desired |

Click “保存设置” (Save Settings), then “开始共享” (Start Sharing). Grant the macOS Automation permissions you need and review your rule descriptions before making them public. **Do not enter your Supabase service-role key into Nowcast.**

### 4. Check the card

Visit `/about` or `/en/about` to see the current-activity card. It refreshes every 20 seconds without rebuilding the blog:

- Activity shows its description and source; music can appear alongside it.
- With music alone, the song becomes the current status.
- An empty upload shows idle. After 3 minutes without a new upload, the old activity expires.
- Failed API requests show unavailable, rather than presenting old data as live.

Before the first Nowcast upload, the card can read the legacy `/api/now-playing` Shortcut state. After that first upload, pausing sharing will not resurrect the old status. The album wall uses `src/data/favorites.ts` and is not updated by Nowcast.

### Send status from a script (optional)

Scripts can use the same endpoint. Set `NOWCAST_ENDPOINT` and `NOWCAST_WRITE_SECRET` to your endpoint and write secret, then run this Node.js example:

```javascript
const response = await fetch(process.env.NOWCAST_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-now-playing-secret': process.env.NOWCAST_WRITE_SECRET,
  },
  body: JSON.stringify({
    version: 1,
    activity: { kind: 'writing', title: 'Writing a new article', source: 'Obsidian' },
    music: null,
    observedAt: new Date().toISOString(),
  }),
});
console.log(response.status, await response.json());
```

Save as an `.mjs` file and run with Node.js. HTTP `200` with `ok: true` means the upload succeeded. To clear the status, set both `activity` and `music` to `null`, still sending the current `observedAt`.

`401` means the secret does not match; for `400`, check fields and the device clock. `409` means a newer observation is already stored. For `503`, check environment variables and the SQL migration. One upload lasts about 3 minutes; continued display needs heartbeat updates. Do not send raw window titles, URLs or note contents. The field schema is in `src/utils/presence.ts`.

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

## 🗺️ Article Music and Travel Maps

See [Welcome to Tyndall](/en/blog/welcome) for copyable examples and live previews. These article directives do not need Supabase, Memos or Nowcast.

### Apple Music players

Place `::apple-music{url="share-link"}` on its own line, with blank lines around it. Songs, albums and public playlists are supported. Use `height` for the player height and `title` for an accessible label:

```markdown
::apple-music{url="https://music.apple.com/us/album/how-to-be-a-human-being/1440840097" height="450" title="Music for this article"}
```

No Apple API key is needed. For an unrecognized-link error, use the full `https://music.apple.com/...` address and keep a song's `?i=` selector. Regular Markdown links remain links; they are not automatically converted to players.

### Places and multi-day trips

In the article's `map.days` frontmatter, each day needs `day`, `color` and at least one stop. Each stop has `name`, `coords: [longitude, latitude]` and an optional `note`. Add `::travel-map{height="480"}` to the body.

Optional `map` settings are `center: [longitude, latitude]`, `zoom` and `basemap`. The last one is a MapLibre style JSON URL, not a link to a map webpage. The default uses OpenFreeMap, so the browser must be able to load its resources. Keep the defaults unless you need something different.

### Road routes (optional)

By default, stops are joined by straight lines. For a road route, add `road: true` to that day and provide at least two stops. Run from the project root:

```bash
pnpm routes:build --all
```

The script queries OSRM's driving service and generates `src/data/routes/<translationKey>.json`. Include the generated file in your own site's build environment; `pnpm build` does not fetch routes automatically. In development, article changes trigger an attempt to update routes.

Keep `translationKey` stable and free of path separators. Translations sharing a key should use the same day numbers and coordinates. Missing route files fall back to straight lines. Review generated files after changing or removing `road`; old files are not always cleaned up automatically.

> **Routes:** These are driving routes, not walking or transit directions. Generation sends coordinates to a third-party routing service, so only use locations you intend to share. The `/travel` photo gallery is separate; article maps do not read photo EXIF automatically.

---

## 🔧 Lab Configuration

Lab displays JSON snapshots generated before the site is built; it does not query your private services in each visitor's browser. The public theme includes sample data. It works without integrations, but will not automatically show your own activity.

| Section | Source | Local file |
| --- | --- | --- |
| Writing rhythm | Git history under `src/content` | `src/data/writing-heatmap.json` |
| Recent bookmarks | Karakeep API | `src/data/bookmarks.json` |
| Server metrics | Beszel API | `src/data/servers.json` |
| Self-hosted services and reachability | Manual URLs and Actions HTTP checks | `src/data/services.json` |

The flow is: **Actions runs scripts → commit JSON snapshots → rebuild the blog → show updated data**. A successful fetch without a deployment does not update the live page.

### 1. Writing rhythm

Run from the project root:

```bash
node .github/scripts/generate-heatmap.mjs
```

The script counts commit dates over the last 15 months, not words or writing hours. It does not need a GitHub API token. In a regular repository it counts changes under `src/content`; when that directory is a Git submodule, it uses the content repository's history. Uncommitted drafts do not count.

Use `fetch-depth: 0` in Actions checkout to avoid incomplete history. The public theme does not use a content submodule by default, so leave `ENABLE_CONTENT_SUBMODULE` disabled. Only use `.github/workflows/update-submodule.yml` after setting up that structure yourself. Its `SUBMODULE_TOKEN` needs both content-repository read access and permission to push commits to the parent blog repository. That workflow accepts manual runs or a `submodule-updated` dispatch, not a recurring schedule.

### 2. Recent bookmarks (Karakeep)

Create a key under Karakeep **Settings → API Keys**. Set `KARAKEEP_URL` to the instance root without a trailing `/`, and `KARAKEEP_API_KEY` to the key. The script makes a Bearer-authenticated request to `/api/v1/bookmarks?limit=12`. See the [Karakeep API](https://docs.karakeep.app/api/karakeep-api/).

```bash
node .github/scripts/fetch-bookmarks.mjs
```

Set the environment variables in your terminal first; these Node scripts do not automatically load Astro's `.env`. For Actions, use repository Secrets as described below.

**⚠️ Review what you publish:** The script takes the first 12 returned items, then keeps link bookmarks, so there may be fewer than 12. It does not filter by public list or starred status. It also exports tags, notes and original URLs. Notes may not appear on the page but will still be public in your repository. Use an account containing only shareable bookmarks, or add an explicit export filter first.

### 3. Server metrics (Beszel)

Set up your Beszel Hub and Agents and confirm that systems and history appear in the Hub. Then configure:

- `BESZEL_URL`: Hub root URL, without a trailing `/`.
- `BESZEL_EMAIL` and `BESZEL_PASSWORD`: credentials used by the current script's PocketBase `_superusers` login.

```bash
node .github/scripts/fetch-servers.mjs
```

The script reads up to 50 systems and up to 24 `10m` history points per system, exporting CPU, memory and disk metrics. It depends on specific Beszel/PocketBase fields; check after upgrades. Beszel notes that [API structures may change](https://beszel.dev/guide/rest-api).

> **Permissions and privacy:** This implementation uses a privileged superuser login, not a read-only token. Use only a trusted execution environment, or adapt it to least-privilege access for your instance. Exported names, IDs and metrics become public; do not export an entire sensitive infrastructure inventory.

### 4. Self-hosted service list

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

### 5. Update with GitHub Actions

The existing `.github/workflows/update-lab-status.yml` only updates `services.json`. Set the repository **Variable** `ENABLE_LAB_SYNC=true` to enable manual runs and its hourly schedule. It does not fetch bookmarks or server metrics.

For writing rhythm, bookmarks and metrics, review the data being exported, then copy the separate example in your own fork:

```bash
cp docs/examples/sync-lab-data.yml .github/workflows/sync-lab-data.yml
```

Under **Settings → Secrets and variables → Actions**, add:

| Variables | Purpose |
| --- | --- |
| `ENABLE_LAB_DATA_SYNC=true` | Enable the snapshot workflow |
| `ENABLE_WRITING_HEATMAP=true` | Update writing rhythm |
| `ENABLE_KARAKEEP_SYNC=true` | Update bookmarks |
| `ENABLE_BESZEL_SYNC=true` | Update server metrics |

Disabled sections retain their existing JSON; enable only what you need. Add the corresponding `KARAKEEP_*` and `BESZEL_*` credentials above as **Secrets**. Do not prefix them with `PUBLIC_` or put them in browser code.

This example targets a regular content directory, not a private submodule. Submodule users must add appropriate checkout credentials and complete history. Commit the workflow, allow Actions repository writes, then run **Actions → Sync Lab Data → Run workflow** and inspect the output. It subsequently runs every 6 hours. Branch protection may still block a bot push; adapt to a pull-request workflow if required.

GitHub-hosted runners cannot directly reach internal-only services. Use your own runner or a controlled network connection. The scripts optionally send `X-CI-Bypass` using `CI_BYPASS_SECRET`; the example maps separate `KARAKEEP_CI_BYPASS_SECRET` and `BESZEL_CI_BYPASS_SECRET` values. This only works with a gateway rule you configured yourself; it is **not a standard Cloudflare Access credential**. Leave it empty otherwise, and do not disable access protection for CI.

### 6. Update the live page

New JSON still needs a site rebuild. If your hosting platform does not deploy bot commits automatically, create a site Deploy Hook and store its URL in the `LAB_DEPLOY_HOOK_URL` Secret. The `sync-lab-data.yml` example calls it after a successful snapshot commit. The existing `update-lab-status.yml` does not include that step; add an equivalent deployment step there if service-status updates also need a hook.

For GitHub Pages, a commit made using `GITHUB_TOKEN` normally will not trigger another `push` workflow. Explicitly dispatch your deployment workflow or combine build/deploy with synchronization. A successful commit is not a successful deployment. [GitHub workflow triggering rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)

The reachability check treats 2xx, 3xx, 401, 403 and 405 as reachable. That means an HTTP endpoint responded, not that every application feature is healthy. Scheduled Actions are not real-time monitoring either. Failed syncs generally leave the old live snapshot; check both Actions and deployment logs.

Without integrations, keep the examples or edit JSON manually. To clear a section, set its `days`, `bookmarks` or `systems` array to `[]` and rebuild.

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

### Notes

Notes are a dedicated content section that shares the `blog` collection, distinguished by `category: 'notes'`. They have their own listing page (`/notes`), detail page (`/notes/[slug]`), pagination, and i18n support.

Create `.md` files in `src/content/blog/` with `category` set to `notes`:

```markdown
---
title: Note Title
description: Brief description (optional)
pubDate: 2025-06-01
lang: en
translationKey: my-note
category: notes          # ⚠️ Must be 'notes' to appear on the Notes page
published: true
---

Note content...
```

**Sub-directory grouping:** Place note files in subdirectories (e.g. `src/content/blog/reading/my-note.md`) and the notes listing page will automatically display the directory path as a topic badge (e.g. `reading`).

**English version:** Use `category: 'notes'` and the same `translationKey` in `src/content/blog/en/`.

### Supported Markdown Features

- **Math formulas** (KaTeX): `$E=mc^2$` or `$$...$$`
- **Code highlighting** (Shiki): Light/Dark dual theme support
- **Auto heading anchors**
- **Image lazy loading optimization**
- **Soft line break support** (remark-breaks)

---

## ⚡ Service Worker

The theme includes `public/sw.js`, which is automatically registered in production to cache static assets, fonts, and images:

| Strategy | Resources | TTL |
|----------|-----------|-----|
| Cache-First | Font files | 30 days |
| Cache-First | CDN scripts | 7 days |
| Cache-First | Images | 7 days |
| Network-First | Page HTML | 1 day |

**In development mode** the Service Worker is automatically unregistered to prevent Vite HMR cache conflicts.

### Disable Service Worker

If you don't need offline caching, delete `public/sw.js` and remove the following script block from `src/layouts/Layout.astro`:

```javascript
// Service Worker lifecycle
if (!isDev && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

---

## 🚀 Deployment

Vercel is the easiest way to get started: just import your repository. You can also use Cloudflare Workers or GitHub Pages by following the steps below.

### Vercel (recommended)

1. Fork the repository and push your changes to GitHub.
2. Import the repository into [Vercel](https://vercel.com). Select the **Astro** preset, the root directory containing `package.json`, and **Node.js 22.x**.
3. Set the install command to `pnpm install --frozen-lockfile` and the build command to `pnpm build`. Keep the default output settings.
4. Under **Environment Variables**, add `PUBLIC_SITE_URL` with your full site address, such as `https://your-blog.vercel.app`. Use `.env.example` to add any other settings you need.
5. Click **Deploy** and wait for the deployment to finish.

After connecting a custom domain, update `PUBLIC_SITE_URL` and redeploy. If you use Supabase login, update its Site URL and Redirect URLs too.

> **Environment variables:** Keep `.env` out of Git. Server secrets must not have a `PUBLIC_` prefix, and changing public variables requires a redeploy. The notification and Telegram Workers are deployed separately.

For more options, see the [Astro Vercel deployment guide](https://v5.docs.astro.build/en/guides/deploy/vercel/).

### Cloudflare Workers

If you already use Cloudflare, you can host your blog on Workers too.

#### 1. Install the adapter

This project uses Astro 5. Install a compatible adapter version:

```bash
pnpm add @astrojs/cloudflare@12.6.12
pnpm add -D wrangler@4
```

In `astro.config.mjs`, replace the Vercel import and adapter with the following. Leave the other settings unchanged:

```javascript
import cloudflare from '@astrojs/cloudflare';
// Inside defineConfig:
output: 'static',
adapter: cloudflare({ imageService: 'compile' }),
```

Keep `output: 'static'` so articles and OG images are generated at build time.

#### 2. Add the configuration files

Create `wrangler.jsonc` in the project root. Replace the name and Supabase URL with your own:

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

Add `public/.assetsignore` containing these two lines so the server bundle is not published as a static asset:

```text
_worker.js
_routes.json
```

#### 3. Build and deploy

Use `.env.example` to set `PUBLIC_SITE_URL` and any public Supabase settings in your local `.env`, then run:

```bash
pnpm build
pnpm exec wrangler dev
# Stop the preview after checking it, then log in and deploy:
pnpm exec wrangler login
pnpm exec wrangler deploy
```

For Nowcast or comment notifications, add the secrets you need. Each command will prompt for the value:

```bash
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put NOW_PLAYING_SECRET
pnpm exec wrangler secret put COMMENT_NOTIFY_URL
pnpm exec wrangler secret put COMMENT_NOTIFY_SECRET
```

> **Secrets:** Build variables and Worker runtime secrets are configured separately. For local previews, put secrets in `.dev.vars`. Do not commit that file or put secrets in `wrangler.jsonc`.

For automatic deployments, import the repository into Workers Builds. Use `pnpm install --frozen-lockfile` to install, `pnpm build` to build, and `pnpm exec wrangler deploy` to deploy. Add the same build variables there.

For more options, see the [Astro 5 Cloudflare deployment guide](https://v5.docs.astro.build/en/guides/deploy/cloudflare/). Workers does not use `vercel.json`; configure headers and caching separately.

### GitHub Pages (static deployment)

GitHub Pages works well for a static blog. Articles, maps and galleries remain available. Comments and Memos can connect to Supabase, but Nowcast and comment email notifications need a separate backend.

**⚠️ Site address:** Use a `username.github.io` repository or a custom domain. The theme uses root-relative paths; a subpath such as `username.github.io/repo-name/` needs additional changes, not just a `base` setting.

#### 1. Switch to a static build

In your deployment branch, move the API files out of the pages directory to keep their source without building runtime routes:

```bash
mkdir -p src/server
mv src/pages/api src/server/api
```

Remove the Vercel import and `adapter: vercel({})` from `astro.config.mjs`. Keep `output: 'static'`.

#### 2. Set up automatic deployment

Open **Settings → Pages** and set **Source** to **GitHub Actions**.

Create `.github/workflows/deploy-pages.yml` (change `main` if your default branch has another name):

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

#### 3. Set your site address

Under **Settings → Secrets and variables → Actions → Variables**, add `PUBLIC_SITE_URL` with `https://username.github.io` or your full custom domain. Add the public Supabase values if needed, but no server secrets.

For a custom domain, connect it in Pages settings and configure DNS. Create `public/CNAME` containing only your domain, without `https://`.

Push your changes and wait for Actions to finish. Your blog is ready to visit!

For more options, see the [Astro GitHub Pages deployment guide](https://v5.docs.astro.build/en/guides/deploy/github/).

---

## 🎨 Custom Styles

| File | Purpose |
|------|---------|
| `src/components/GlobalStyles.astro` | Global CSS variables, colors |
| `src/styles/markdown.css` | Article content styles |
| `src/styles/fonts.css` | Font configuration (font-family variables) |
| `public/fonts/google-fonts.css` | Local Google Fonts declarations |
| `public/fonts/google/` | Self-hosted woff2 font files |

### Local Font Hosting

The theme uses **locally mirrored Google Fonts** instead of external CDN requests. Font files live in `public/fonts/google/` and are declared in `public/fonts/google-fonts.css`. `Layout.astro` loads this stylesheet asynchronously to avoid render-blocking:

```html
<link rel="stylesheet" href="/fonts/google-fonts.css"
      media="print" onload="this.media='all'; this.onload=null;" />
<noscript><link rel="stylesheet" href="/fonts/google-fonts.css" /></noscript>
```

To swap fonts, replace the woff2 files and CSS declarations in `public/fonts/`, then update the `font-family` variables in `src/styles/fonts.css` to match.

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
