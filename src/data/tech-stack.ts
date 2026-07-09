export interface TechStackItem {
  name: string;
  src: string;
  href: string;
  external?: boolean;
}

export const techStackItems: TechStackItem[] = [
  // 👨‍💻 Languages
  { name: "C++", src: "/svg/tech/cplusplus.svg", href: "https://isocpp.org/" },
  { name: "Python", src: "/svg/tech/python.svg", href: "https://www.python.org/" },
  { name: "Rust", src: "/svg/tech/rust.svg", href: "https://www.rust-lang.org/" },
  {
    name: "JavaScript",
    src: "/svg/tech/javascript.svg",
    href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  },
  {
    name: "TypeScript",
    src: "/svg/tech/typescript.svg",
    href: "https://developer.mozilla.org/en-US/docs/Glossary/TypeScript",
  },
  { name: "PHP", src: "/svg/tech/php.svg", href: "https://www.php.net/" },
  { name: "Swift", src: "/svg/tech/swift.svg", href: "https://swift.org/" },

  // 🌐 Frontend & Frameworks
  {
    name: "HTML5",
    src: "/svg/tech/html5.svg",
    href: "https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5",
  },
  {
    name: "CSS3",
    src: "/svg/tech/css.svg",
    href: "https://developer.mozilla.org/en-US/docs/Web/CSS",
  },
  { name: "React", src: "/svg/tech/react.svg", href: "https://react.dev/" },
  { name: "Vite", src: "/svg/tech/vite.svg", href: "https://vite.dev/" },
  { name: "Next.js", src: "/svg/tech/nextdotjs.svg", href: "https://nextjs.org/" },
  { name: "Hexo", src: "/svg/tech/hexo.svg", href: "https://hexo.io/" },
  { name: "Typecho", src: "/svg/tech/typecho.svg", href: "https://typecho.org/" },
  { name: "Astro", src: "/svg/tech/astro.svg", href: "https://astro.build/" },
  { name: "Tauri", src: "/svg/tech/tauri.svg", href: "https://tauri.app/" },

  // 🗄️ Backend & Databases
  { name: "Hono", src: "/svg/tech/hono.svg", href: "https://hono.dev/" },
  {
    name: "PostgreSQL",
    src: "/svg/tech/postgresql.svg",
    href: "https://www.postgresql.org/",
  },
  { name: "MySQL", src: "/svg/tech/mysql.svg", href: "https://www.mysql.com/" },
  { name: "MongoDB", src: "/svg/tech/mongodb.svg", href: "https://www.mongodb.com/" },
  { name: "Redis", src: "/svg/tech/redis.svg", href: "https://redis.io/" },
  { name: "SQLite", src: "/svg/tech/sqlite.svg", href: "https://www.sqlite.org/" },
  { name: "Supabase", src: "/svg/tech/supabase.svg", href: "https://supabase.com/" },

  // ☁️ Cloud & DevOps
  { name: "Docker", src: "/svg/tech/docker.svg", href: "https://www.docker.com/" },
  { name: "Kubernetes", src: "/svg/tech/kubernetes.svg", href: "https://kubernetes.io/" },
  {
    name: "GitHub Actions",
    src: "/svg/tech/githubactions.svg",
    href: "https://github.com/features/actions",
  },
  { name: "Vercel", src: "/svg/tech/vercel.svg", href: "https://vercel.com/" },
  { name: "Caddy", src: "/svg/tech/caddy.svg", href: "https://caddyserver.com/" },
  {
    name: "Cloudflare Tunnel",
    src: "/svg/tech/cloudflare.svg",
    href: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/",
  },

  // 📡 Networking & Security
  { name: "Kali Linux", src: "/svg/tech/kalilinux.svg", href: "https://www.kali.org/" },
  {
    name: "Burp Suite",
    src: "/svg/tech/burpsuite.svg",
    href: "https://portswigger.net/burp",
  },
  {
    name: "Sqlmap",
    src: "/svg/misc/database-search.svg",
    external: true,
    href: "https://sqlmap.org/",
  },
  { name: "Nmap", src: "/svg/misc/radar.svg", external: true, href: "https://nmap.org/" },
  {
    name: "Wireshark",
    src: "/svg/tech/wireshark.svg",
    href: "https://wireshark.com/",
  },
  {
    name: "OWASP",
    src: "/svg/tech/owasp.svg",
    href: "https://owasp.org/",
  },
  {
    name: "WireGuard",
    src: "/svg/tech/wireguard.svg",
    href: "https://www.wireguard.com/",
  },
  {
    name: "Tailscale",
    src: "/svg/tech/tailscale.svg",
    href: "https://tailscale.com/",
  },
  {
    name: "OpenWrt",
    src: "/svg/tech/openwrt.svg",
    href: "https://openwrt.org/",
  },
  {
    name: "Padavan",
    src: "/svg/misc/outline-router.svg",
    external: true,
    href: "https://bitbucket.org/padavan/rt-n56u/",
  },
  {
    name: "Xray",
    src: "/svg/misc/star-four-points.svg",
    external: true,
    href: "https://github.com/XTLS/Xray-core",
  },
  {
    name: "Sing-box",
    src: "/svg/misc/sing-box.svg",
    external: true,
    href: "https://sing-box.sagernet.org/",
  },
  {
    name: "Hysteria 2",
    src: "/svg/misc/hysteria2.svg",
    external: true,
    href: "https://v2.hysteria.network/zh/",
  },
  {
    name: "IPv6 Ready",
    src: "/svg/misc/ip-network-outline.svg",
    external: true,
    href: "https://ipv6.com/",
  },

  // 📶 RFID / NFC
  {
    name: "NFC (PN532)",
    src: "/svg/misc/nfc.svg",
    external: true,
    href: "https://www.nxp.com/products/NFC-PN532",
  },
];
