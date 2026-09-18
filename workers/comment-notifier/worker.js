/**
 * Cloudflare Worker: 评论邮件通知服务
 *
 * 环境变量配置（在 Cloudflare Dashboard 设置）：
 * - RESEND_API_KEY: Resend API 密钥
 * - ADMIN_EMAIL: 博主邮箱（接收新评论通知）
 * - FROM_EMAIL: 发件人邮箱（需要在 Resend 验证的域名邮箱，如 noreply@yourdomain.com）
 * - SITE_NAME: 网站名称
 * - SITE_URL: 网站地址
 * - NOTIFY_SECRET: 用于验证请求的密钥（防止滥用）
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();
      const { type, secret, comment, replyTo, postTitle, postUrl } = body;

      // 验证密钥
      if (secret !== env.NOTIFY_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 验证必要字段
      if (!comment || !postTitle || !postUrl) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const siteName = env.SITE_NAME || 'Your Name';
      const siteUrl = env.SITE_URL || 'https://example.com';

      let emailResults = [];

      if (type === 'new_comment') {
        // 通知博主：有新评论
        const result = await sendEmail(env, {
          to: env.ADMIN_EMAIL,
          subject: `💬 ${siteName} 收到新评论`,
          html: generateNewCommentEmail({
            siteName,
            siteUrl,
            postTitle,
            postUrl,
            authorName: comment.author_name,
            authorEmail: comment.author_email,
            content: comment.content,
          }),
        });
        emailResults.push({ to: 'admin', result });
      } else if (type === 'reply') {
        // 回复通知：需要通知博主和被回复者

        // 1. 始终通知博主有新回复（除非回复者就是博主自己）
        if (comment.author_email !== env.ADMIN_EMAIL) {
          const adminResult = await sendEmail(env, {
            to: env.ADMIN_EMAIL,
            subject: `💬 ${siteName}：${comment.author_name} 回复了 ${replyTo?.name || '评论'}`,
            html: generateAdminReplyEmail({
              siteName,
              siteUrl,
              postTitle,
              postUrl,
              replyAuthor: comment.author_name,
              replyAuthorEmail: comment.author_email,
              replyContent: comment.content,
              originalAuthor: replyTo?.name,
              originalContent: replyTo?.content,
            }),
          });
          emailResults.push({ to: 'admin', result: adminResult });
        }

        // 2. 通知被回复者（如果有邮箱，且不是博主，且不是自己回复自己）
        if (replyTo?.email && replyTo.email !== env.ADMIN_EMAIL && replyTo.email !== comment.author_email) {
          const replyResult = await sendEmail(env, {
            to: replyTo.email,
            subject: `💬 你在「${postTitle}」的评论有新回复`,
            html: generateReplyEmail({
              siteName,
              siteUrl,
              postTitle,
              postUrl,
              originalAuthor: replyTo.name,
              originalContent: replyTo.content,
              replyAuthor: comment.author_name,
              replyContent: comment.content,
            }),
          });
          emailResults.push({ to: 'reply_target', result: replyResult });
        }
      } else {
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, results: emailResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * 验证邮箱格式
 */
function isValidEmail(email) {
  return email && typeof email === 'string' && email.includes('@') && email.length > 3;
}

/**
 * 使用 Resend 发送邮件
 */
async function sendEmail(env, { to, subject, html }) {
  // 验证收件人邮箱
  if (!isValidEmail(to)) {
    console.warn('Invalid or missing recipient email:', to);
    return { skipped: true, reason: 'invalid_email' };
  }

  // 验证发件人邮箱
  if (!isValidEmail(env.FROM_EMAIL)) {
    console.warn('Invalid or missing FROM_EMAIL');
    return { skipped: true, reason: 'invalid_from_email' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return await response.json();
}

/**
 * 生成新评论通知邮件 HTML
 */
function generateNewCommentEmail({ siteName, siteUrl, postTitle, postUrl, authorName, authorEmail, content }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #ffffff; padding: 40px 20px; margin: 0; color: #333;">
  <div style="max-width: 520px; margin: 0 auto;">
    <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.6;">
      你的文章 <a href="${postUrl}" style="color: #333; text-decoration: underline;">「${escapeHtml(postTitle)}」</a> 收到了一条新评论：
    </p>

    <div style="border-left: 2px solid #e5e5e5; padding-left: 16px; margin: 24px 0;">
      <div style="margin-bottom: 8px;">
        <span style="font-weight: 600; color: #333; font-size: 14px;">${escapeHtml(authorName)}</span>
        <span style="color: #999; font-size: 12px; margin-left: 8px;">${escapeHtml(authorEmail)}</span>
      </div>
      <div style="color: #444; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(content)}</div>
    </div>

    <p style="margin: 24px 0 0;">
      <a href="${postUrl}#comments" style="color: #333; font-size: 13px; text-decoration: underline;">查看评论 →</a>
    </p>

    <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        来自 <a href="${siteUrl}" style="color: #666; text-decoration: none;">${siteName}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 生成回复通知邮件 HTML
 */
function generateReplyEmail({ siteName, siteUrl, postTitle, postUrl, originalAuthor, originalContent, replyAuthor, replyContent }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #ffffff; padding: 40px 20px; margin: 0; color: #333;">
  <div style="max-width: 520px; margin: 0 auto;">
    <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.6;">
      Hi ${escapeHtml(originalAuthor)}，你在 <a href="${postUrl}" style="color: #333; text-decoration: underline;">「${escapeHtml(postTitle)}」</a> 的评论收到了回复。
    </p>

    <!-- 原评论 -->
    <div style="border-left: 2px solid #ddd; padding-left: 16px; margin: 24px 0; opacity: 0.7;">
      <div style="color: #888; font-size: 12px; margin-bottom: 4px;">你的评论：</div>
      <div style="color: #666; font-size: 13px; line-height: 1.5;">${escapeHtml(truncate(originalContent, 100))}</div>
    </div>

    <!-- 回复内容 -->
    <div style="border-left: 2px solid #333; padding-left: 16px; margin: 24px 0;">
      <div style="font-weight: 600; color: #333; font-size: 14px; margin-bottom: 8px;">${escapeHtml(replyAuthor)} 回复了你：</div>
      <div style="color: #444; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(replyContent)}</div>
    </div>

    <p style="margin: 24px 0 0;">
      <a href="${postUrl}#comments" style="color: #333; font-size: 13px; text-decoration: underline;">查看回复 →</a>
    </p>

    <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        来自 <a href="${siteUrl}" style="color: #666; text-decoration: none;">${siteName}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 生成博主专用的回复通知邮件 HTML（显示谁回复了谁）
 */
function generateAdminReplyEmail({ siteName, siteUrl, postTitle, postUrl, replyAuthor, replyAuthorEmail, replyContent, originalAuthor, originalContent }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #ffffff; padding: 40px 20px; margin: 0; color: #333;">
  <div style="max-width: 520px; margin: 0 auto;">
    <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.6;">
      在 <a href="${postUrl}" style="color: #333; text-decoration: underline;">「${escapeHtml(postTitle)}」</a> 中，<strong>${escapeHtml(replyAuthor)}</strong> 回复了 <strong>${escapeHtml(originalAuthor || '某条评论')}</strong>：
    </p>

    <!-- 被回复的原评论 -->
    ${originalContent ? `
    <div style="border-left: 2px solid #ddd; padding-left: 16px; margin: 24px 0; opacity: 0.7;">
      <div style="color: #888; font-size: 12px; margin-bottom: 4px;">@${escapeHtml(originalAuthor)} 的评论：</div>
      <div style="color: #666; font-size: 13px; line-height: 1.5;">${escapeHtml(truncate(originalContent, 150))}</div>
    </div>
    ` : ''}

    <!-- 新回复内容 -->
    <div style="border-left: 2px solid #333; padding-left: 16px; margin: 24px 0;">
      <div style="margin-bottom: 8px;">
        <span style="font-weight: 600; color: #333; font-size: 14px;">${escapeHtml(replyAuthor)}</span>
        <span style="color: #999; font-size: 12px; margin-left: 8px;">${escapeHtml(replyAuthorEmail)}</span>
      </div>
      <div style="color: #444; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(replyContent)}</div>
    </div>

    <p style="margin: 24px 0 0;">
      <a href="${postUrl}#comments" style="color: #333; font-size: 13px; text-decoration: underline;">查看评论 →</a>
    </p>

    <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        来自 <a href="${siteUrl}" style="color: #666; text-decoration: none;">${siteName}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 截断文本
 */
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * 简单的 MD5 实现（用于 Gravatar URL）
 */
function md5(string) {
  // 这里使用一个简化版本，实际生产中可以用 crypto
  // Cloudflare Workers 支持 crypto.subtle
  // 但为了简单，这里返回一个占位符，你可以替换为真实实现
  return hashCode(string);
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}
