// Cloudflare Worker - Telegram Bot 完整版
// 支持：文本、图片、列表、删除、统计

const worker = {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!env.TELEGRAM_WEBHOOK_SECRET || request.headers.get('x-telegram-bot-api-secret-token') !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      const update = await request.json();
      const message = update.message;

      if (!message) {
        return new Response('OK', { status: 200 });
      }

      const chatId = message.chat.id;

      // 验证用户 ID
      if (chatId.toString() !== env.TELEGRAM_CHAT_ID) {
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '⛔ 无权限');
        return new Response('OK', { status: 200 });
      }

      // Telegram 会把相册中的每张图片作为独立 update 发送。
      // 同一 media_group_id 的图片必须交给 Durable Object 聚合后再发布。
      if (message.photo) {
        if (message.media_group_id) {
          await queueMediaGroup(message, chatId, env);
        } else {
          await handlePhoto(message, chatId, env);
        }
        return new Response('OK', { status: 200 });
      }

      // 处理文本
      if (message.text) {
        const text = message.text;

        if (text.startsWith('/')) {
          await handleCommand(text, chatId, env);
        } else {
          await saveMemo(text, [], chatId, env);
        }
      }

      return new Response('OK', { status: 200 });

    } catch (error) {
      console.error('错误:', error);
      return new Response('OK', { status: 200 });
    }
  }
};

// 单图保持原有的立即发布行为。
async function handlePhoto(message, chatId, env) {
  try {
    const resource = await uploadTelegramPhoto(message, env);
    const content = message.caption?.trim() || '📷';
    await saveMemo(content, [resource], chatId, env);
  } catch (error) {
    console.error('图片处理错误:', error);
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ 上传失败: ${error.message}`);
  }
}

async function queueMediaGroup(message, chatId, env) {
  if (!env.MEDIA_GROUPS) {
    throw new Error('缺少 MEDIA_GROUPS Durable Object binding');
  }

  const groupKey = `${chatId}:${message.media_group_id}`;
  const id = env.MEDIA_GROUPS.idFromName(groupKey);
  const response = await env.MEDIA_GROUPS.get(id).fetch('https://media-group/append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`相册入队失败: ${response.status}`);
  }
}

// 每个 Telegram media_group_id 映射到一个 Durable Object。
// 每收到一张图就把 alarm 向后推，最后一张到达 1.5 秒后只发布一次。
export class MediaGroupAggregator {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const message = await request.json();
    if (!message?.photo?.length || !message.media_group_id) {
      return new Response('Invalid media group message', { status: 400 });
    }

    await this.state.storage.transaction(async (transaction) => {
      const album = await transaction.get('album') || {
        mediaGroupId: message.media_group_id,
        chatId: message.chat.id,
        attempts: 0,
        messages: [],
      };

      // Telegram 可能重投 webhook update；message_id 用作相册内幂等键。
      if (!album.messages.some((item) => item.message_id === message.message_id)) {
        album.messages.push(message);
        await transaction.put('album', album);
      }

      await transaction.setAlarm(Date.now() + 1500);
    });

    return new Response('queued');
  }

  async alarm() {
    const album = await this.state.storage.get('album');
    if (!album?.messages?.length) return;

    try {
      const messages = [...album.messages].sort((a, b) => a.message_id - b.message_id);
      const resources = [];
      for (const message of messages) {
        resources.push(await uploadTelegramPhoto(message, this.env));
      }

      const caption = messages.find((message) => message.caption?.trim())?.caption?.trim();
      await saveMemo(caption || '📷', resources, album.chatId, this.env);
      await this.state.storage.delete('album');
    } catch (error) {
      console.error('相册处理错误:', error);
      album.attempts = (album.attempts || 0) + 1;

      if (album.attempts < 3) {
        await this.state.storage.put('album', album);
        await this.state.storage.setAlarm(Date.now() + 1000 * (2 ** album.attempts));
        return;
      }

      await this.state.storage.delete('album');
      await sendMessage(
        this.env.TELEGRAM_BOT_TOKEN,
        album.chatId,
        `❌ 相册上传失败: ${error.message}`,
      );
    }
  }
}

async function uploadTelegramPhoto(message, env) {
  const photo = message.photo[message.photo.length - 1];
  const fileInfoResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(photo.file_id)}`,
  );
  const fileInfo = await fileInfoResponse.json();
  if (!fileInfoResponse.ok || !fileInfo.ok) throw new Error('获取文件失败');

  const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`;
  const imageResponse = await fetch(fileUrl);
  if (!imageResponse.ok) throw new Error(`下载图片失败: ${imageResponse.status}`);
  const imageData = await imageResponse.arrayBuffer();

  // 使用 Telegram 消息时间和 file_unique_id 生成确定性文件名，重试不会产生垃圾副本。
  const timestamp = Number(message.date) * 1000 || Date.now();
  const fileName = `memos/${timestamp}-${photo.file_unique_id}.jpg`;
  await env.R2_BUCKET.put(fileName, imageData, {
    httpMetadata: { contentType: 'image/jpeg' },
  });

  return {
    type: 'image/jpeg',
    url: `${env.R2_PUBLIC_URL}/${fileName}`,
    filename: fileName,
    size: imageData.byteLength,
  };
}

// 保存 memo
async function saveMemo(content, resources, chatId, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          content: content,
          visibility: 'public',
          tags: extractTags(content),
          resources: resources
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase: ${response.status} ${error}`);
    }

    const hasImage = resources.length > 0;
    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      hasImage ? `✅ 图片 Memo 已发布！` : '✅ Memo 已保存！'
    );

  } catch (error) {
    console.error('保存错误:', error);
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ 保存失败: ${error.message}`);
  }
}

// 提取标签
function extractTags(content) {
  const tagRegex = /#(\S+)/g;
  const tags = [];
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }
  return tags;
}

// 处理命令
async function handleCommand(text, chatId, env) {
  const parts = text.split(' ');
  const command = parts[0];
  const args = parts.slice(1);

  switch (command) {
    case '/start':
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId,
        '👋 Memos Bot\n\n' +
        '📝 发送消息 → 保存 memo\n' +
        '📷 发送图片 → 自动上传\n' +
        '🏷 使用 #标签 添加标签\n\n' +
        '命令：\n' +
        '/list - 最近 5 条\n' +
        '/delete - 删除上一条\n' +
        '/delete <id> - 删除指定 memo\n' +
        '/stats - 统计\n' +
        '/private <内容> - 私有 memo'
      );
      break;

    case '/list':
      await listMemos(chatId, env);
      break;

    case '/delete':
      if (args.length === 0) {
        // 没有参数，删除最新的 memo
        await deleteLatestMemo(chatId, env);
      } else {
        // 有参数，按 ID 删除
        await deleteMemo(args[0], chatId, env);
      }
      break;

    case '/stats':
      await getStats(chatId, env);
      break;

    case '/private':
      const privateContent = args.join(' ');
      if (!privateContent) {
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ 用法: /private <内容>');
      } else {
        await savePrivateMemo(privateContent, chatId, env);
      }
      break;

    default:
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❓ 未知命令，/start 查看帮助');
  }
}

// 列出 memos
async function listMemos(chatId, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos?select=id,content,created_at&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!response.ok) throw new Error('获取失败');

    const memos = await response.json();

    if (memos.length === 0) {
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '📭 暂无 memos');
      return;
    }

    let message = '📝 最近 5 条 Memos:\n\n';
    memos.forEach((memo, index) => {
      const preview = memo.content.length > 40
        ? memo.content.substring(0, 40) + '...'
        : memo.content;
      const shortId = memo.id.substring(0, 8);
      const date = new Date(memo.created_at).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      message += `${index + 1}. <code>${shortId}</code>\n`;
      message += `   ${preview}\n`;
      message += `   📅 ${date}\n\n`;
    });
    message += '💡 删除: /delete &lt;id&gt;';

    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, message, true);

  } catch (error) {
    console.error('列表错误:', error);
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ 获取列表失败');
  }
}
async function deleteLatestMemo(chatId, env) {
  try {
    // 获取最新的一条 memo
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos?select=id,content&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!response.ok) throw new Error('查询失败');

    const memos = await response.json();

    if (memos.length === 0) {
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '📭 没有可删除的 memo');
      return;
    }

    const latestMemo = memos[0];
    const preview = latestMemo.content.length > 30
      ? latestMemo.content.substring(0, 30) + '...'
      : latestMemo.content;

    // 删除
    const deleteResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos?id=eq.${latestMemo.id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!deleteResponse.ok) throw new Error('删除失败');

    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      `🗑 已删除最新的 memo:\n"${preview}"`
    );

  } catch (error) {
    console.error('删除最新memo错误:', error);
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ 删除失败');
  }
}

// 删除

// 删除 memo
async function deleteMemo(shortId, chatId, env) {
  try {
    // 1. 获取最近的 memos 查找匹配的 ID
    const searchResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos?select=id&order=created_at.desc&limit=20`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!searchResponse.ok) throw new Error('查询失败');

    const allMemos = await searchResponse.json();
    const matched = allMemos.find(m => m.id.startsWith(shortId));

    if (!matched) {
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ 未找到该 memo\n💡 请用 /list 查看最近的 memos');
      return;
    }

    const fullId = matched.id;

    // 2. 删除
    const deleteResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos?id=eq.${fullId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!deleteResponse.ok) throw new Error('删除失败');

    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '🗑 已删除');

  } catch (error) {
    console.error('删除错误:', error);
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ 删除失败: ${error.message}`);
  }
}

// 统计
async function getStats(chatId, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos?select=count`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact'
        }
      }
    );

    const count = response.headers.get('Content-Range')?.split('/')[1] || '0';

    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      `📊 统计\n\n总 Memos: ${count}`
    );

  } catch (error) {
    console.error('统计错误:', error);
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ 获取统计失败');
  }
}

// 保存私有 memo
async function savePrivateMemo(content, chatId, env) {
  try {
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/memos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          content: content,
          visibility: 'private',
          tags: extractTags(content),
          resources: []
        })
      }
    );

    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '🔒 私有 Memo 已保存');

  } catch (error) {
    console.error('私有保存错误:', error);
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ 保存失败');
  }
}

// 发送消息
async function sendMessage(botToken, chatId, text, parseHtml = false) {
  await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseHtml ? 'HTML' : undefined
      })
    }
  );
}

export default worker;
