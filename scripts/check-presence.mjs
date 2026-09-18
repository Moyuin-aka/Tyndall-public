// Usage: node --experimental-strip-types scripts/check-presence.mjs
import assert from 'node:assert/strict';
import { presenceSchema, publicPresence } from '../src/utils/presence.ts';

const now = Date.parse('2026-09-15T10:00:00Z');
const payload = {
  version: 1,
  activity: { kind: 'writing', title: '写作', source: 'Obsidian', startedAt: new Date(now - 60_000).toISOString() },
  music: { state: 'playing', title: 'Example', artist: 'Artist', album: '' },
  observedAt: new Date(now).toISOString(),
};
assert(presenceSchema.safeParse(payload).success);
assert(!presenceSchema.safeParse({ ...payload, activity: { ...payload.activity, url: 'https://private.example/' } }).success);
assert(!presenceSchema.safeParse({ ...payload, music: { ...payload.music, state: 'paused' } }).success);
assert(!presenceSchema.safeParse({ ...payload, activity: { ...payload.activity, kind: '__proto__' } }).success);
assert(!presenceSchema.safeParse({ ...payload, music: undefined }).success);
assert(!presenceSchema.safeParse({ ...payload, observedAt: 'invalid' }).success);
const live = publicPresence(payload, payload.observedAt, now + 179_999);
assert.equal(live.state, 'live');
assert.equal(live.activity.startedAt, payload.activity.startedAt);
assert.equal(live.music.title, 'Example');
const expired = publicPresence(payload, payload.observedAt, now + 180_000);
assert.equal(expired.state, 'stale');
assert.equal(expired.activity, null);
assert.equal(expired.music, null);
assert.equal(publicPresence(payload, 'not-a-date', now).state, 'stale');
assert.equal(publicPresence(payload, new Date(now + 60_000).toISOString(), now).state, 'stale');
assert.equal(publicPresence({ ...payload, activity: null, music: null }, payload.observedAt, now).state, 'idle');
assert.equal(publicPresence({ ...payload, activity: null }, payload.observedAt, now).state, 'live');
console.log('Presence checks passed: schema, privacy allowlist, dual channels, clear and TTL boundaries.');
