// Heuristics complement (never replace) human review of the export diff.
export function sensitiveFindings(text, { authorFriend = false } = {}) {
  // Explicit user-approved public author links; no subdomains or arbitrary paths.
  if (authorFriend) text = text
    .replace(/https:\/\/moyuin\.top\/(?:avatar\.webp)?(?=["'\s<>]|$)/g, 'https://example.com/')
    .replace(/>moyuin\.top</g, '>example.com<'); // visible hostname on the friend card
  const patterns = [
    ['personal-service', /(?:[\w-]+\.)*moyuin\.top|ytmfsssu@gmail\.com|homelab-moyuin|cms\.moyuin\b/i],
    ['private-address', /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})\b/],
    ['local-user-path', /\/(?:Users|home)\/(?!example(?:\/|\b)|runner(?:\/|\b))[\w.-]+\//],
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['token', /\b(?:gh[pousr]_[A-Za-z0-9_]{25,}|github_pat_[A-Za-z0-9_]{25,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{25,})\b/],
    ['jwt', /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/],
    ['credential-literal', /\b(?:SUPABASE_SERVICE_ROLE_KEY|NOW_PLAYING_SECRET|RESEND_API_KEY|NOTIFY_SECRET|COMMENT_NOTIFY_SECRET|BESZEL_PASSWORD|KARAKEEP_API_KEY)\s*[:=]\s*["'][^"'\s]{8,}["']/],
  ];
  return patterns.filter(([, re]) => re.test(text)).map(([name]) => name);
}
