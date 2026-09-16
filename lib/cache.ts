/**
 * Shared caching layer for read-heavy, public-facing queries.
 *
 * Uses Next.js `unstable_cache` so that repeated requests for the same
 * data (home feed, a post, tags, partners, homepage content) hit an
 * in-memory/data cache instead of Postgres every time.
 *
 * Each cached function is tagged (see CACHE_TAGS) so that any mutation
 * (publishing/editing/deleting a post, adding a partner, editing
 * homepage copy, etc.) can precisely invalidate only what changed via
 * `revalidateTag`, rather than relying purely on a time-based TTL.
 *
 * A short TTL (`revalidate`) is still set as a safety net for data that
 * can also drift for reasons we don't explicitly invalidate (e.g. like/
 * comment counts embedded in a post list).
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const CACHE_TAGS = {
  posts: "posts",
  post: (id: string) => `post-${id}`,
  tags: "tags",
  partners: "partners",
  homepageContent: "homepage-content",
} as const;

// Counts/likes embedded in cached lists refresh at least this often even
// without an explicit revalidateTag call.
const DEFAULT_REVALIDATE_SECONDS = 60;

const postListInclude = (locale: string) => ({
  author: { select: { id: true, name: true, image: true } as const },
  translations: {
    where: { language: locale },
    select: {
      title: true,
      slug: true,
      coverImage: true,
      tags: { include: { tag: true } },
    },
  },
  _count: { select: { likes: true, comments: true } },
});

/**
 * Home page data: paginated posts + total count + featured posts + tag
 * cloud, all scoped to a locale/page/tag combination. Each unique
 * combination of arguments gets its own cache entry.
 */
export const getHomeFeedData = unstable_cache(
  async (locale: string, page: number, tag: string | undefined) => {
    const limit = 12;
    const where: Record<string, unknown> = { published: true, hidden: false };
    if (tag) {
      where.translations = { some: { tags: { some: { tag: { slug: tag } } } } };
    }

    const [posts, total, featuredPosts, allTags] = await Promise.all([
      prisma.post.findMany({
        where,
        include: postListInclude(locale),
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit * 2, // account for locale filtering below
      }),
      prisma.post.count({ where }),
      prisma.post.findMany({
        where: { published: true, hidden: false, featured: true },
        include: postListInclude(locale),
        take: 3,
      }),
      prisma.tag.findMany({
        include: { _count: { select: { posts: true } } },
        orderBy: { posts: { _count: "desc" } },
        take: 20,
      }),
    ]);

    return { posts, total, featuredPosts, allTags };
  },
  ["home-feed"],
  { tags: [CACHE_TAGS.posts, CACHE_TAGS.tags], revalidate: DEFAULT_REVALIDATE_SECONDS }
);

/** Homepage hero copy for a given locale. */
export const getHomepageContentByLocale = unstable_cache(
  async (locale: string) => prisma.homepageContent.findUnique({ where: { language: locale } }),
  ["homepage-content"],
  { tags: [CACHE_TAGS.homepageContent], revalidate: DEFAULT_REVALIDATE_SECONDS }
);

/**
 * Resolve a post by slug (locale-aware translation slug, falling back to
 * the legacy Post.slug). Mirrors the logic previously inlined in the post
 * detail page, just wrapped in a cache.
 */
export const getPostBySlug = unstable_cache(
  async (slug: string, locale: string) => {
    const translationMatch = await prisma.postTranslation.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
        post: {
          include: {
            author: { select: { id: true, name: true, image: true } },
            _count: { select: { likes: true, comments: true, bookmarks: true } },
          },
        },
      },
    });

    if (translationMatch) {
      let localeSlugIfDifferent: string | null = null;
      if (translationMatch.language !== locale) {
        const localeTranslation = await prisma.postTranslation.findUnique({
          where: { postId_language: { postId: translationMatch.postId, language: locale } },
          select: { slug: true },
        });
        if (localeTranslation && localeTranslation.slug !== slug) {
          localeSlugIfDifferent = localeTranslation.slug;
        }
      }
      return {
        post: translationMatch.post,
        translation: translationMatch,
        redirectToSlug: localeSlugIfDifferent,
      };
    }

    // Legacy fallback: old links used the global Post.slug directly.
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true, comments: true, bookmarks: true } },
      },
    });
    if (!post) return null;

    const translation = await prisma.postTranslation.findUnique({
      where: { postId_language: { postId: post.id, language: locale } },
      include: { tags: { include: { tag: true } } },
    });

    return { post, translation, redirectToSlug: null };
  },
  ["post-by-slug"],
  { tags: [CACHE_TAGS.posts], revalidate: DEFAULT_REVALIDATE_SECONDS }
);

/** Public tag list (used by the tags API/sidebar). */
export const getPublicTags = unstable_cache(
  async () =>
    prisma.tag.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ["public-tags"],
  { tags: [CACHE_TAGS.tags], revalidate: DEFAULT_REVALIDATE_SECONDS }
);

/** Public partners list (used on the homepage partners carousel). */
export const getPublicPartners = unstable_cache(
  async () => prisma.partner.findMany({ orderBy: { order: "asc" } }),
  ["public-partners"],
  { tags: [CACHE_TAGS.partners], revalidate: DEFAULT_REVALIDATE_SECONDS }
);
