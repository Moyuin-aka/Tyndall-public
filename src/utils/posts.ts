import type { CollectionEntry } from 'astro:content';

const DEFAULT_LOCALE = 'zh';

const stripLangPrefix = (slug: string) => slug.replace(/^en\//, '');

export const getTranslationKey = (post: CollectionEntry<'blog'>) =>
  post.data.translationKey ?? stripLangPrefix(post.slug);

type Bucket = {
  first?: CollectionEntry<'blog'>;
  preferred?: CollectionEntry<'blog'>;
  fallback?: CollectionEntry<'blog'>;
};

const buildBuckets = (
  posts: CollectionEntry<'blog'>[],
  preferredLocale: string,
  fallbackLocale = DEFAULT_LOCALE
) => {
  const byKey = new Map<string, Bucket>();
  for (const post of posts) {
    const key = getTranslationKey(post);
    const bucket = byKey.get(key) ?? {};
    if (!bucket.first) bucket.first = post;
    if (post.data.lang === preferredLocale) bucket.preferred = post;
    if (post.data.lang === fallbackLocale && !bucket.fallback) bucket.fallback = post;
    byKey.set(key, bucket);
  }
  return byKey;
};

export const resolvePostForLocale = (
  posts: CollectionEntry<'blog'>[],
  key: string,
  preferredLocale: string,
  fallbackLocale = DEFAULT_LOCALE
) => {
  const bucket = buildBuckets(posts, preferredLocale, fallbackLocale).get(key);
  if (!bucket) return { post: null, isFallback: false };
  const post = bucket.preferred ?? bucket.fallback ?? bucket.first ?? null;
  const isFallback = !!post && post.data.lang !== preferredLocale;
  return { post, isFallback };
};

export const localizePosts = (
  posts: CollectionEntry<'blog'>[],
  preferredLocale: string,
  fallbackLocale = DEFAULT_LOCALE
) => {
  const byKey = buildBuckets(posts, preferredLocale, fallbackLocale);
  return Array.from(byKey.entries())
    .map(([key, bucket]) => {
      const post = bucket.preferred ?? bucket.fallback ?? bucket.first;
      if (!post) return null;
      return { key, post, isFallback: post.data.lang !== preferredLocale };
    })
    .filter(Boolean) as { key: string; post: CollectionEntry<'blog'>; isFallback: boolean }[];
};

export const sortByPubDateDesc = (
  items: { post: CollectionEntry<'blog'> }[]
) => items.sort((a, b) => b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf());
