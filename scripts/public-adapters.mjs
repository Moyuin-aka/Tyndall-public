// Reviewed public-only adaptations. No layout/CSS redesign and no removed feature.
// Keep attribution URLs intact; replace personal identity/service destinations.

function replaceRequired(text, from, to, file) {
  if (!text.includes(from)) throw new Error(`Upstream adaptation changed; review ${file}`);
  return text.replaceAll(from, to);
}

export function adaptPublic(file, input) {
  let text = input;
  const replace = (a, b) => { text = replaceRequired(text, a, b, file); };
  // Small upstream compatibility fixes, kept explicit rather than silently
  // altering the page design. These should be upstreamed independently later.
  if (file === 'src/components/ArchiveList.astro') text = text.replaceAll('searchCount.textContent =', 'searchCount!.textContent =');
  if (file === 'src/components/TravelCarousel.astro' || file === 'src/components/TravelCarouselR2.astro') {
    replace('document.querySelectorAll("[data-carousel]")', 'document.querySelectorAll<HTMLElement>("[data-carousel]")');
    replace('let scrollTimer;', 'let scrollTimer: ReturnType<typeof setTimeout>;');
    text = text.replace('const step = (dir) =>', 'const step = (dir: number) =>');
  }
  if (file === 'src/components/TravelRollR2.astro') replace('(target: Element)', '(target)');
  if (file === 'src/components/TravelRollR2.astro' || file === 'src/components/TravelRoll.astro') {
    replace('<script is:inline>\n  const roll = document.currentScript?.closest("[data-roll]");', '<script is:inline>\n(() => {\n  const roll = document.currentScript?.previousElementSibling;');
    replace('\n</script>', '\n})();\n</script>');
  }
  if (file === 'src/styles/personality-tags-flow.css') replace('transition: opacity 0.25s ease;\n  }\n  }', 'transition: opacity 0.25s ease;\n  }');
  if (/^src\/pages\/(en\/)?og\//.test(file)) replace('new Response(png,', 'new Response(new Uint8Array(png),');
  if (file === 'src/components/PersonalityTagsFlow.astro') {
    const start = text.indexOf('const labels = {');
    const end = text.indexOf('const t = labels[');
    if (start < 0 || end < start) throw new Error('Review personality data boundary');
    text = text.slice(0, start) + 'const labels = profileLabels;\n\n' + text.slice(end);
    text = text.replace('const locale =', 'import { profileLabels, hobbyContent } from "@data/profile";\n\nconst locale =');
    const hs = text.indexOf('const hobbyContent = {'), he = text.indexOf('const hobby = hobbyContent[');
    if (hs < 0 || he < hs) throw new Error('Review hobby data boundary');
    text = text.slice(0, hs) + text.slice(he);
    replace('https://ghchart.rshah.org/moyuin-aka', '/examples/activity.svg');
    text = text.replaceAll('https://zh.wikipedia.org/wiki/高功能自閉症', 'https://zh.wikipedia.org/wiki/人际关系')
      .replaceAll('https://en.wikipedia.org/wiki/High-functioning_autism', 'https://en.wikipedia.org/wiki/Interpersonal_relationship');
    text = text.replaceAll('高功能自閉症 -', '人际关系 -').replaceAll('High-functioning autism -', 'Interpersonal relationship -');
  }
  if (file === 'astro.config.mjs') {
    replace("site: 'https://moyuin.top'", "site: process.env.PUBLIC_SITE_URL || 'https://example.com'");
    // Preserve the preprocessing feature, but never silently delete user originals.
  }
  if (file === 'src/layouts/Layout.astro') {
    text = text.replaceAll('/favicon_io/favicon.ico', '/examples/avatar.svg')
      .replaceAll('/favicon_io/favicon-32x32.png', '/examples/avatar.svg')
      .replaceAll('/favicon_io/apple-touch-icon.png', '/examples/avatar.svg')
      .replace('type="image/png"', 'type="image/svg+xml"');
  }
  if (file === 'src/integrations/travel-preprocess.mjs' || file === 'scripts/travel-process.sh') {
    text = text.replace('"--in-place", "--cleanup", "-q"', '"--in-place", "-q"').replace('--in-place --cleanup -q', '--in-place -q');
  }
  if (file === 'src/pages/travel.astro' || file === 'src/pages/en/travel.astro') {
    replace('"https://pic.moyuin.top"', '(import.meta.env.PUBLIC_TRAVEL_IMAGE_BASE || "/examples")');
  }
  if (file === 'src/utils/travel-gallery.ts') replace('"https://pic.moyuin.top"', '"/examples"');
  if (file === 'src/pages/api/comment-notify.ts') {
    replace('import.meta.env.COMMENT_NOTIFY_URL || ""', 'process.env.COMMENT_NOTIFY_URL || import.meta.env.COMMENT_NOTIFY_URL || ""');
    replace('import.meta.env.COMMENT_NOTIFY_SECRET || ""', 'process.env.COMMENT_NOTIFY_SECRET || import.meta.env.COMMENT_NOTIFY_SECRET || ""');
  }
  if (file === 'src/components/RecentlyRead.astro') {
    replace("const { limit = null, compact = false } = Astro.props;", "const { limit = null, compact = false } = Astro.props;\nconst opdsUrl = import.meta.env.PUBLIC_OPDS_URL || '/examples/books.xml';\nconst booksBase = import.meta.env.PUBLIC_BOOKS_BASE || '/examples';");
    replace('define:vars={{ limit, compact, recentlyReadingLabel }}', 'define:vars={{ limit, compact, recentlyReadingLabel, opdsUrl, booksBase }}');
    replace("fetch('https://api.moyuin.top/books/opds/shelf/1')", 'fetch(opdsUrl)');
    replace('https://api.moyuin.top/books${coverImageUrl}', '${booksBase}${coverImageUrl}');
  }
  if (file === '.github/workflows/update-lab-status.yml') replace('    runs-on: ubuntu-latest', "    if: ${{ vars.ENABLE_LAB_SYNC == 'true' }}\n    runs-on: ubuntu-latest");
  if (file === '.github/scripts/generate-heatmap.mjs') {
    replace('git log --since="15 months ago" --date=short --format="%ad"', 'git log --since="15 months ago" --date=short --format="%ad" -- .');
  }
  if (file === '.github/workflows/update-submodule.yml') replace('    runs-on: ubuntu-latest', "    if: ${{ vars.ENABLE_CONTENT_SUBMODULE == 'true' }}\n    runs-on: ubuntu-latest");
  if (file === '.github/scripts/fetch-servers.mjs') replace('process.env.BESZEL_URL || "https://servers.moyuin.top"', 'process.env.BESZEL_URL || "https://example.invalid"');
  if (file === '.github/scripts/fetch-bookmarks.mjs') replace('process.env.KARAKEEP_URL || "https://marks.moyuin.top"', 'process.env.KARAKEEP_URL || "https://example.invalid"');
  if (file === 'scripts/supabase-now-playing-schema.sql') {
    text = `-- Fresh installation bootstrap; then apply the upstream additive migration below.
create table if not exists public.switch_now_playing (
  id text primary key check (id = 'me'), game text, image text,
  updated_at timestamptz not null default now()
);
alter table public.switch_now_playing enable row level security;
revoke all on public.switch_now_playing from anon, authenticated;
grant select, insert, update on public.switch_now_playing to service_role;
\n` + text;
  }
  if (file === 'workers/telegram-memos-bot/wrangler.toml') {
    text = text.replaceAll('SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
    replace('bucket_name = "memos"', 'bucket_name = "your-memos-bucket"');
    replace('# 以下 secret 已存在于线上 Worker，部署时会保留：', '# 首次部署前使用 wrangler secret put 配置以下变量（不要提交实际值）：\n# TELEGRAM_WEBHOOK_SECRET（同时传给 Telegram setWebhook 的 secret_token）');
  }
  if (file === 'workers/telegram-memos-bot/worker.js') {
    text = text.replaceAll('SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
    replace("    try {\n      const update = await request.json();", `    if (!env.TELEGRAM_WEBHOOK_SECRET || request.headers.get('x-telegram-bot-api-secret-token') !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      const update = await request.json();`);
  }
  if (file === 'workers/telegram-memos-bot/worker.test.mjs') {
    text = text.replaceAll('SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
    replace("SUPABASE_SERVICE_ROLE_KEY: 'test-key'", "SUPABASE_SERVICE_ROLE_KEY: 'fake'");
    replace("    TELEGRAM_BOT_TOKEN: 'test-token',", "    TELEGRAM_BOT_TOKEN: 'test-token',\n    TELEGRAM_WEBHOOK_SECRET: 'test-webhook',");
    replace("new Request('https://worker.example', {", "new Request('https://worker.example', {\n          headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' },");
  }
  if (file === 'src/utils/ui.ts') {
    text = text.replace(/"introduction": "[^\n]*",/g, (line) => line.includes('Hello') ? '"introduction": "Hello 👋, welcome to this example Tyndall site. Replace this introduction with your own story.",' : '"introduction": "你好👋，欢迎来到 Tyndall 示例站点。在这里换上你自己的介绍与故事。",');
  }
  if (file === 'src/utils/supabase.ts') {
    replace("import { createClient }", "import { createClient, type SupabaseClient }");
    const start = text.indexOf('if (!supabaseUrl || !supabaseAnonKey) {');
    const end = text.indexOf('// Memos 数据类型定义');
    if (start < 0 || end < start) throw new Error('Review Supabase configuration block');
    text = text.slice(0, start) + `// No network/client initialization with missing credentials. Features remain available once configured.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const client = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (!client) throw new Error('Configure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to enable this feature');
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

` + text.slice(end);
    replace("  const { data, error } = await supabase\n    .from('memos')\n    .select('*')", "  if (!supabaseConfigured) return [];\n  const { data, error } = await supabase\n    .from('memos')\n    .select('*')");
  }
  if (file === 'src/components/SupabaseComments.astro') {
    replace('    if (!container) return;', `    if (!container) return;
    if (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
      container.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>('input, button, textarea').forEach(el => { el.disabled = true; });
      const list = container.querySelector('#comments-list');
      if (list) list.textContent = container.getAttribute('data-locale') === 'en' ? 'Configure Supabase to enable comments.' : '配置 Supabase 后即可启用评论。';
      return;
    }`);
  }
  // Profile destinations are data, not theme attribution.
  text = text.replace(/https:\/\/github\.com\/Moyuin-aka(?!\/tyndall-public|\/EXIF-Catcher)[^\s"'<>)]*/gi, 'https://github.com/example')
    .replace(/https:\/\/twitter\.com\/moyuin1/g, 'https://example.com/social')
    .replace(/https:\/\/t\.me\/moyuin\b/g, 'https://example.com/contact')
    .replace(/https:\/\/music\.apple\.com\/cn\/playlist\/favorite-songs\/pl\.u-keU494No3b/g, 'https://music.apple.com/')
    .replace(/ytmfsssu@gmail\.com/g, 'author@example.com')
    .replace(/(?:[a-z0-9-]+\.)*moyuin\.top/gi, 'example.com');
  if (!file.startsWith('scripts/')) text = text.replace(/\bMoyuin\b(?!-aka)/g, 'Your Name');
  text = text.replaceAll('/userAvatar.webp', '/examples/avatar.svg');
  if (['.github/workflows/update-submodule.yml', 'scripts/supabase-comments-schema.sql', 'scripts/update-comments-table.sql', 'src/utils/comments.ts', 'workers/comment-notifier/worker.js', 'workers/telegram-memos-bot/worker.js'].includes(file)) {
    text = text.replace(/[\t ]+$/gm, '');
  }
  return text;
}
