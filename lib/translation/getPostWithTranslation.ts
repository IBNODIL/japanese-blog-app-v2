/**
 * Get post with translation for the specified language
 * Filters to only return posts that have translations available
 */

import { prisma } from "@/lib/prisma";
import type { Language } from "./index";

export interface PostWithTranslationData {
  id: string;
  title: string;
  content: unknown;
  slug: string;
  published: boolean;
  featured: boolean;
  readingTime: number;
  language: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  _count: {
    likes: number;
    comments: number;
  };
}

/**
 * Get a post with its translation for the requested language
 * Only returns if translation exists in PostTranslation table
 */
export async function getPostWithTranslation(
  postId: string,
  language: Language
): Promise<{
  post: PostWithTranslationData;
  title: string;
  content: unknown;
} | null> {
  try {
    // First fetch the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        translations: {
          where: { language },
          include: { tags: { include: { tag: true } } },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!post) return null;

    // Look for translation in the database
    const translation = post.translations[0];

    // If translation doesn't exist and requested language is different from original, return null
    if (!translation && language !== post.language) {
      return null;
    }

    // Use translation if available, otherwise use original
    const finalTitle = translation?.title || post.title;
    const finalContent = translation?.content || post.content;

    return {
      post: post as unknown as PostWithTranslationData,
      title: finalTitle,
      content: finalContent,
    };
  } catch (error) {
    console.error("Error fetching post with translation:", error);
    return null;
  }
}

/**
 * Get posts with translations for the requested language
 * Filters to only return posts that have translations
 */
export async function getPostsWithTranslations(
  language: Language,
  filters?: {
    published?: boolean;
    featured?: boolean;
    authorId?: string;
    tagSlug?: string;
  }
) {
  try {
    // Build where clause
    const where: Record<string, unknown> = {};
    if (filters?.published !== undefined) where.published = filters.published;
    if (filters?.featured !== undefined) where.featured = filters.featured;
    if (filters?.authorId) where.authorId = filters.authorId;
    if (filters?.tagSlug) {
      where.translations = {
        some: {
          tags: { some: { tag: { slug: filters.tagSlug } } },
        },
      };
    }

    // Get posts that have translations for the requested language
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        translations: {
          where: { language },
          select: { title: true, content: true, slug: true, coverImage: true, tags: { include: { tag: true } } },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter to only posts that have translations for this language, or are in the original language
    return posts
      .filter(
        (post) =>
          post.translations.length > 0 || post.language === language
      )
      .map((post) => {
        const translation = post.translations[0];
        const title = translation?.title || post.title;
        const content = translation?.content || post.content;

        return {
          ...post,
          title,
          content,
          translationLang: language,
        };
      });
  } catch (error) {
    console.error("Error fetching posts with translations:", error);
    return [];
  }
}

/**
 * Check if a post has translation for the given language
 */
export async function postHasTranslation(
  postId: string,
  language: Language
): Promise<boolean> {
  try {
    const translation = await prisma.postTranslation.findUnique({
      where: {
        postId_language: {
          postId,
          language,
        },
      },
      select: { id: true },
    });

    return !!translation;
  } catch (error) {
    console.error("Error checking post translation:", error);
    return false;
  }
}
