import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sensitiveFindings } from './public-safety.mjs';
import { adaptPublic } from './public-adapters.mjs';
test('detects private endpoints and network addresses', () => {
  for (const s of ['https://api.moyuin.top', '192.168.1.2', '100.100.10.2', '/Users/person/private/']) assert(sensitiveFindings(s).length);
});
test('detects representative credentials without logging values', () => {
  for (const s of ['-----BEGIN PRIVATE KEY-----', 'ghp_' + 'x'.repeat(36), 'NOW_PLAYING_SECRET="' + 'x'.repeat(32) + '"']) assert(sensitiveFindings(s).length);
});
test('author friend exception only permits exact approved public links', () => {
  const links = '"https://moyuin.top/" "https://moyuin.top/avatar.webp"';
  assert(sensitiveFindings(links).length);
  assert.deepEqual(sensitiveFindings(links, { authorFriend: true }), []);
  assert.deepEqual(sensitiveFindings('<span>moyuin.top</span>', { authorFriend: true }), []);
  for (const url of ['https://api.moyuin.top/', 'https://moyuin.top/private', 'https://moyuin.top/avatar.webp?secret=1']) {
    assert(sensitiveFindings(url, { authorFriend: true }).length);
  }
});
test('allows placeholders, env references and project attribution', () => {
  assert.deepEqual(sensitiveFindings('https://example.com process.env.NOW_PLAYING_SECRET https://github.com/Moyuin-aka/tyndall-public'), []);
});
test('keeps author credit but neutralizes profile destinations', () => {
  const output = adaptPublic('src/example.ts', 'https://github.com/Moyuin-aka/tyndall-public https://github.com/Moyuin-aka https://pic.moyuin.top');
  assert(output.includes('Moyuin-aka/tyndall-public'));
  assert(output.includes('https://github.com/example'));
  assert.deepEqual(sensitiveFindings(output), []);
});
test('fails closed when an expected upstream adaptation no longer matches', () => {
  assert.throws(() => adaptPublic('src/pages/travel.astro', 'changed source'));
});
test('writing heatmap stays scoped to the content directory in a regular repository', () => {
  const output = adaptPublic('.github/scripts/generate-heatmap.mjs', 'git log --since="15 months ago" --date=short --format="%ad"');
  assert(output.endsWith('--format="%ad" -- .'));
});
