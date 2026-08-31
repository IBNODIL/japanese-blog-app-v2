/**
 * Translation system exports
 * Centralized API for all translation functionality
 */

export { translateText, translateBatch, isTranslationNeeded } from "./translateText";
export type { } from "./translateText";

export {
  translatePost,
  getTargetLanguages,
  formatContentForTranslation,
} from "./translatePost";
export type { } from "./translatePost";

export { getPostBySlug, getPostTranslations } from "./getPostBySlug";
export type { } from "./getPostBySlug";

export {
  getPostWithTranslation,
  getPostsWithTranslations,
  postHasTranslation,
} from "./getPostWithTranslation";
export type { PostWithTranslationData } from "./getPostWithTranslation";

export {
  translateComment,
  getCommentTranslations,
  translateCommentsBatch,
} from "./translateComment";
export type { } from "./translateComment";

export {
  detectCommentLanguage,
  getCommentWithAutoDetection,
  processCommentsWithAutoDetection,
  commentNeedsTranslation,
} from "./commentAutoDetect";
export type { } from "./commentAutoDetect";

export {
  savePostTranslations,
  getPostTranslationStatus,
  retryFailedTranslations,
} from "./saveTranslations";
export type { } from "./saveTranslations";

// Re-export Language type
export type Language = "uz" | "en" | "ja" | "ru";

// Constants
export const SUPPORTED_LANGUAGES: Language[] = ["uz", "en", "ja", "ru"];
export const DEFAULT_LANGUAGE: Language = "ja";

export const LANGUAGE_NAMES: Record<Language, string> = {
  uz: "Ўзбек",
  en: "English",
  ja: "日本語",
  ru: "Русский",
};

export const LANGUAGE_CODES: Record<Language, string> = {
  uz: "uz",
  en: "en",
  ja: "ja",
  ru: "ru",
};
