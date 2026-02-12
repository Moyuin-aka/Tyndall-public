import type { APIRoute } from "astro";

export const prerender = false;

type NotifyType = "new_comment" | "reply";

interface NotifyComment {
  author_name: string;
  author_email: string;
  content: string;
}

interface NotifyReply {
  name: string;
  email: string;
  content: string;
}

interface NotifyPayload {
  type: NotifyType;
  comment: NotifyComment;
  replyTo?: NotifyReply;
  postTitle: string;
  postUrl: string;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asString(value: unknown, maxLength = 4000): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLength);
}

function toPayload(input: unknown): NotifyPayload | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  const type = body.type;

  if (type !== "new_comment" && type !== "reply") return null;

  const commentRaw =
    body.comment && typeof body.comment === "object"
      ? (body.comment as Record<string, unknown>)
      : null;

  if (!commentRaw) return null;

  const payload: NotifyPayload = {
    type,
    comment: {
      author_name: asString(commentRaw.author_name, 120),
      author_email: asString(commentRaw.author_email, 254),
      content: asString(commentRaw.content, 5000),
    },
    postTitle: asString(body.postTitle, 300),
    postUrl: asString(body.postUrl, 2000),
  };

  if (!payload.comment.author_name || !payload.comment.author_email) return null;
  if (!payload.comment.content || !payload.postTitle || !payload.postUrl) return null;

  if (body.replyTo && typeof body.replyTo === "object") {
    const replyTo = body.replyTo as Record<string, unknown>;
    payload.replyTo = {
      name: asString(replyTo.name, 120),
      email: asString(replyTo.email, 254),
      content: asString(replyTo.content, 5000),
    };
  }

  return payload;
}

export const POST: APIRoute = async ({ request, url }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return json(403, { error: "Forbidden" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const payload = toPayload(body);
  if (!payload) {
    return json(400, { error: "Invalid payload" });
  }

  const workerUrl =
    import.meta.env.COMMENT_NOTIFY_URL || "";
  const workerSecret =
    import.meta.env.COMMENT_NOTIFY_SECRET || "";

  // Optional feature: if not configured, silently skip.
  if (!workerUrl || !workerSecret) {
    return json(200, { ok: true, skipped: true });
  }

  try {
    const upstream = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        secret: workerSecret,
      }),
    });

    if (!upstream.ok) {
      return json(502, { error: "Notification dispatch failed" });
    }

    return json(200, { ok: true });
  } catch {
    return json(502, { error: "Notification dispatch failed" });
  }
};
