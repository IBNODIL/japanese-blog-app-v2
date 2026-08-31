/**
 * Get post by slug in a specific language
 * Implements lazy translation caching:
 * - Returns translation if it exists
 * - Auto-translates and caches if not
 * - Falls back to original if translation fails
 */

import { prisma } from "@/lib/prisma";
import { translateText } from "./translateText";

export type Language = "uz" | "en" | "ja" | "ru";

interface PostWithTranslation {
  id: string;
  title: string;
  content: unknown;
  slug: string;
  coverImage: string | null;
  readingTime: number;
  featured: boolean;
  language: Language;
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

function tagsForLanguage(
  translations: Array<{ language: string; tags: PostWithTranslation["tags"] }>,
  language: string,
  fallbackLanguage: string
) {
  return (
    translations.find((t) => t.language === language)?.tags ||
    translations.find((t) => t.language === fallbackLanguage)?.tags ||
    []
  );
}

/**
 * Get post by slug in requested language
 * @param slug - Post slug
 * @param language - Requested language
 * @returns Post with content in requested language or original if translation fails
 */
export async function getPostBySlug(
  slug: string,
  language: Language = "uz"
): Promise<PostWithTranslation | null> {
  try {
    // Fetch post with all relations
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        translations: {
          include: { tags: { include: { tag: true } } },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!post) {
      return null;
    }

    if (!post.published) {
      return null;
    }

    // If requested language matches post's language, return as-is
    const postLang = String(post.language).toLowerCase() as Language;

    if (language === postLang) {
      return {
        ...post,
        tags: tagsForLanguage(post.translations, language, postLang),
        language: language,
      } as PostWithTranslation;
    }

    // Try to find existing translation
    const existingTranslation = post.translations.find((t) => t.language === language);

    if (existingTranslation) {
      return {
        ...post,
        title: existingTranslation.title,
        content: existingTranslation.content,
        tags: existingTranslation.tags,
        language: language,
      } as PostWithTranslation;
    }

    // Translation doesn't exist - auto-translate and cache
    console.log(
      `🔄 Auto-translating post "${post.title}" to ${language.toUpperCase()}`
    );

    try {
      // Extract content for translation
      const contentText = extractTextFromContent(post.content);

      // Translate in parallel
      const [translatedTitle, translatedContent] = await Promise.all([
        translateText(post.title, postLang, language, { maxRetries: 2 }),
        translateText(contentText, postLang, language, { maxRetries: 2 }),
      ]);

      const translatedSlug = `${post.slug}-${language}`;

      // Save translation to database
      const newTranslation = await prisma.postTranslation.create({
        data: {
          postId: post.id,
          language: language,
          title: translatedTitle,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: rebuildContent(post.content, translatedContent) as any,
          slug: translatedSlug,
          coverImage: post.coverImage,
          translationStatus: "AUTO_TRANSLATED",
          isOriginal: false,
        },
      });

      console.log(`✓ Post auto-translated and cached for ${language}`);

      return {
        ...post,
        title: newTranslation.title,
        content: newTranslation.content,
        tags: [],
        language: language,
      } as PostWithTranslation;
    } catch (error) {
      console.error(
        `✗ Auto-translation failed, returning original content: ${error}`
      );

      // Return original content as fallback
      return {
        ...post,
        tags: tagsForLanguage(post.translations, postLang, postLang),
        language: postLang,
      } as PostWithTranslation;
    }
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

/**
 * Get all available translations for a post
 */
export async function getPostTranslations(postId: string) {
  const translations = await prisma.postTranslation.findMany({
    where: { postId },
    select: {
      language: true,
      title: true,
      translationStatus: true,
    },
  });

  return translations;
}

/**
 * Extract plain text from content (handles both string and JSON)
 */
function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (typeof content === "object" && content !== null) {
    // If it's a Tiptap JSON structure
    if ("type" in content && content.type === "doc") {
      return extractTextFromTiptap(content as TiptapNode);
    }

    // Stringify and extract text
    const serialized = JSON.stringify(content);
    // Remove JSON structure and keep only text nodes
    return serialized
      .split('"text"')
      .slice(1)
      .join(" ")
      .replace(/[^a-zA-Z0-9\s\u0400-\u04FF\u3040-\u309F\u06A0-\u06FF]/g, "")
      .slice(0, 5000);
  }

  return String(content);
}

/**
 * Extract text from Tiptap JSON structure
 */
function extractTextFromTiptap(node: TiptapNode): string {
  let text = "";

  if (node.text) {
    text += node.text + " ";
  }

  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child) => {
      text += extractTextFromTiptap(child);
    });
  }

  return text;
}

/**
 * Rebuild content structure with translated text
 * Preserves JSON structure, only replaces text nodes
 */
function rebuildContent(
  originalContent: unknown,
  translatedText: string
): unknown {
  // If original is string, return translated text as string
  if (typeof originalContent === "string") {
    return translatedText;
  }

  // If it's a Tiptap JSON structure, preserve structure
  if (
    typeof originalContent === "object" &&
    originalContent !== null &&
    "type" in originalContent &&
    originalContent.type === "doc"
  ) {
    const contentNode = originalContent as TiptapNode;
    const textNodes = translatedText.split("\n").filter((text) => text.trim());

    // Rebuild with translated text maintaining structure
    return {
      ...contentNode,
      content: textNodes.map((text) => ({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      })),
    };
  }

  // Fallback: return translated text wrapped in content structure
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: translatedText,
          },
        ],
      },
    ],
  };
}

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  [key: string]: unknown;
}
