import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/telegram-memos-bot/worker.js';

const env = {
  TELEGRAM_WEBHOOK_SECRET: 'fixture',
  TELEGRAM_CHAT_ID: '12345',
  TELEGRAM_BOT_TOKEN: 'fixture',
  SUPABASE_URL: 'https://database.example',
  SUPABASE_SERVICE_ROLE_KEY: 'fake',
};
const request = (secret, chatId = 12345) => new Request('https://bot.example', {
  method: 'POST',
  headers: secret ? { 'x-telegram-bot-api-secret-token': secret } : {},
  body: JSON.stringify({ message: { chat: { id: chatId }, text: 'A note #reading' } }),
});

test('missing or incorrect webhook secrets reject before calling any service', async () => {
  for (const secret of [null, 'incorrect']) {
    assert.equal((await worker.fetch(request(secret), env)).status, 401);
  }
  assert.equal((await worker.fetch(request('fixture'), { ...env, TELEGRAM_WEBHOOK_SECRET: '' })).status, 401);
});

test('only the allowed chat can publish, using the server-side database key', async () => {
  const original = globalThis.fetch;
  const writes = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith(env.SUPABASE_URL)) {
      writes.push(init);
      return new Response(null, { status: 201 });
    }
    assert.ok(String(url).startsWith('https://api.telegram.org/'));
    return Response.json({ ok: true });
  };
  try {
    await worker.fetch(request('fixture', 54321), env);
    assert.equal(writes.length, 0);
    await worker.fetch(request('fixture'), env);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].headers.apikey, env.SUPABASE_SERVICE_ROLE_KEY);
    assert.equal(writes[0].headers.Authorization, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
    assert.deepEqual(JSON.parse(writes[0].body), {
      content: 'A note #reading', visibility: 'public', tags: ['reading'], resources: [],
    });
  } finally {
    globalThis.fetch = original;
  }
});
