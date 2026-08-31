/**
 * Auto-detection and translation utilities for comments
 * Detects comment language and provides automatic translation
 */

import { translateText, isTranslationNeeded } from "./translateText";
import type { Language } from "./index";

// Common patterns for different languages
const LANGUAGE_PATTERNS = {
  uz: /[ғқхў]/i, // Uzbek specific characters
  ru: /[ёъы]/i, // Russian specific characters
  ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/i, // Japanese characters
  en: /^[a-zA-Z0-9\s.,!?'-]+$/, // English ASCII
};

/**
 * Detect language of text using simple heuristics
 * Falls back to a default if detection is uncertain
 */
export function detectCommentLanguage(
  text: string,
  defaultLanguage: Language = "uz"
): Language {
  if (!text || text.length < 2) return defaultLanguage;

  const cleanText = text.toLowerCase();

  // Check script-specific patterns first (most reliable)
  if (LANGUAGE_PATTERNS.ja.test(cleanText)) return "ja";
  if (LANGUAGE_PATTERNS.ru.test(cleanText)) return "ru";
  if (LANGUAGE_PATTERNS.uz.test(cleanText)) return "uz";

  // English: mostly ASCII letters — if no Cyrillic/Uzbek/Japanese found
  if (LANGUAGE_PATTERNS.en.test(cleanText)) return "en";

  // Default to the provided default language
  return defaultLanguage;
}

/**
 * Get auto-detected language and translated content for a comment
 */
export async function getCommentWithAutoDetection(
  commentText: string,
  targetLanguage: Language = "uz",
  autoDetectLanguage: Language | null = null
) {
  try {
    // Detect source language if not provided
    const sourceLanguage = autoDetectLanguage || detectCommentLanguage(commentText);

    // Check if translation is actually needed
    if (sourceLanguage === targetLanguage) {
      return {
        originalText: commentText,
        originalLanguage: sourceLanguage,
        translatedText: commentText,
        translatedLanguage: targetLanguage,
        wasTranslated: false,
      };
    }

    const needsTranslation = isTranslationNeeded(sourceLanguage, targetLanguage);
    if (!needsTranslation) {
      return {
        originalText: commentText,
        originalLanguage: sourceLanguage,
        translatedText: commentText,
        translatedLanguage: targetLanguage,
        wasTranslated: false,
      };
    }

    // Translate the comment
    try {
      const translatedText = await translateText(
        commentText,
        sourceLanguage,
        targetLanguage
      );

      return {
        originalText: commentText,
        originalLanguage: sourceLanguage,
        translatedText,
        translatedLanguage: targetLanguage,
        wasTranslated: true,
      };
    } catch (translationError) {
      console.error("Translation failed, returning original:", translationError);
      return {
        originalText: commentText,
        originalLanguage: sourceLanguage,
        translatedText: commentText,
        translatedLanguage: targetLanguage,
        wasTranslated: false,
      };
    }
  } catch (error) {
    console.error("Error in comment auto-detection:", error);
    return {
      originalText: commentText,
      originalLanguage: "uz" as Language,
      translatedText: commentText,
      translatedLanguage: targetLanguage,
      wasTranslated: false,
    };
  }
}

/**
 * Batch process comments with auto-detection
 */
export async function processCommentsWithAutoDetection(
  comments: Array<{ id: string; content: string; language?: string }>,
  targetLanguage: Language = "uz"
) {
  const results = await Promise.all(
    comments.map(async (comment) => {
      const detection = await getCommentWithAutoDetection(
        comment.content,
        targetLanguage,
        comment.language as Language | null
      );

      return {
        commentId: comment.id,
        ...detection,
      };
    })
  );

  return results;
}

/**
 * Split text into sentences for better translation
 */
export function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g) || [text];
}

/**
 * Check if comment needs translation based on language mismatch
 */
export function commentNeedsTranslation(
  commentLanguage: string,
  targetLanguage: string
): boolean {
  return commentLanguage.toLowerCase() !== targetLanguage.toLowerCase();
}
