// "现在在做" config — drives the Now card in the bento grid.

export type NowKind = 'game' | 'reading' | 'video' | 'music' | 'browsing' | 'coding' | 'vibe' | 'writing' | 'ai' | 'other';

/**
 * Manual poster OVERRIDES, by game name. Posters are normally resolved
 * automatically from SteamGridDB (and cached), so this is only for cases where
 * you want a specific image: the value can be a remote URL or a path under
 * `public/` (e.g. '/games/totk.jpg'). A manual entry takes precedence over the
 * auto-resolved poster. Keep the key EXACTLY equal to what the Shortcut sends.
 */
export const gamePosters: Record<string, string> = {
  // '塞尔达传说：王国之泪': '/games/totk.jpg',
};

/** Per-kind verb + fallback icon (used when no poster/thumbnail is available). */
export const kindMeta: Record<NowKind, { zh: string; en: string; icon: string }> = {
  game: { zh: '正在玩', en: 'Playing', icon: '🎮' },
  reading: { zh: '刚刚在读', en: 'Reading', icon: '📖' },
  video: { zh: '在看', en: 'Watching', icon: '📺' },
  music: { zh: '在听', en: 'Listening', icon: '🎧' },
  browsing: { zh: '在刷', en: 'Scrolling', icon: '📱' },
  coding: { zh: '正在写代码', en: 'Coding', icon: '⌨️' },
  vibe: { zh: 'Vibe Coding', en: 'Vibe Coding', icon: '✦' },
  writing: { zh: '正在写作', en: 'Writing', icon: '✍️' },
  ai: { zh: '与 AI 聊天', en: 'Thinking with AI', icon: '💭' },
  other: { zh: '现在', en: 'Now', icon: '🌐' },
};

/**
 * App name → icon for the "browsing" kind (when you just open an app). The key
 * must match what the Shortcut sends as `title`. Tweak emojis freely.
 */
export const appIcons: Record<string, string> = {
  小红书: '📕',
  知乎: '💬',
  B站: '📺',
  哔哩哔哩: '📺',
  微博: '🟠',
  推特: '🐦',
  Twitter: '🐦',
  X: '🐦',
};

/** A single "what I'm doing now" item, normalized from whatever the source is. */
export interface NowItem {
  kind: NowKind;
  title: string;
  /** e.g. 小红书 / 知乎 / B站 / Switch — shown as the source. */
  source?: string;
  /** Optional link to the content (reading/video). */
  url?: string;
  /** Optional thumbnail/poster URL (overrides the game-poster lookup). */
  image?: string;
  updated_at?: string | null;
  startedAt?: string | null;
}
