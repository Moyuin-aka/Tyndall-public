import {
  getComments,
  submitComment,
  deleteComment,
  deleteAnonymousComment,
  getCurrentUser,
  getSession,
  signInWithOAuth,
  signOut,
  onAuthStateChange,
  isAdmin,
  canDeleteComment,
  type Comment
} from "@utils/supabase";
import { md5 } from "@utils/md5";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

type CommentWithReplies = Comment & { replies: CommentWithReplies[] };
type AuthSubscription = { unsubscribe: () => void };

// 评论索引（仅驻留内存，不写入 DOM）
const commentStore = new Map<string, Comment>();
const pendingDeleteIds = new Set<string>();
let authSubscription: AuthSubscription | null = null;

// i18n 翻译表
const i18n = {
  zh: {
    no_comments: "暂无评论",
    load_error: "加载失败",
    reply: "回复",
    reply_to: "回复 @",
    cancel: "取消",
    submit: "发送",
    sending: "发送中...",
    success: "发送成功",
    error: "发送失败，请稀后重试",
    fill_required: "请填写必填项",
    too_long: "评论内容超出限制（不超过 2000 字或 1000 单词）",
    invalid_website: "请输入有效的网址（如 example.com 或 https://example.com）",
    just_now: "刚刚",
    minutes_ago: "分钟前",
    hours_ago: "小时前",
    days_ago: "天前",
    months_ago: "个月前",
    years_ago: "年前",
    login_hint: "使用以下方式登录，或匿名评论",
    logout: "登出",
    admin: "管理员",
    delete: "删除",
    delete_confirm: "确定要删除这条评论吗？",
    delete_success: "已删除",
    delete_error: "删除失败",
    delete_expired: "删除时间已过期",
    auth_error: "登录失败，请重试",
  },
  en: {
    no_comments: "No comments yet",
    load_error: "Failed to load",
    reply: "Reply",
    reply_to: "Reply to @",
    cancel: "Cancel",
    submit: "Send",
    sending: "Sending...",
    success: "Sent successfully",
    error: "Failed to send, please try again",
    fill_required: "Please fill in required fields",
    too_long: "Comment too long (max 2000 chars or 1000 words)",
    invalid_website: "Please enter a valid website URL (e.g. example.com or https://example.com)",
    just_now: "just now",
    minutes_ago: " minutes ago",
    hours_ago: " hours ago",
    days_ago: " days ago",
    months_ago: " months ago",
    years_ago: " years ago",
    login_hint: "Sign in with, or comment anonymously",
    logout: "Sign out",
    admin: "Admin",
    delete: "Delete",
    delete_confirm: "Are you sure you want to delete this comment?",
    delete_success: "Deleted",
    delete_error: "Failed to delete",
    delete_expired: "Delete window expired",
    auth_error: "Sign-in failed, please try again",
  },
};

function getLocale(): "zh" | "en" {
  const container = document.querySelector(".supabase-comments");
  const locale = container?.getAttribute("data-locale") || "zh";
  return locale === "en" ? "en" : "zh";
}

function t(key: keyof typeof i18n.zh): string {
  const locale = getLocale();
  return i18n[locale][key] || i18n.zh[key] || key;
}

// 获取通知配置
function getNotifyConfig() {
  const container = document.querySelector(".supabase-comments");
  return {
    url: container?.getAttribute("data-notify-endpoint") || "/api/comment-notify",
    postTitle: container?.getAttribute("data-post-title") || "",
    postUrl: container?.getAttribute("data-post-url") || window.location.href,
  };
}

// 发送邮件通知（异步，不阻塞用户）
async function sendNotification(
  type: "new_comment" | "reply",
  comment: { author_name: string; author_email: string; content: string },
  replyTo?: { name: string; email: string; content: string }
) {
  const config = getNotifyConfig();
  if (!config.url) {
    console.log("Comment notification not configured");
    return;
  }

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        comment,
        replyTo,
        postTitle: config.postTitle,
        postUrl: config.postUrl,
      }),
    });

    if (!response.ok) {
      console.warn("Failed to send notification:", await response.text());
    }
  } catch (error) {
    console.warn("Failed to send notification:", error);
  }
}

// 从 localStorage 获取用户信息
function getUserInfo() {
  return {
    name: localStorage.getItem("comment_author_name") || "",
    email: localStorage.getItem("comment_author_email") || "",
    website: localStorage.getItem("comment_author_website") || "",
  };
}

// 保存用户信息到 localStorage
function saveUserInfo(name: string, email: string, website: string) {
  localStorage.setItem("comment_author_name", name);
  localStorage.setItem("comment_author_email", email);
  localStorage.setItem("comment_author_website", website);
}

// 字数统计和限制
const MAX_CHARS = 2000;
const MAX_WORDS = 1000;

function getWordCount(text: string): { chars: number; words: number } {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { chars, words };
}

function isContentWithinLimit(text: string): boolean {
  const { chars, words } = getWordCount(text);
  return chars <= MAX_CHARS && words <= MAX_WORDS;
}

function updateCharCount(text: string) {
  const charCountEl = document.getElementById("char-count");
  if (!charCountEl) return;

  const { chars } = getWordCount(text);
  charCountEl.textContent = chars.toString();

  // 超出限制时标红
  if (chars > MAX_CHARS) {
    charCountEl.style.color = "#f56565";
  } else {
    charCountEl.style.color = "var(--text-secondary)";
  }
}

// 构建评论树结构
function buildCommentTree(comments: Comment[]): CommentWithReplies[] {
  const commentMap = new Map<string, CommentWithReplies>();
  const rootComments: CommentWithReplies[] = [];

  // 首先创建所有评论的映射
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // 根评论按时间降序（最新评论在前）
  const sortedByNewest = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  sortedByNewest.forEach((comment) => {
    const current = commentMap.get(comment.id);
    if (!current) return;
    if (!comment.parent_id || !commentMap.has(comment.parent_id)) {
      rootComments.push(current);
    }
  });

  // 回复按时间升序（对话流）
  const sortedByOldest = [...comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  sortedByOldest.forEach((comment) => {
    if (!comment.parent_id) return;
    const parent = commentMap.get(comment.parent_id);
    const current = commentMap.get(comment.id);
    if (parent && current) {
      parent.replies.push(current);
    }
  });

  return rootComments;
}

function getAvatarUrl(email: string) {
  const hash = md5(email.trim().toLowerCase());
  return `https://weavatar.com/avatar/${hash}?s=80&d=mm`;
}

// HTML 转义（用于 data 属性）
function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHttpUrl(url: string, fallback = ""): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URL and fallback.
  }
  return fallback;
}

function sanitizeLinkUrl(url: string, fallback = ""): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:"
    ) {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URL and fallback.
  }
  return fallback;
}

function normalizeWebsiteUrl(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  const hasScheme = /^[a-z][a-z\d+\-.]*:/i.test(trimmed);

  if (hasScheme) {
    return /^https?:\/\//i.test(trimmed) ? sanitizeHttpUrl(trimmed, "") : "";
  }

  const withProtocol = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : `https://${trimmed}`;
  return sanitizeHttpUrl(withProtocol, "");
}

function renderCommentMarkdown(markdownText: string): string {
  const rawHtml = marked.parse(markdownText || "", {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;

  return sanitizeHtml(rawHtml, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "del",
      "code",
      "pre",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName: string, attribs: Record<string, string | undefined>) => {
        const safeHref = sanitizeLinkUrl(attribs.href || "");
        if (!safeHref) {
          return { tagName: "span", attribs: {} };
        }
        return {
          tagName: "a",
          attribs: {
            href: safeHref,
            target: "_blank",
            rel: "noopener noreferrer nofollow",
            title: attribs.title || "",
          },
        };
      },
    },
  });
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const locale = getLocale();
  if (locale === "en") {
    if (days > 365) return `${Math.floor(days / 365)}${t("years_ago")}`;
    if (days > 30) return `${Math.floor(days / 30)}${t("months_ago")}`;
    if (days > 0) return `${days}${t("days_ago")}`;
    if (hours > 0) return `${hours}${t("hours_ago")}`;
    if (minutes > 0) return `${minutes}${t("minutes_ago")}`;
    return t("just_now");
  } else {
    if (days > 365) return `${Math.floor(days / 365)}${t("years_ago")}`;
    if (days > 30) return `${Math.floor(days / 30)}${t("months_ago")}`;
    if (days > 0) return `${days}${t("days_ago")}`;
    if (hours > 0) return `${hours}${t("hours_ago")}`;
    if (minutes > 0) return `${minutes}${t("minutes_ago")}`;
    return t("just_now");
  }
}

// 渲染单个评论
function renderComment(
  comment: CommentWithReplies,
  localIds: Record<string, number>,
): string {
  const dateStr = formatDate(comment.created_at);
  const safeCommentId = escapeHtml(comment.id || "");
  const safeAuthorName = escapeHtml(comment.author_name || "Anonymous");
  const safeContentMarkdown = renderCommentMarkdown(comment.content || "");

  // 优先使用 OAuth 头像，否则用 weavatar
  const avatarUrl = sanitizeHttpUrl(
    comment.author_avatar || "",
    getAvatarUrl(comment.author_email || ""),
  );

  // 如果有website，点击昵称跳转（自动补全协议前缀）
  const websiteUrl = normalizeWebsiteUrl(comment.author_website || "");
  const authorHtml = websiteUrl
    ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="comment-author-name">${safeAuthorName}</a>`
    : `<span class="comment-author-name">${safeAuthorName}</span>`;

  // 检查是否可以删除
  const { canDelete, reason } = canDeleteComment(comment, currentUser, localIds);

  // 删除按钮
  const deleteBtn = canDelete
    ? `<button class="btn-delete-action" data-comment-id="${safeCommentId}" data-reason="${escapeHtml(reason || "")}">${t("delete")}</button>`
    : '';

  let html = `
    <div class="tk-comment" data-comment-id="${safeCommentId}" id="comment-${safeCommentId}">
      <div class="tk-avatar">
        <img src="${escapeHtml(avatarUrl)}" alt="${safeAuthorName}">
      </div>
      <div class="tk-main">
          <div class="tk-meta">
            ${authorHtml}
            <span class="tk-time">${dateStr}</span>
          </div>
          <div class="tk-content">
            ${safeContentMarkdown}
          </div>
          <div class="tk-actions">
            <button class="btn-reply-action"
                    data-comment-id="${safeCommentId}">${t("reply")}</button>
            ${deleteBtn}
          </div>

          ${
            comment.replies && comment.replies.length > 0
              ? `
            <div class="tk-replies">
              ${comment.replies.map((reply) => renderComment(reply, localIds)).join("")}
            </div>
          `
              : ""
          }
      </div>
    </div>
  `;

  return html;
}

// 渲染评论列表
function renderComments(comments: Comment[]) {
  const commentsList = document.getElementById("comments-list");
  if (!commentsList) return;
  const localIds = getLocalCommentIds();

  commentStore.clear();
  comments.forEach((comment) => {
    commentStore.set(comment.id, comment);
  });

  if (comments.length === 0) {
    commentsList.innerHTML = `<div class="no-comments">${t("no_comments")}</div>`;
    return;
  }

  const commentTree = buildCommentTree(comments);
  const html = commentTree.map((comment) => renderComment(comment, localIds)).join("");
  commentsList.innerHTML = html;
}

async function handleCommentsListClick(event: Event) {
  const commentsList = document.getElementById("comments-list");
  if (!commentsList) return;
  if (!(event.target instanceof Element)) return;

  const replyBtn = event.target.closest(".btn-reply-action") as HTMLButtonElement | null;
  if (replyBtn && commentsList.contains(replyBtn)) {
    const commentId = replyBtn.getAttribute("data-comment-id");
    if (!commentId) return;
    const sourceComment = commentStore.get(commentId) || null;
    handleReply(sourceComment);
    return;
  }

  const deleteBtn = event.target.closest(".btn-delete-action") as HTMLButtonElement | null;
  if (!deleteBtn || !commentsList.contains(deleteBtn)) return;

  const commentId = deleteBtn.getAttribute("data-comment-id");
  const reason = deleteBtn.getAttribute("data-reason");
  if (!commentId) return;
  if (pendingDeleteIds.has(commentId)) return;

  if (!confirm(t("delete_confirm"))) return;

  try {
    pendingDeleteIds.add(commentId);
    deleteBtn.disabled = true;
    deleteBtn.textContent = "...";

    if (reason === "anonymous_window") {
      const success = await deleteAnonymousComment(commentId);
      if (!success) {
        alert(t("delete_expired"));
        return;
      }
      removeLocalCommentId(commentId);
    } else {
      await deleteComment(commentId);
    }

    await loadComments();
  } catch (error) {
    console.error("Delete failed:", error);
    alert(t("delete_error"));
    deleteBtn.disabled = false;
    deleteBtn.textContent = t("delete");
  } finally {
    pendingDeleteIds.delete(commentId);
  }
}

// 存储当前回复的父评论信息
let currentReplyTo: { id: string; name: string; email: string; content: string } | null = null;

// 当前登录用户
let currentUser: any = null;

// localStorage 中存储的匿名评论 ID 和创建时间
function getLocalCommentIds(): Record<string, number> {
  try {
    const stored = localStorage.getItem('my_comment_ids');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLocalCommentId(commentId: string) {
  const ids = getLocalCommentIds();
  ids[commentId] = Date.now();
  // 清理过期的记录（超过 10 分钟的）
  const tenMinutes = 10 * 60 * 1000;
  Object.keys(ids).forEach(id => {
    if (Date.now() - ids[id] > tenMinutes) {
      delete ids[id];
    }
  });
  localStorage.setItem('my_comment_ids', JSON.stringify(ids));
}

function removeLocalCommentId(commentId: string) {
  const ids = getLocalCommentIds();
  delete ids[commentId];
  localStorage.setItem('my_comment_ids', JSON.stringify(ids));
}

// 更新 UI 显示登录状态
function updateAuthUI(user: any, reloadComments = true) {
  currentUser = user;
  const loggedOut = document.getElementById('auth-logged-out');
  const loggedIn = document.getElementById('auth-logged-in');
  const anonymousFields = document.getElementById('anonymous-form-fields');
  const authAvatar = document.getElementById('auth-avatar') as HTMLImageElement;
  const authName = document.getElementById('auth-name');
  const adminBadge = document.getElementById('auth-admin-badge');

  if (user) {
    // 已登录
    if (loggedOut) loggedOut.style.display = 'none';
    if (loggedIn) loggedIn.style.display = 'flex';
    if (anonymousFields) anonymousFields.style.display = 'none';

    if (authAvatar) {
      authAvatar.src = user.user_metadata?.avatar_url || '';
      authAvatar.alt = user.user_metadata?.full_name || user.email || '';
    }
    if (authName) {
      authName.textContent = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
    }
    if (adminBadge) {
      adminBadge.style.display = isAdmin(user) ? 'inline' : 'none';
    }
  } else {
    // 未登录
    if (loggedOut) loggedOut.style.display = 'flex';
    if (loggedIn) loggedIn.style.display = 'none';
    if (anonymousFields) anonymousFields.style.display = 'grid';
  }

  // 重新渲染评论列表以更新删除按钮
  if (reloadComments) loadComments();
}

const OAUTH_RETURN_KEY = "comment_oauth_return";
const OAUTH_RETURN_TTL = 10 * 60 * 1000;

function readOAuthReturn() {
  try {
    const raw = sessionStorage.getItem(OAUTH_RETURN_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { path?: string; createdAt?: number };
    if (
      typeof value.path !== "string" ||
      typeof value.createdAt !== "number" ||
      Date.now() - value.createdAt > OAUTH_RETURN_TTL
    ) {
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
      return null;
    }
    return value;
  } catch {
    try {
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
    } catch {
      // Ignore unavailable browser storage.
    }
    return null;
  }
}

function finishOAuthReturn(user: any) {
  const oauthReturn = readOAuthReturn();
  if (!oauthReturn) return;

  const currentUrl = new URL(window.location.href);
  const searchAuthError =
    currentUrl.searchParams.get("error_description") ||
    currentUrl.searchParams.get("error");
  ["code", "error", "error_code", "error_description"].forEach((key) => {
    currentUrl.searchParams.delete(key);
  });
  const currentPath = `${currentUrl.pathname}${currentUrl.search}`;
  if (oauthReturn.path !== currentPath) return;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const authError =
    searchAuthError ||
    hashParams.get("error_description") ||
    hashParams.get("error");

  if (!user) {
    if (authError) {
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
      const messageDiv = document.getElementById("form-message");
      if (messageDiv) {
        messageDiv.textContent = t("auth_error");
        messageDiv.className = "form-message error";
      }
    }
    return;
  }

  sessionStorage.removeItem(OAUTH_RETURN_KEY);
  requestAnimationFrame(() => {
    document.querySelector(".supabase-comments")?.scrollIntoView({
      behavior: "instant",
      block: "start",
    });
  });
}

// 处理回复操作
function handleReply(comment: Comment | null) {
  const parentIdInput = document.getElementById(
    "parent-id",
  ) as HTMLInputElement;
  const replyPreview = document.getElementById("reply-preview");
  const replyTarget = document.getElementById("reply-target");

  // 滚动到表单
  const formContainer = document.querySelector(".comment-form-container");

  if (!parentIdInput || !replyPreview || !replyTarget) return;

  if (comment) {
    const authorName = comment.author_name || "Anonymous";
    parentIdInput.value = comment.id;
    replyTarget.textContent = `${t("reply_to")}${authorName}`;
    replyPreview.style.display = "flex";
    formContainer?.scrollIntoView({ behavior: "smooth", block: "center" });

    // 保存父评论信息用于邮件通知
    currentReplyTo = {
      id: comment.id,
      name: authorName,
      email: comment.author_email || "",
      content: comment.content || "",
    };
  } else {
    parentIdInput.value = "";
    replyPreview.style.display = "none";
    currentReplyTo = null;
  }
}

// 加载评论
async function loadComments() {
  const translationKey = (
    document.getElementById("translation-key") as HTMLInputElement
  )?.value;
  if (!translationKey) {
    console.warn("No translation key found");
    return;
  }

  try {
    const comments = await getComments(translationKey);
    renderComments(comments);
  } catch (error) {
    console.error("Failed to load comments:", error);
    const commentsList = document.getElementById("comments-list");
    if (commentsList) {
      commentsList.innerHTML = `<div class="error-message">${t("load_error")}</div>`;
    }
  }
}

// 初始化函数
async function initComments() {
  // 避免重复注册认证状态监听
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  // 监听认证状态变化
  const authStateChangeResult = onAuthStateChange((user) => {
    updateAuthUI(user);
    finishOAuthReturn(user);
  });
  authSubscription = authStateChangeResult.data?.subscription || null;

  // getSession reads the persisted browser session and waits for Supabase's URL
  // grant recovery. getCurrentUser performs a network request, so using it as
  // the only source of truth made transient failures look like a signed-out
  // state and could miss the initial SIGNED_IN event.
  const session = await getSession();
  const user = session?.user || (await getCurrentUser());
  updateAuthUI(user, false);
  finishOAuthReturn(user);
  await loadComments();

  // OAuth 登录按钮
  const githubBtn = document.getElementById("btn-github");
  const googleBtn = document.getElementById("btn-google");
  const logoutBtn = document.getElementById("btn-logout");

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    const oauthButtons = [githubBtn, googleBtn].filter(
      (button): button is HTMLButtonElement => button instanceof HTMLButtonElement,
    );
    const messageDiv = document.getElementById("form-message");
    oauthButtons.forEach((button) => (button.disabled = true));

    try {
      await signInWithOAuth(provider);
    } catch (error) {
      console.error("OAuth sign-in failed:", error);
      oauthButtons.forEach((button) => (button.disabled = false));
      if (messageDiv) {
        messageDiv.textContent = t("auth_error");
        messageDiv.className = "form-message error";
      }
    }
  };

  if (githubBtn) {
    githubBtn.addEventListener("click", () => handleOAuthSignIn("github"));
  }
  if (googleBtn) {
    googleBtn.addEventListener("click", () => handleOAuthSignIn("google"));
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut();
      updateAuthUI(null);
    });
  }

  const commentsList = document.getElementById("comments-list");
  if (commentsList && commentsList.getAttribute("data-events-bound") !== "true") {
    commentsList.addEventListener("click", handleCommentsListClick);
    commentsList.setAttribute("data-events-bound", "true");
  }

  // 填充用户信息（仅匿名模式）
  const userInfo = getUserInfo();
  const nameInput = document.getElementById(
    "author-name",
  ) as HTMLInputElement;
  const emailInput = document.getElementById(
    "author-email",
  ) as HTMLInputElement;
  const websiteInput = document.getElementById(
    "author-website",
  ) as HTMLInputElement;
  const contentTextarea = document.getElementById(
    "comment-content",
  ) as HTMLTextAreaElement;

  if (nameInput && userInfo.name) nameInput.value = userInfo.name;
  if (emailInput && userInfo.email) emailInput.value = userInfo.email;
  if (websiteInput && userInfo.website) websiteInput.value = userInfo.website;
  if (websiteInput) {
    websiteInput.addEventListener("blur", () => {
      const normalized = normalizeWebsiteUrl(websiteInput.value);
      if (normalized) {
        websiteInput.value = normalized;
      }
    });
  }

  // 监听内容输入，更新字数统计
  if (contentTextarea) {
    contentTextarea.addEventListener("input", (e) => {
      const target = e.target as HTMLTextAreaElement;
      updateCharCount(target.value);
    });
    // 初始化字数显示
    updateCharCount(contentTextarea.value);
  }

  // 取消回复按钮
  const cancelBtn = document.getElementById("cancel-reply");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => handleReply(null));
  }

  // 表单提交
  const form = document.getElementById("comment-form") as HTMLFormElement;
  if (form) {
    let submitting = false; // 防重复提交标志

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // 防止重复提交
      if (submitting) return;

      const translationKey = (
        document.getElementById("translation-key") as HTMLInputElement
      ).value;

      // 根据登录状态获取用户信息
      let authorName: string;
      let authorEmail: string;
      let authorWebsite: string | undefined;
      let userId: string | undefined;
      let authorAvatar: string | undefined;

      if (currentUser) {
        // OAuth 用户
        authorName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Anonymous';
        authorEmail = currentUser.email || '';
        authorAvatar = currentUser.user_metadata?.avatar_url;
        userId = currentUser.id;
      } else {
        // 匿名用户
        authorName = (document.getElementById("author-name") as HTMLInputElement).value.trim();
        authorEmail = (document.getElementById("author-email") as HTMLInputElement).value.trim();
        authorWebsite = (document.getElementById("author-website") as HTMLInputElement).value.trim() || undefined;
      }

      const content = (
        document.getElementById("comment-content") as HTMLTextAreaElement
      ).value.trim();
      const parentId =
        (document.getElementById("parent-id") as HTMLInputElement).value ||
        undefined;

      const messageDiv = document.getElementById("form-message");
      const submitBtn = form.querySelector(".btn-submit") as HTMLButtonElement;
      const originalBtnText = submitBtn?.textContent || t("submit");
      if (!messageDiv || !submitBtn) return;

      // website 可选；有值时统一规范为 https/http URL
      if (authorWebsite) {
        const normalizedWebsite = normalizeWebsiteUrl(authorWebsite);
        if (!normalizedWebsite) {
          messageDiv.textContent = t("invalid_website");
          messageDiv.className = "form-message error";
          setTimeout(() => {
            messageDiv.textContent = "";
            messageDiv.className = "form-message";
          }, 2500);
          return;
        }
        authorWebsite = normalizedWebsite;
      }

      // 验证必填项（匿名用户需要填写名字和邮箱）
      if (!currentUser && (!authorName || !authorEmail)) {
        messageDiv.textContent = t("fill_required");
        messageDiv.className = "form-message error";
        setTimeout(() => {
          messageDiv.textContent = "";
          messageDiv.className = "form-message";
        }, 2000);
        return;
      }

      if (!content) {
        messageDiv.textContent = t("fill_required");
        messageDiv.className = "form-message error";
        setTimeout(() => {
          messageDiv.textContent = "";
          messageDiv.className = "form-message";
        }, 2000);
        return;
      }

      // 验证字数限制
      if (!isContentWithinLimit(content)) {
        messageDiv.textContent = t("too_long");
        messageDiv.className = "form-message error";
        setTimeout(() => {
          messageDiv.textContent = "";
          messageDiv.className = "form-message";
        }, 3000);
        return;
      }

      // 提交评论
      try {
        submitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = t("sending");

        const newComment = await submitComment(
          translationKey,
          authorName,
          authorEmail,
          content,
          authorWebsite,
          parentId,
          userId,
          authorAvatar,
        );

        // 匿名评论：保存到 localStorage 以便 5 分钟内删除
        if (!currentUser && newComment?.id) {
          saveLocalCommentId(newComment.id);
        }

        // 匿名用户：保存信息到 localStorage
        if (!currentUser) {
          saveUserInfo(authorName, authorEmail, authorWebsite || '');
        }

        // 发送邮件通知（异步，不阻塞）
        const commentData = { author_name: authorName, author_email: authorEmail, content };
        if (parentId && currentReplyTo) {
          // 回复通知
          sendNotification("reply", commentData, {
            name: currentReplyTo.name,
            email: currentReplyTo.email,
            content: currentReplyTo.content,
          });
        } else {
          // 新评论通知
          sendNotification("new_comment", commentData);
        }

        messageDiv.textContent = t("success");
        messageDiv.className = "form-message success";

        // 清空内容字段
        (
          document.getElementById("comment-content") as HTMLTextAreaElement
        ).value = "";
        updateCharCount(""); // 重置字数统计
        handleReply(null);

        // 重新加载评论列表
        await loadComments();

        setTimeout(() => {
          messageDiv.textContent = "";
          messageDiv.className = "form-message";
        }, 3000);
      } catch (error) {
        console.error("Failed to submit comment:", error);
        messageDiv.textContent = t("error");
        messageDiv.className = "form-message error";
        setTimeout(() => {
          messageDiv.textContent = "";
          messageDiv.className = "form-message";
        }, 3000);
      } finally {
        submitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
}

function cleanupComments() {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }
  const commentsList = document.getElementById("comments-list");
  if (commentsList) {
    commentsList.removeEventListener("click", handleCommentsListClick);
    commentsList.removeAttribute("data-events-bound");
  }
  commentStore.clear();
  pendingDeleteIds.clear();
}

function safeInitComments() {
  // 检查当前页面是否有评论组件
  const container = document.querySelector(".supabase-comments");
  if (!container) return;

  // 使用 data 属性标记是否已初始化，防止重复绑定事件
  if (container.getAttribute("data-initialized") === "true") {
    return;
  }
  container.setAttribute("data-initialized", "true");

  initComments();
}

export { safeInitComments, cleanupComments };
