import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// 配置 marked 选项
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 清理 XML 中的非法字符
function sanitizeXmlContent(str) {
  if (!str) return '';
  // 移除 XML 非法字符 (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F)
  return str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
}

// 将 Markdown 转换为 HTML 并清理
function markdownToHtml(markdown) {
  if (!markdown) return '';
  
  // 将 Markdown 转换为 HTML
  const rawHtml = marked(markdown);
  
  // 清理 HTML，只保留安全的标签和属性
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'pre', 'code', 'blockquote', 'hr', 'table', 'thead', 
      'tbody', 'tr', 'th', 'td', 'del', 'ins', 'sup', 'sub'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height'],
      a: ['href', 'title', 'target', 'rel'],
      code: ['class'],
      pre: ['class'],
      '*': ['id', 'class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  });
  
  return sanitizeXmlContent(cleanHtml);
}

export async function GET(context) {
  const blog = await getCollection('blog', ({ data }) => {
    // 只包含已发布的文章
    return data.published !== false;
  });
  
  // 过滤出英文文章(lang === 'en')
  const enPosts = blog
    .filter(post => post.data.lang === 'en')
    // 按发布日期降序排序(最新的在前)
    .sort((a, b) => new Date(b.data.pubDate) - new Date(a.data.pubDate));
  
  // 获取最新文章的发布日期作为 lastBuildDate
  const lastBuildDate = enPosts.length > 0 ? enPosts[0].data.pubDate : new Date();
  
  return rss({
    title: "Moyuin",
    description: 'Floating or Hovering, with no origin and no destination.',
    site: context.site,
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
      dc: 'http://purl.org/dc/elements/1.1/',
      atom: 'http://www.w3.org/2005/Atom',
      slash: 'http://purl.org/rss/1.0/modules/slash/',
    },
    items: enPosts.map((post) => {
      // 使用 translationKey 或 slug 生成链接
      const linkSlug = post.data.translationKey || post.slug.replace('en/', '');
      
      return {
        title: sanitizeXmlContent(post.data.title),
        description: sanitizeXmlContent(post.data.description || ''),
        content: markdownToHtml(post.body),
        pubDate: post.data.pubDate,
        link: `/en/blog/${linkSlug}/`,
        categories: post.data.category ? [post.data.category] : [],
        author: 'Moyuin - en',
        customData: `<dc:creator>Moyuin</dc:creator>
        <slash:comments>0</slash:comments>`,
      };
    }),
    customData: `<language>en-us</language>
    <atom:link href="${context.site}en/rss.xml" rel="self" type="application/rss+xml" />
    <copyright><![CDATA[© ${new Date().getFullYear()} Moyuin. All rights reserved.]]></copyright>
    <webMaster>me@moyuin.top</webMaster>
    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
    <pubDate>${lastBuildDate.toUTCString()}</pubDate>
    <generator><![CDATA[Astro Feed Generator (Modified by Moyuin)]]></generator>`,
    
  });
}
