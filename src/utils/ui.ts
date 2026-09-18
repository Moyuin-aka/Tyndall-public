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
  nav_notes_url: string;
  nav_about: string;
  nav_about_url: string;
  about_title: string;
  about_slogan: string;
  nav_notes: string;
  notes_page_title: string;
  notes_hero_slogan: string;
  notes_intro: string;
  notes_back_to_notes: string;
  nav_lab: string;
  nav_lab_url: string;
  nav_friends: string;
  nav_friends_url: string;
  nav_more: string;
  friends_title: string;
  search_placeholder: string;
  search_no_results: string;
  search_results_count: string;
  nav_back_to_blog: string;
  post_prev: string;
  post_next: string;
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
    "introduction": "你好👋，欢迎来到 Tyndall 示例站点。在这里换上你自己的介绍与故事。",
    "home_title": "Your Name · 缥缈，游荡，没有来路与归处。",
    "nickname": "Your Name",
    "icon_email_title": "邮箱",
    "icon_github_title": "GitHub",
    "icon_twitter_title": "推特",
    "lab_title": "实验室 · Your Name",
    "blog_title": "博客 · Your Name",
    "theme_toggle_title": "切换明暗模式",
    "lang_toggle_title": "切换语言",
    "nav_home": "首页",
    "nav_home_url": "/",
    "nav_blog": "博客",
    "nav_notes_url": "/notes",
    "nav_about": "关于",
    "nav_about_url": "/about",
    "about_title": "关于 · Your Name",
    "about_slogan": "于此驻留",
    "nav_notes": "笔记",
    "notes_page_title": "笔记 · Your Name",
    "notes_hero_slogan": "学习记录",
    "notes_intro": "游荡者的思维锚点。",
    "notes_back_to_notes": "返回笔记",
    "nav_lab": "实验室",
    "nav_memos": "碎碎念",
    "nav_memos_url": "/memos",
    "nav_lab_url": "/lab",
    "nav_friends": "友链",
    "nav_friends_url": "/friends",
    "nav_more": "更多",
    "nav_travel": "旅迹",
    "nav_travel_url": "/travel",
    "friends_title": "友情链接 · Your Name",
    "search_placeholder": "搜索文章...",
    "search_no_results": "未找到匹配的文章",
    "search_results_count": "找到 {count} 篇文章",
    "album_desc": "音乐🎵为我标记了方向，于是我分享给了你。",
    "lab_desc": "生命在于折腾！",
    "nav_back_to_blog": "返回",
    "post_prev": "上一篇",
    "post_next": "下一篇",
    "post_not_translated": "当前文章暂未提供中文版，以下为原文显示。",
    "status_online": "在线",
    "status_offline": "离线",
    "status_unknown": "未知",
    "no_services": "未找到任何服务。",
    "load_error": "加载服务失败，请查看控制台获取更多信息。",
    "lab_heatmap_title": "写作节奏",
    "lab_heatmap_commits": "次提交",
    "lab_heatmap_active_days": "个活跃日",
    "lab_bookmarks_title": "最近收藏",
    "lab_bookmarks_empty": "还没有收藏内容。",
    "lab_servers_title": "服务器实况",
    "lab_servers_cpu": "CPU",
    "lab_servers_mem": "内存",
    "lab_servers_disk": "磁盘",
    "lab_services_title": "自建服务",
    "memos_page_title": "碎碎念 · Your Name",
    "memos_page_desc": "一些碎碎念",
    "memos_hero_slogan": "一些碎碎念",
    "memos_loading": "正在加载...",
    "memos_error_not_found": "没有找到任何内容。",
    "memos_error_failed": "加载失败，请查看控制台获取更多信息。",
    "archive_page_title": "归档 · Your Name",
    "archive_hero_subtitle": "ARCHIVE",
    "archive_hero_slogan": "文章归档",
    "blog_archive_tip": "进入",
    "blog_archive_link": "文章归档",
    "blog_archive_tip_suffix": "页面即可一览所有文章。",
    "comment_name": "昵称",
    "comment_email": "邮箱",
    "comment_website": "网站",
    "comment_required": "必填",
    "comment_optional": "选填",
    "comment_placeholder": "欢迎评论",
    "comment_cancel": "取消",
    "comment_submit": "发送",
    "comment_loading": "正在加载评论...",
    "comment_no_comments": "暂无评论",
    "comment_load_error": "加载失败",
    "comment_reply": "回复",
    "comment_reply_to": "回复 @{name}",
    "comment_sending": "发送中...",
    "comment_success": "发送成功",
    "comment_error": "发送失败，请稍后重试",
    "comment_fill_required": "请填写必填项",
    "comment_too_long": "评论内容超出限制（不超过 2000 字或 1000 单词）",
    "comment_time_just_now": "刚刚",
    "comment_time_minutes": "{n}分钟前",
    "comment_time_hours": "{n}小时前",
    "comment_time_days": "{n}天前",
    "comment_time_months": "{n}个月前",
    "comment_time_years": "{n}年前",
    "comment_login_hint": "使用以下方式登录，或匿名评论",
    "comment_logout": "登出",
    "comment_admin": "管理员",
    "comment_delete": "删除",
    "comment_delete_confirm": "确定要删除这条评论吗？",
    "comment_delete_success": "已删除",
    "comment_delete_error": "删除失败",
    "comment_delete_expired": "删除时间已过期",
    "travel_page_title": "旅迹 · Your Name",
    "travel_title": "旅迹",
    "travel_desc": "将光阴沿途折叠，左边是定格的风物，右边是流动的悲欢。",
    "travel_hint": "纵向翻阅岁月，横向摩挲过往的每一瞬光影。",
    "services": {
      "memos": { "desc": "一个轻量级的、自托管的备忘录中心。" },
      "rsshub": { "desc": "为万物生成 RSS 订阅源。" },
      "picoshare": { "desc": "一个极简主义的、自托管的文件共享服务。" },
      "cloudreve": { "desc": "一个自托管的云盘和文件管理系统。" },
      "lsky_pro": { "desc": "一个功能强大且易于使用的图床系统。" },
      "minio": { "desc": "高性能、兼容 S3 的对象存储。" },
      "beszel": { "desc": "一个轻量化的自托管服务器监控面板。" },
      "nezha_monitor": { "desc": "一个自托管的服务器状态和监控仪表盘。" },
      "umami": { "desc": "一个简单的、注重隐私的网络分析解决方案。" },
      "syncthing": { "desc": "一个持续的文件同步程序。" },
      "it_tools": { "desc": "一个实用的 IT 工具合集。" },
      "nextcloud": { "desc": "一个功能丰富的自托管云盘和在线协作平台。" },
      "calibre_web": { "desc": "用于管理和阅读电子书的 Web 界面。" },
      "openlist": { "desc": "本地和云存储的统一文件列表，支持多盘挂载和管理。" },
      "open_webui": { "desc": "基于浏览器的聊天界面，用于运行本地/远程 LLM。" },
      "mileage": { "desc": "长期主义资产成本追踪器。" },
      "karakeep": { "desc": "带 AI 标签的自托管全能收藏工具。" }

    },
    "categories": {
      "Tools": "工具",
      "Storage": "存储",
      "DevOps": "运维",
      "Admin": "管理"
    },
    "categories_page_title": "分类 · Your Name",
    "categories_hero_subtitle": "CATEGORIES",
    "categories_hero_slogan": "主题浏览",
    "category_posts_count": "篇文章",
    "nav_categories": "分类",
    "nav_categories_url": "/categories",
    "toc_title": "目录",
    "404_title": "404 · Your Name",
    "404_heading": "404 NOT FOUND",
    "404_message": "抱歉，您访问的页面不存在。",
    "404_back_home": "返回主页"
  },
  en: {
    "index_text": "A place to jot down my thoughts.",
    "Manifesto": "Floating Or Hovering.",
    "introduction": "Hello 👋, welcome to this example Tyndall site. Replace this introduction with your own story.",
    "home_title": "Your Name · Floating Or Hovering.",
    "nickname": "Your Name",
    "icon_email_title": "Email",
    "icon_github_title": "GitHub",
    "icon_twitter_title": "Twitter/X",
    "lab_title": "Lab · Your Name",
    "blog_title": "Blog · Your Name",
    "theme_toggle_title": "Toggle light/dark mode",
    "lang_toggle_title": "Switch Language",
    "nav_home": "Home",
    "nav_home_url": "/en/",
    "nav_blog": "Blog",
    "nav_notes_url": "/en/notes",
    "nav_about": "About",
    "nav_about_url": "/en/about",
    "about_title": "About · Your Name",
    "about_slogan": "About This Wandering Space",
    "nav_notes": "Notes",
    "notes_page_title": "Notes · Your Name",
    "notes_hero_slogan": "Learning Notes",
    "notes_intro": "Anchors of a Wanderer's Mind.",
    "notes_back_to_notes": "Back to Notes",
    "nav_lab": "Lab",
    "nav_memos": "Memos",
    "nav_memos_url": "/en/memos",
    "nav_lab_url": "/en/lab",
    "nav_friends": "Friends",
    "nav_friends_url": "/en/friends",
    "nav_more": "More",
    "nav_travel": "Journey",
    "nav_travel_url": "/en/travel",
    "friends_title": "Friends · Your Name",
    "search_placeholder": "Search posts...",
    "search_no_results": "No matching posts found",
    "search_results_count": "Found {count} posts",
    "album_desc": "The melody 🎵 marked my direction, and so I shared it with you.",
    "lab_desc": "Life is About Exploring!",
    "nav_back_to_blog": "Back",
    "post_prev": "Previous Post",
    "post_next": "Next Post",
    "post_not_translated": "This post is not yet available in English. Showing the original version.",
    "status_online": "Online",
    "status_offline": "Offline",
    "status_unknown": "Unknown",
    "no_services": "No services found.",
    "load_error": "Failed to load services. Please check the console for details.",
    "lab_heatmap_title": "Writing Rhythm",
    "lab_heatmap_commits": "commits",
    "lab_heatmap_active_days": "active days",
    "lab_bookmarks_title": "Recent Bookmarks",
    "lab_bookmarks_empty": "No bookmarks yet.",
    "lab_servers_title": "Server Vitals",
    "lab_servers_cpu": "CPU",
    "lab_servers_mem": "Mem",
    "lab_servers_disk": "Disk",
    "lab_services_title": "Self-Hosted Services",
    "memos_page_title": "Memos · Your Name",
    "memos_page_desc": "Some Silent thoughts.",
    "memos_hero_slogan": "Some Silent thoughts.",
    "memos_loading": "Loading Memos...",
    "memos_error_not_found": "No memos found.",
    "memos_error_failed": "Failed to load memos. Please see console for details.",
    "archive_page_title": "Archive · Your Name",
    "archive_hero_subtitle": "ARCHIVE",
    "archive_hero_slogan": "Archive",
    "blog_archive_tip": "Visit the",
    "blog_archive_link": "Archive",
    "blog_archive_tip_suffix": "page to view all posts.",
    "comment_name": "Name",
    "comment_email": "Email",
    "comment_website": "Website",
    "comment_required": "Required",
    "comment_optional": "Optional",
    "comment_placeholder": "Leave a comment",
    "comment_cancel": "Cancel",
    "comment_submit": "Send",
    "comment_loading": "Loading comments...",
    "comment_no_comments": "No comments yet",
    "comment_load_error": "Failed to load",
    "comment_reply": "Reply",
    "comment_reply_to": "Reply to @{name}",
    "comment_sending": "Sending...",
    "comment_success": "Sent successfully",
    "comment_error": "Failed to send, please try again",
    "comment_fill_required": "Please fill in required fields",
    "comment_too_long": "Comment too long (max 2000 chars or 1000 words)",
    "comment_time_just_now": "just now",
    "comment_time_minutes": "{n} minutes ago",
    "comment_time_hours": "{n} hours ago",
    "comment_time_days": "{n} days ago",
    "comment_time_months": "{n} months ago",
    "comment_time_years": "{n} years ago",
    "comment_login_hint": "Sign in with, or comment anonymously",
    "comment_logout": "Sign out",
    "comment_admin": "Admin",
    "comment_delete": "Delete",
    "comment_delete_confirm": "Are you sure you want to delete this comment?",
    "comment_delete_success": "Deleted",
    "comment_delete_error": "Failed to delete",
    "comment_delete_expired": "Delete window expired",
    "travel_page_title": "Journey · Your Name",
    "travel_title": "Journey",
    "travel_desc": "Folding time along the way: still sceneries on the left, flowing silhouettes on the right.",
    "travel_hint": "Scroll vertically through the years, and swipe horizontally to touch the passed shadows.",
    "services": {
      "memos": { "desc": "A lightweight, self-hosted memo hub." },
      "rsshub": { "desc": "Generate RSS feeds for everything." },
      "picoshare": { "desc": "A minimalist, self-hosted file sharing service." },
      "cloudreve": { "desc": "A self-hosted cloud drive and file management system." },
      "lsky_pro": { "desc": "A powerful and easy-to-use image hosting system." },
      "minio": { "desc": "High-performance, S3 compatible object storage." },
      "beszel": { "desc": "A lightweight self-hosted server monitoring dashboard." },
      "nezha_monitor": { "desc": "A self-hosted server status and monitoring dashboard." },
      "umami": { "desc": "A simple, privacy-focused web analytics solution." },
      "syncthing": { "desc": "A continuous file synchronization program." },
      "it_tools": { "desc": "A collection of useful IT tools." },
      "nextcloud": { "desc": "A feature-rich self-hosted cloud storage and online collaboration platform." },
      "calibre_web": { "desc": "A web UI for managing and reading ebooks." },
      "openlist": { "desc": "Unified file list for local and cloud storage, supporting multi-drive mounting and management." },
      "open_webui": { "desc": "A browser-based chat UI for running local/remote LLMs." },
      "mileage": { "desc": "A long-termism asset cost tracker." },
      "karakeep": { "desc": "Self-hosted bookmark-everything app with AI tagging." }

    },
    "categories": {
      "Tools": "Tools",
      "Storage": "Storage",
      "DevOps": "DevOps",
      "Admin": "Admin"
    },
    "categories_page_title": "Categories · Your Name",
    "categories_hero_subtitle": "CATEGORIES",
    "categories_hero_slogan": "Browse by Topic",
    "category_posts_count": "posts",
    "nav_categories": "Categories",
    "nav_categories_url": "/en/categories",
    "toc_title": "Table of Contents",
    "404_title": "404 · Your Name",
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
