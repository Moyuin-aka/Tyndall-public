import { kindMeta, type NowItem, type NowKind } from '@data/now';
import type { PublicPresence } from './presence';

export interface NowSnapshot {
  state: 'live' | 'idle' | 'stale' | 'unavailable';
  item: NowItem | null;
  music: PublicPresence['music'];
  expiresAt?: string | null;
}

/** Runtime API reads: changing Mac activity never rebuilds the static homepage. */
export async function getNowSnapshot(signal?: AbortSignal): Promise<NowSnapshot> {
  try {
    const response = await fetch('/api/presence', { cache: 'no-store', signal });
    if (!response.ok) throw new Error('Presence unavailable');
    const data = await response.json();
    if (data.state === 'unconfigured') return await legacySnapshot(signal);
    const activity = data.activity;
    const music = data.music?.state === 'playing' ? data.music : null;
    const expired = !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now();
    if (expired || data.state !== 'live') {
      return { state: data.state === 'idle' ? 'idle' : 'stale', item: null, music: null };
    }
    const item: NowItem | null = activity && Object.hasOwn(kindMeta, activity.kind) ? {
      kind: activity.kind, title: activity.title, source: activity.source,
      startedAt: activity.startedAt, updated_at: data.receivedAt,
    } : music ? {
      kind: 'music', title: music.title, source: music.artist || 'Apple Music', updated_at: data.receivedAt,
    } : null;
    return { state: item ? 'live' : 'idle', item, music, expiresAt: data.expiresAt };
  } catch {
    return { state: 'unavailable', item: null, music: null };
  }
}

/** Compatibility until the first Nowcast upload; never resurrect legacy data after pause. */
async function legacySnapshot(signal?: AbortSignal): Promise<NowSnapshot> {
  const response = await fetch('/api/now-playing', { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Legacy presence unavailable');
  const data = await response.json();
  const expires = Date.parse(data.updatedAt) + 6 * 60 * 60 * 1000;
  if (!data.title || !Number.isFinite(expires) || Date.now() >= expires) {
    return { state: 'idle', item: null, music: null };
  }
  const kind: NowKind = Object.hasOwn(kindMeta, data.kind) ? data.kind : 'other';
  return {
    state: 'live', music: null, expiresAt: new Date(expires).toISOString(),
    item: { kind, title: data.title, source: data.source, image: data.image, updated_at: data.updatedAt },
  };
}
