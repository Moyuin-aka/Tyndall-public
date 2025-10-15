interface ServiceTranslation {
  desc: string;
}

interface CategoryTranslation {
  [key: string]: string;
}

interface TranslationSchema {
  home_title: string;
  nickname: string;
  icon_email_title: string;
  icon_github_title: string;
  icon_twitter_title: string;
  title: string;
  theme_toggle_title: string;
  lang_toggle_title: string;
  nav_home: string;
  nav_home_url: string;
  nav_blog: string;
  nav_about: string;
  nav_about_url: string;
  about_title: string;
  about_slogan: string;
  nav_notes: string;
  nav_lab: string;
  nav_lab_url: string;
  nav_friends: string;
  nav_friends_url: string;
  nav_more: string;
  friends_title: string;
  search_placeholder: string;
  search_no_results: string;
  search_results_count: string;
  post_not_translated: string;
  status_online: string;
  status_offline: string;
  status_unknown: string;
  no_services: string;
  load_error: string;
  services: {
    [serviceName: string]: ServiceTranslation;
  };
  categories: CategoryTranslation;
}

interface Translations {
  zh: TranslationSchema;
  en: TranslationSchema;
}

const translations = {
    zh: {
  "index_text": "一个随笔记录的地方。",
  "Manifesto": "缥缈，游荡，没有来路与归处。",
  "introduction": "你好👋，我是 You。",
  "home_title": "Your Blog Name · 缥缈，游荡，没有来路与归处。",
  "nickname": "Your Name",
  "icon_email_title": "邮箱",
  "icon_github_title": "GitHub",
  "icon_twitter_title": "推特",
  "lab_title": "实验室 · Your Blog Name",
  "blog_title": "博客 · Your Blog Name",
  "theme_toggle_title": "切换明暗模式",
  "lang_toggle_title": "切换语言",
  "nav_home": "首页",
  "nav_home_url": "/",
  "nav_blog": "博客",
  "nav_about": "关于",
  "nav_about_url": "/about",
  "about_title": "关于 · Your Blog Name",
  "about_slogan": "关于",
  "nav_notes": "笔记",
  "nav_lab": "实验室",
  "nav_memos": "碎碎念",
  "nav_memos_url": "/memos",
  "nav_lab_url": "/lab",
  "nav_friends": "友链",
  "nav_friends_url": "/friends",
  "nav_more": "更多",
  "friends_title": "友情链接 · Your Blog Name",
  "search_placeholder": "搜索文章...",
  "search_no_results": "未找到匹配的文章",
  "search_results_count": "找到 {count} 篇文章",
  "album_desc":"音乐🎵为我标记了方向，于是我分享给了你。",
  "lab_desc": "生命在于折腾！",
  "post_not_translated": "当前文章暂未提供中文版，以下为原文显示。",
  "status_online": "在线",
  "status_offline": "离线",
  "status_unknown": "未知",
  "no_services": "未找到任何服务。",
  "load_error": "加载服务失败，请查看控制台获取更多信息。",
  "memos_page_title": "碎碎念 · Your Blog Name",
  "memos_page_desc": "一些碎碎念",
  "memos_hero_slogan": "一些碎碎念",
  "memos_loading": "正在加载...",
  "memos_error_not_found": "没有找到任何内容。",
  "memos_error_failed": "加载失败，请查看控制台获取更多信息。",
  "archive_page_title": "归档 · Your Blog Name",
  "archive_hero_subtitle": "ARCHIVE",
  "archive_hero_slogan": "文章归档",
  "blog_archive_tip": "进入",
  "blog_archive_link": "文章归档",
  "blog_archive_tip_suffix": "页面即可一览所有文章。",
  "services": {
    "memos": { "desc": "一个轻量级的、自托管的备忘录中心。" },
    "rsshub": { "desc": "为万物生成 RSS 订阅源。" },
    "picoshare": { "desc": "一个极简主义的、自托管的文件共享服务。" },
    "cloudreve": { "desc": "一个自托管的云盘和文件管理系统。" },
    "lsky_pro": { "desc": "一个功能强大且易于使用的图床系统。" },
    "minio": { "desc": "高性能、兼容 S3 的对象存储。" },
    "nezha_monitor": { "desc": "一个自托管的服务器状态和监控仪表盘。" },
    "umami": { "desc": "一个简单的、注重隐私的网络分析解决方案。" },
    "syncthing": { "desc": "一个持续的文件同步程序。" },
    "it_tools": { "desc": "一个实用的 IT 工具合集。" },
    "nextcloud": { "desc": "一个功能丰富的自托管云盘和在线协作平台。" }
  },
  "categories": {
    "Tools": "工具",
    "Storage": "存储",
    "DevOps": "运维",
    "Admin": "管理"
  },
  "categories_page_title": "分类 · Your Blog Name",
  "categories_hero_subtitle": "CATEGORIES",
  "categories_hero_slogan": "主题浏览",
  "category_posts_count": "篇文章",
  "nav_categories": "分类",
  "nav_categories_url": "/categories",
  "toc_title": "目录",
  "404_title": "404 · Moyuin",
  "404_heading": "404 NOT FOUND",
  "404_message": "抱歉，您访问的页面不存在。",
  "404_back_home": "返回主页"
},
en: {
  "index_text": "A place to jot down my thoughts.",
  "Manifesto": "Floating Or Hovering.",
  "introduction": "Hello 👋, I'm You.",
  "home_title": "Your Blog Name · Floating Or Hovering.",
  "nickname": "Your Name",
  "icon_email_title": "Email",
  "icon_github_title": "GitHub",
  "icon_twitter_title": "Twitter/X",
  "lab_title": "Lab · Your Blog Name",
  "blog_title": "Blog · Your Blog Name",
  "theme_toggle_title": "Toggle light/dark mode",
  "lang_toggle_title": "Switch Language",
  "nav_home": "Home",
  "nav_home_url": "/en/",
  "nav_blog": "Blog",
  "nav_about": "About",
  "nav_about_url": "/en/about",
  "about_title": "About · Your Blog Name",
  "about_slogan": "About This Wandering Space",
  "nav_notes": "Notes",
  "nav_lab": "Lab",
  "nav_memos": "Memos",
  "nav_memos_url": "/en/memos",
  "nav_lab_url": "/en/lab",
  "nav_friends": "Friends",
  "nav_friends_url": "/en/friends",
  "nav_more": "More",
  "friends_title": "Friends · Your Blog Name",
  "search_placeholder": "Search posts...",
  "search_no_results": "No matching posts found",
  "search_results_count": "Found {count} posts",
  "album_desc": "The melody 🎵 marked my direction, and so I shared it with you.",
  "lab_desc": "Life is About Exploring!",
  "post_not_translated": "This post is not yet available in English. Showing the original version.",
  "status_online": "Online",
  "status_offline": "Offline",
  "status_unknown": "Unknown",
  "no_services": "No services found.",
  "load_error": "Failed to load services. Please check the console for details.",
  "memos_page_title": "Memos · Your Blog Name",
  "memos_page_desc": "Some Silent thoughts.",
  "memos_hero_slogan": "Some Silent thoughts.",
  "memos_loading": "Loading Memos...",
  "memos_error_not_found": "No memos found.",
  "memos_error_failed": "Failed to load memos. Please see console for details.",
  "archive_page_title": "Archive · Your Blog Name",
  "archive_hero_subtitle": "ARCHIVE",
  "archive_hero_slogan": "Archive",
  "blog_archive_tip": "Visit the",
  "blog_archive_link": "Archive",
  "blog_archive_tip_suffix": "page to view all posts.",
  "services": {
    "memos": { "desc": "A lightweight, self-hosted memo hub." },
    "rsshub": { "desc": "Generate RSS feeds for everything." },
    "picoshare": { "desc": "A minimalist, self-hosted file sharing service." },
    "cloudreve": { "desc": "A self-hosted cloud drive and file management system." },
    "lsky_pro": { "desc": "A powerful and easy-to-use image hosting system." },
    "minio": { "desc": "High-performance, S3 compatible object storage." },
    "nezha_monitor": { "desc": "A self-hosted server status and monitoring dashboard." },
    "umami": { "desc": "A simple, privacy-focused web analytics solution." },
    "syncthing": { "desc": "A continuous file synchronization program." },
    "it_tools": { "desc": "A collection of useful IT tools." },
    "nextcloud": { "desc": "A feature-rich self-hosted cloud storage and online collaboration platform." }

  },
  "categories": {
    "Tools": "Tools",
    "Storage": "Storage",
    "DevOps": "DevOps",
    "Admin": "Admin"
  },
  "categories_page_title": "Categories · Your Blog Name",
  "categories_hero_subtitle": "CATEGORIES",
  "categories_hero_slogan": "Browse by Topic",
  "category_posts_count": "posts",
  "nav_categories": "Categories",
  "nav_categories_url": "/en/categories",
  "toc_title": "Table of Contents",
  "404_title": "404 · Moyuin",
  "404_heading": "404 NOT FOUND",
  "404_message": "Sorry, the page you're looking for doesn't exist.",
  "404_back_home": "Back to Home"
}
};
export const defaultLocale: keyof Translations = 'zh';
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return path;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function useTranslations(locale: string | undefined) {
  const lang: keyof Translations = (locale === 'en' || locale === 'zh') ? locale : defaultLocale;

  return function t(key: string, params?: Record<string, string>): string {
    const value = getNestedValue(translations[lang], key) || getNestedValue(translations[defaultLocale], key) || key;

    if (params) {
        return Object.entries(params).reduce((acc, [paramKey, paramValue]) => 
            acc.replace(`\${${paramKey}}`, paramValue), value as string);
    }

    return value as string;
  }
}