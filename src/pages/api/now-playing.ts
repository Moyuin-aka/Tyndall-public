import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// Read at runtime from process.env (Vercel injects env vars there) and fall
// back to import.meta.env (local `astro dev` loads .env there).
const env = (k: string) => process.env[k] ?? (import.meta.env as any)[k];
const SUPABASE_URL = env('PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
// Shared secret the iOS Shortcut sends in the `x-now-playing-secret` header.
const NOW_PLAYING_SECRET = env('NOW_PLAYING_SECRET');
// Optional: enables automatic game-poster lookup.
const STEAMGRIDDB_API_KEY = env('STEAMGRIDDB_API_KEY');

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

const str = (v: unknown, n = 120) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null;

/**
 * Resolve a vertical poster for a game name via SteamGridDB. Returns null on
 * any miss/error so the card can fall back gracefully.
 */
async function resolvePoster(name: string): Promise<string | null> {
  if (!STEAMGRIDDB_API_KEY || !name) return null;
  // For "中文 / English" names, search the English part — SteamGridDB matches
  // English titles far better.
  const term = (name.includes('/') ? name.split('/').pop()! : name).trim();
  const headers = { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` };
  try {
    const sr = await fetch(
      `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(term)}`,
      { headers }
    );
    const sj = await sr.json();
    const id = sj?.data?.[0]?.id;
    if (!id) return null;
    const gr = await fetch(
      `https://www.steamgriddb.com/api/v2/grids/game/${id}?dimensions=600x900&types=static&nsfw=false`,
      { headers }
    );
    const gj = await gr.json();
    return gj?.data?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve an app icon via the iTunes Search API (App Store) for the
 * "browsing" kind. `country=cn` matters here — most of the apps this is used
 * for (小红书/B站/微博/...) only show up under the CN storefront. Returns null
 * on any miss/error so the card falls back to the emoji in `appIcons`.
 */
async function resolveAppIcon(name: string): Promise<string | null> {
  if (!name) return null;
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=software&limit=1&country=cn`
    );
    const j = await r.json();
    const url = j?.results?.[0]?.artworkUrl100 as string | undefined;
    if (!url) return null;
    // The CDN path encodes the requested size; swap it for a sharper render
    // instead of relying on the (not always present) artworkUrl512 field.
    return url.replace('100x100', '512x512');
  } catch {
    return null;
  }
}

/**
 * GET — current activity (public). With `?poster=<name>` it instead resolves
 * an image on demand (used for local styling / as a fallback); pass
 * `&kind=browsing` to resolve an app icon instead of a game poster.
 */
export const GET: APIRoute = async ({ url }) => {
  const poster = url.searchParams.get('poster');
  if (poster !== null) {
    const image =
      url.searchParams.get('kind') === 'browsing'
        ? await resolveAppIcon(poster)
        : await resolvePoster(poster);
    return json(200, { image });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { error: 'Supabase not configured' });
  }
  const { data, error } = await admin()
    .from('switch_now_playing')
    .select('*')
    .eq('id', 'me')
    .maybeSingle();

  if (error) return json(500, { error: 'Query failed' });
  return json(200, {
    kind: data?.kind ?? (data?.game ? 'game' : null),
    title: data?.title ?? data?.game ?? null,
    source: data?.source ?? null,
    image: data?.image ?? null,
    updatedAt: data?.updated_at ?? null,
  });
};

/**
 * POST — set the current activity (or clear it). Guarded by a shared secret.
 *   Switch:   { "game": "Hollow Knight" }                  (legacy → kind=game)
 *   Browsing: { "kind": "browsing", "title": "小红书" }
 *   Clear:    { "game": "" } / { "title": "" }
 * For game kind, the poster is auto-resolved from SteamGridDB unless provided.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !NOW_PLAYING_SECRET) {
    return json(500, { error: 'Not configured' });
  }
  if (request.headers.get('x-now-playing-secret') !== NOW_PLAYING_SECRET) {
    return json(401, { error: 'Unauthorized' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const b = (body || {}) as Record<string, unknown>;

  const legacyGame = str(b.game);
  let kind = str(b.kind, 20);
  let title = str(b.title) ?? legacyGame;
  let source = str(b.source, 40);
  let image = str(b.image, 500);

  // Empty → clear to idle.
  if (!title) {
    const { error } = await admin().from('switch_now_playing').upsert(
      { id: 'me', kind: null, title: null, source: null, image: null, game: null, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    if (error) return json(500, { error: 'Update failed' });
    return json(200, { ok: true, cleared: true });
  }

  if (!kind) kind = legacyGame ? 'game' : 'other';
  if (!source && kind === 'game') source = 'Switch';
  if (kind === 'game' && !image) image = await resolvePoster(title);
  if (kind === 'browsing' && !image) image = await resolveAppIcon(title);

  const { error } = await admin().from('switch_now_playing').upsert(
    {
      id: 'me',
      kind,
      title,
      source,
      image,
      game: kind === 'game' ? title : null, // legacy column, kept in sync
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) return json(500, { error: 'Update failed' });
  return json(200, { ok: true, kind, title, source, image });
};
