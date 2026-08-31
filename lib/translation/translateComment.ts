/**
 * Translate comment to requested language
 * Saves translation to database for caching
 */

import { prisma } from "@/lib/prisma";
import { translateText } from "./translateText";

export type Language = "uz" | "en" | "ja" | "ru";

interface TranslatedComment {
  id: string;
  content: string;
  language: Language;
  originalLanguage: Language;
}

/**
 * Get or create translated comment
 * @param commentId - Comment ID
 * @param targetLanguage - Language to translate to
 * @returns Translated comment or original if translation fails
 */
export async function translateComment(
  commentId: string,
  targetLanguage: Language
): Promise<TranslatedComment | null> {
  try {
    // Fetch original comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return null;
    }

    const originalLanguage = comment.language as Language;

    // If requesting same language, return original
    if (targetLanguage === originalLanguage) {
      return {
        id: comment.id,
        content: comment.content,
        language: targetLanguage,
        originalLanguage,
      };
    }

    // Check if translation already exists
    const existingTranslation = await prisma.commentTranslation.findUnique({
      where: {
        commentId_language: {
          commentId: comment.id,
          language: targetLanguage,
        },
      },
    });

    if (existingTranslation) {
      return {
        id: comment.id,
        content: existingTranslation.content,
        language: targetLanguage,
        originalLanguage,
      };
    }

    // Translate comment
    console.log(
      `🔄 Translating comment to ${targetLanguage.toUpperCase()}...`
    );

    const translatedContent = await translateText(
      comment.content,
      originalLanguage,
      targetLanguage,
      { maxRetries: 2 }
    );

    // Save translation to database
    await prisma.commentTranslation.create({
      data: {
        commentId: comment.id,
        language: targetLanguage,
        content: translatedContent,
      },
    });

    console.log(
      `✓ Comment translated to ${targetLanguage.toUpperCase()} and cached`
    );

    return {
      id: comment.id,
      content: translatedContent,
      language: targetLanguage,
      originalLanguage,
    };
  } catch (error) {
    console.error("Error translating comment:", error);
    return null;
  }
}

/**
 * Get all translations for a comment
 */
export async function getCommentTranslations(commentId: string) {
  try {
    const translations = await prisma.commentTranslation.findMany({
      where: { commentId },
    });

    return translations;
  } catch (error) {
    console.error("Error fetching comment translations:", error);
    return [];
  }
}

/**
 * Translate multiple comments
 */
export async function translateCommentsBatch(
  commentIds: string[],
  targetLanguage: Language
): Promise<TranslatedComment[]> {
  const results = await Promise.all(
    commentIds.map((id) => translateComment(id, targetLanguage))
  );

  return results.filter((result) => result !== null) as TranslatedComment[];
}
