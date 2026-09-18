import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { presenceSchema, publicPresence, PRESENCE_TTL_MS } from '../../utils/presence';

export const prerender = false;
const env = (key: string): string | undefined => process.env[key] ?? import.meta.env[key];
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
function client() {
  const url = env('PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}
function authorized(value: string | null) {
  const expected = env('NOW_PLAYING_SECRET');
  if (!expected || !value) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(value); const b = encoder.encode(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const GET: APIRoute = async () => {
  const db = client();
  if (!db) return respond(503, { error: 'Presence storage is not configured' });
  const { data, error } = await db.from('nowcast_presence')
    .select('payload,received_at').eq('id', 'me').maybeSingle();
  // Before the first Nowcast upload, the existing Shortcut card remains available.
  const storageMissing = error?.code === 'PGRST205' || error?.code === '42P01';
  if (error && !storageMissing) return respond(503, { error: 'Presence storage is unavailable' });
  if (!data) return respond(200, { version: 1, state: 'unconfigured', activity: null, music: null });
  return respond(200, publicPresence(data.payload, data.received_at));
};

export const POST: APIRoute = async ({ request }) => {
  if (!env('NOW_PLAYING_SECRET')) return respond(503, { error: 'Presence writing is not configured' });
  if (!authorized(request.headers.get('x-now-playing-secret'))) return respond(401, { error: 'Unauthorized' });
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return respond(415, { error: 'Use application/json' });
  }
  // Enforce the byte limit even for chunked requests without Content-Length.
  let raw = '';
  const reader = request.body?.getReader();
  if (!reader) return respond(400, { error: 'Missing body' });
  try {
    let size = 0;
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); return respond(413, { error: 'Payload too large' }); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch { return respond(400, { error: 'Could not read body' }); }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return respond(400, { error: 'Invalid JSON' }); }
  const parsed = presenceSchema.safeParse(body);
  if (!parsed.success) return respond(400, { error: 'Invalid presence payload' });
  const now = Date.now();
  const observed = Date.parse(parsed.data.observedAt);
  // A delayed offline queue must never turn an old activity into "live".
  if (now - observed > PRESENCE_TTL_MS || observed - now > 30_000) {
    return respond(400, { error: 'Observation is stale or device clock is ahead' });
  }
  const started = parsed.data.activity?.startedAt;
  if (started && Date.parse(started) > observed + 30_000) {
    return respond(400, { error: 'Activity starts after observation' });
  }
  const db = client();
  if (!db) return respond(503, { error: 'Presence storage is not configured' });
  // The SQL function serializes concurrent writes and rejects older observations.
  const { data, error } = await db.rpc('set_nowcast_presence', { incoming: parsed.data });
  if (error) return respond(503, { error: 'Presence write failed; check the database migration' });
  if (data === false) return respond(409, { error: 'A newer observation is already stored' });
  return respond(200, { ok: true });
};
