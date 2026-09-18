// Shared Apple Music helpers.
//
// One source of truth for turning a public `music.apple.com` link into an
// embeddable `embed.music.apple.com` URL. Used by both the AppleMusicEmbed
// Astro component and the `::apple-music` remark directive, so the parsing
// rules never drift between "in a post" and "on the homepage".

/**
 * Parse a public Apple Music URL.
 *
 * Accepts the shapes Apple hands out from the Share menu / iTunes API:
 *   https://music.apple.com/us/album/<slug>/<id>
 *   https://music.apple.com/us/album/<slug>/<id>?i=<trackId>   (a single song)
 *   https://music.apple.com/us/playlist/<slug>/<pl.id>
 *   https://music.apple.com/us/song/<slug>/<id>
 *
 * @param {string} url
 * @returns {{ storefront: string, kind: string, id: string, trackId: string|null } | null}
 */
export function parseAppleMusicUrl(url) {
  if (!url || typeof url !== "string") return null;
  let u;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)music\.apple\.com$/.test(u.hostname)) return null;

  // Path looks like: /<storefront>/<kind>/<slug>/<id>
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 3) return null;

  const [storefront, kind] = parts;
  const id = parts[parts.length - 1];
  const trackId = u.searchParams.get("i");

  if (!/^[a-z]{2}$/i.test(storefront)) return null;
  if (!id) return null;

  return { storefront, kind, id, trackId };
}

/**
 * Build the `embed.music.apple.com` URL for a given public Apple Music URL.
 * Preserves the storefront, path, and the `?i=` track selector if present.
 *
 * @param {string} url
 * @returns {string|null} embeddable URL, or null if the input isn't recognised
 */
export function toAppleMusicEmbedUrl(url) {
  const parsed = parseAppleMusicUrl(url);
  if (!parsed) return null;
  try {
    const u = new URL(url.trim());
    u.hostname = "embed.music.apple.com";
    // The embed player only needs the track selector; drop tracking params
    // like `uo` / `app` that the Share / iTunes links carry along.
    const i = u.searchParams.get("i");
    u.search = "";
    if (i) u.searchParams.set("i", i);
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Sensible default iframe height for a given embed.
 * A single song is a compact strip; albums / playlists get the tall player.
 *
 * @param {string} url  public Apple Music URL
 * @returns {number} height in px
 */
export function defaultEmbedHeight(url) {
  const parsed = parseAppleMusicUrl(url);
  if (parsed && (parsed.trackId || parsed.kind === "song")) return 175;
  return 450;
}
