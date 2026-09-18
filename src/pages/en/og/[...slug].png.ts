import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { filterPostsBySection, getTranslationKey, resolvePostForLocale } from "@utils/posts";
import { renderPostOgImage } from "@utils/og-image";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection("blog", ({ data }) => data.published !== false);
  const keys = new Set(filterPostsBySection(allPosts, "blog").map(getTranslationKey));
  return Array.from(keys).map((key) => ({ params: { slug: key }, props: { translationKey: key } }));
};

export const GET: APIRoute = async ({ props, site }) => {
  const { translationKey } = props as { translationKey: string };
  const allPosts = await getCollection("blog", ({ data }) => data.published !== false);
  const blogPosts = filterPostsBySection(allPosts, "blog");
  const { post } = resolvePostForLocale(blogPosts, translationKey, "en");
  if (!post) return new Response("Not found", { status: 404 });

  const domain = site ? new URL(site).host : "example.com";
  const png = await renderPostOgImage(post, "en", domain);

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
