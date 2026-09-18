import { z } from 'zod';

export const PRESENCE_TTL_MS = 180_000;
const text = (max: number) => z.string().trim().min(1).max(max);
const timestamp = z.string().datetime({ offset: true });
export const presenceSchema = z.object({
  version: z.literal(1),
  activity: z.object({
    kind: z.enum(['coding', 'vibe', 'writing', 'ai', 'browsing', 'reading', 'video', 'game', 'other']),
    title: text(120),
    source: text(80),
    startedAt: timestamp.nullish(),
  }).strict().nullable(),
  music: z.object({
    state: z.literal('playing'),
    title: text(200),
    artist: z.string().trim().max(200),
    album: z.string().trim().max(200),
  }).strict().nullable(),
  observedAt: timestamp,
}).strict();

export type PresencePayload = z.infer<typeof presenceSchema>;
export interface PublicPresence {
  version: 1;
  state: 'live' | 'idle' | 'stale';
  activity: PresencePayload['activity'];
  music: PresencePayload['music'];
  receivedAt: string | null;
  expiresAt: string | null;
}

export function publicPresence(payload: unknown, receivedAt: string | null, now = Date.now()): PublicPresence {
  const parsed = presenceSchema.safeParse(payload);
  const received = Date.parse(receivedAt ?? '');
  const validTime = Number.isFinite(received) && received <= now + 30_000;
  const fresh = validTime && now - received < PRESENCE_TTL_MS;
  const activity = fresh && parsed.success ? parsed.data.activity : null;
  const music = fresh && parsed.success ? parsed.data.music : null;
  return {
    version: 1,
    state: !parsed.success || !fresh ? 'stale' : activity || music ? 'live' : 'idle',
    activity,
    music,
    receivedAt: validTime ? receivedAt : null,
    expiresAt: validTime ? new Date(received + PRESENCE_TTL_MS).toISOString() : null,
  };
}
