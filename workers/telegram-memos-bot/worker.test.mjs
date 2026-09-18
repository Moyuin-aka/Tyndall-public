import assert from 'node:assert/strict';
import test from 'node:test';

import worker, { MediaGroupAggregator } from './worker.js';

class FakeStorage {
  constructor() {
    this.values = new Map();
    this.alarm = null;
  }

  async get(key) {
    return this.values.get(key);
  }

  async put(key, value) {
    this.values.set(key, structuredClone(value));
  }

  async delete(key) {
    this.values.delete(key);
  }

  async setAlarm(timestamp) {
    this.alarm = timestamp;
  }

  async transaction(callback) {
    return callback(this);
  }
}

function photoMessage(messageId, mediaGroupId, caption = '') {
  return {
    message_id: messageId,
    date: 1_780_000_000,
    media_group_id: mediaGroupId,
    chat: { id: 12345 },
    caption,
    photo: [
      { file_id: `small-${messageId}`, file_unique_id: `small-u-${messageId}` },
      { file_id: `large-${messageId}`, file_unique_id: `large-u-${messageId}` },
    ],
  };
}

function createFetchMock() {
  const calls = [];
  const fetchMock = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.includes('/getFile?')) {
      const fileId = new URL(url).searchParams.get('file_id');
      return Response.json({ ok: true, result: { file_path: `photos/${fileId}.jpg` } });
    }

    if (url.includes('/file/bot')) {
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'content-type': 'image/jpeg' },
      });
    }

    if (url === 'https://supabase.example/rest/v1/memos') {
      return new Response(null, { status: 201 });
    }

    if (url.includes('/sendMessage')) {
      return Response.json({ ok: true });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  return { calls, fetchMock };
}

function makeEnv() {
  const r2Puts = [];
  return {
    TELEGRAM_BOT_TOKEN: 'test-token',
    TELEGRAM_WEBHOOK_SECRET: 'test-webhook',
    TELEGRAM_CHAT_ID: '12345',
    SUPABASE_URL: 'https://supabase.example',
    SUPABASE_SERVICE_ROLE_KEY: 'fake',
    R2_PUBLIC_URL: 'https://images.example',
    R2_BUCKET: {
      async put(key, data, options) {
        r2Puts.push({ key, data, options });
      },
    },
    r2Puts,
  };
}

test('routes Telegram albums to one Durable Object without publishing each photo immediately', async () => {
  const forwarded = [];
  const env = makeEnv();
  env.MEDIA_GROUPS = {
    idFromName(name) {
      assert.equal(name, '12345:album-1');
      return name;
    },
    get() {
      return {
        async fetch(_url, init) {
          forwarded.push(JSON.parse(init.body));
          return new Response('queued');
        },
      };
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Album routing must not call external services');
  };

  try {
    for (const message of [
      photoMessage(11, 'album-1', '一次旅行 #生活'),
      photoMessage(12, 'album-1'),
    ]) {
      const response = await worker.fetch(
        new Request('https://worker.example', {
          headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' },
          method: 'POST',
          body: JSON.stringify({ update_id: message.message_id, message }),
        }),
        env,
      );
      assert.equal(response.status, 200);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(forwarded.length, 2);
  assert.deepEqual(forwarded.map((message) => message.message_id), [11, 12]);
});

test('publishes a media group as one memo containing every photo in Telegram order', async () => {
  const storage = new FakeStorage();
  const env = makeEnv();
  const aggregator = new MediaGroupAggregator({ storage }, env);
  const { calls, fetchMock } = createFetchMock();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;

  try {
    // Telegram delivery order is not guaranteed; output should still follow message_id.
    await aggregator.fetch(new Request('https://media-group/append', {
      method: 'POST',
      body: JSON.stringify(photoMessage(12, 'album-1')),
    }));
    await aggregator.fetch(new Request('https://media-group/append', {
      method: 'POST',
      body: JSON.stringify(photoMessage(11, 'album-1', '一次旅行 #生活')),
    }));

    assert.ok(storage.alarm, 'the debounce alarm should be scheduled');
    assert.equal(calls.length, 0, 'nothing should be published before the album settles');

    await aggregator.alarm();
  } finally {
    globalThis.fetch = originalFetch;
  }

  const inserts = calls.filter((call) => call.url === 'https://supabase.example/rest/v1/memos');
  assert.equal(inserts.length, 1);

  const memo = JSON.parse(inserts[0].init.body);
  assert.equal(memo.content, '一次旅行 #生活');
  assert.deepEqual(memo.tags, ['生活']);
  assert.equal(memo.resources.length, 2);
  assert.match(memo.resources[0].filename, /large-u-11/);
  assert.match(memo.resources[1].filename, /large-u-12/);
  assert.equal(env.r2Puts.length, 2);

  const acknowledgements = calls.filter((call) => call.url.includes('/sendMessage'));
  assert.equal(acknowledgements.length, 1);
  assert.equal(await storage.get('album'), undefined);
});

test('deduplicates repeated Telegram delivery of the same album message', async () => {
  const storage = new FakeStorage();
  const env = makeEnv();
  const aggregator = new MediaGroupAggregator({ storage }, env);
  const message = photoMessage(11, 'album-1', '相册');

  await aggregator.fetch(new Request('https://media-group/append', {
    method: 'POST',
    body: JSON.stringify(message),
  }));
  await aggregator.fetch(new Request('https://media-group/append', {
    method: 'POST',
    body: JSON.stringify(message),
  }));

  const album = await storage.get('album');
  assert.equal(album.messages.length, 1);
});
