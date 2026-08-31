/* eslint-disable */
// @ts-nocheck
/**
 * MULTILINGUAL BLOG PLATFORM - IMPLEMENTATION GUIDE
 * 
 * This document explains how to use the translation system throughout your app
 * 
 * @nocompile - This is documentation only, not meant to be compiled
 */

// eslint-disable-next-line
// @ts-ignore - This file contains example code snippets only

// ============================================================================
// 1. DISPLAYING A POST IN REQUESTED LANGUAGE
// ============================================================================

/**
 * Server-side: Get post by slug in requested language
 * Automatically translates and caches if needed
 */
import { getPostBySlug } from "@/lib/translation/getPostBySlug";
import type { Language } from "@/lib/translation";

async function getPostServerSide(slug: string, language: Language = "en") {
  const post = await getPostBySlug(slug, language);

  if (!post) {
    return null;
  }

  return post; // Returns content in requested language
}

// ============================================================================
// 2. CLIENT-SIDE LANGUAGE SWITCHING IN COMPONENTS
// ============================================================================

/**
 * React Component: Post Viewer with Language Switching
 */
import { useLanguage, useTranslatedContent } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";

export function PostViewerWithTranslation() {
  const { language } = useLanguage();
  const { content, loading } = useTranslatedContent("my-post-slug", language);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <LanguageSwitcher />
      <div>{/* Display content */}</div>
    </div>
  );
}

// ============================================================================
// 3. CREATING A POST WITH AUTO-TRANSLATION
// ============================================================================

/**
 * Server action or API route that publishes a post
 * Automatically translates to all languages
 */
import { savePostTranslations } from "@/lib/translation/saveTranslations";

async function publishPost(
  postId: string,
  title: string,
  content: unknown,
  sourceLanguage: Language = "uz"
) {
  // Save the post first in database
  // ...

  // Then save translations (original + auto-translate)
  const result = await savePostTranslations(
    postId,
    title,
    content,
    sourceLanguage,
    {
      timeout: 30000, // 30 second timeout per translation
    }
  );

  if (!result.success) {
    console.error("Translation failed:", result);
    // Post is still saved, but some translations might be pending
  }

  return result.translations; // ["uz", "en", "ja", "ru"]
}

// ============================================================================
// 4. TRANSLATING COMMENTS ON DEMAND
// ============================================================================

/**
 * React Hook: Translate a comment with loading state
 */
import { useState } from "react";
import { useTranslateComment, useLanguage } from "@/hooks/use-language";

export function CommentWithTranslation({ comment }: { comment: { id: string; content: string } }) {
  const { translate, loading, error } = useTranslateComment();
  const [translation, setTranslation] = useState<{ content: string } | null>(null);
  const { language } = useLanguage();

  const handleTranslate = async () => {
    const result = await translate(comment.id, language);
    if (result) {
      setTranslation(result);
    }
  };

  return (
    <div>
      <p>{translation?.content || comment.content}</p>
      <button onClick={handleTranslate} disabled={loading}>
        {loading ? "Translating..." : "Translate"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================================
// 5. GETTING TRANSLATION STATUS
// ============================================================================

/**
 * Check which languages a post is available in
 */
import { useTranslationStatus } from "@/hooks/use-language";

export function PostAvailableLanguages({ postId }) {
  const { status, loading } = useTranslationStatus(postId);

  if (loading) return null;

  return (
    <div>
      <h3>Available in:</h3>
      {Object.entries(status?.translations || {}).map(([lang, info]) => (
        <span key={lang}>
          {lang.toUpperCase()} ({info.status})
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// 6. LANGUAGE UTILITIES IN DIFFERENT CONTEXTS
// ============================================================================

/**
 * Utility: Get current language
 */
import { getCurrentLanguage } from "@/lib/language";

const currentLang = getCurrentLanguage(); // "en", "uz", "ja", or "ru"

/**
 * Utility: Build language-aware URLs
 */
import { buildLanguageUrl } from "@/lib/language";

const urlInFrench = buildLanguageUrl("/blog/my-post", "en");
// Returns: "/blog/my-post?lang=en"

/**
 * Utility: Format language display
 */
import { formatLanguageDisplay, LANGUAGE_NAMES } from "@/lib/language";

const display = formatLanguageDisplay("en"); // "🇬🇧 English"
const name = LANGUAGE_NAMES["ru"]; // "Русский"

// ============================================================================
// 7. API ENDPOINTS
// ============================================================================

/**
 * GET /api/translate/comment?commentId=123&language=en
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "123",
 *     "content": "Translated content...",
 *     "language": "en",
 *     "originalLanguage": "uz"
 *   }
 * }
 */

/**
 * GET /api/translate/post-status?postId=456
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalLanguages": 4,
 *     "translations": {
 *       "uz": {
 *         "status": "ORIGINAL",
 *         "isOriginal": true,
 *         "createdAt": "2024-01-01T10:00:00Z"
 *       },
 *       "en": {
 *         "status": "AUTO_TRANSLATED",
 *         "isOriginal": false,
 *         "createdAt": "2024-01-01T10:05:00Z"
 *       }
 *     }
 *   }
 * }
 */

// ============================================================================
// 8. PRISMA MODELS STRUCTURE
// ============================================================================

/**
 * Post model stores the main content
 * Language field indicates the default/original language
 */

/**
 * PostTranslation stores translations for each language
 * isOriginal: true only for the original language
 * translationStatus: ORIGINAL | AUTO_TRANSLATED | MANUAL_TRANSLATED | PENDING | FAILED
 * 
 * Unique constraint: (postId, language) - one translation per language per post
 */

/**
 * Comment stores original comment
 * CommentTranslation stores on-demand translations
 */

// ============================================================================
// 9. TRANSLATION FLOW EXAMPLE
// ============================================================================

/**
 * Complete flow when publishing a blog post:
 * 
 * 1. User fills form in their language (e.g., Uzbek)
 * 2. User clicks "Publish"
 * 3. API route /api/posts creates post with defaultLanguage="uz"
 * 4. Post record is inserted into database
 * 5. savePostTranslations() is called:
 *    a. Creates PostTranslation with isOriginal=true, language="uz"
 *    b. Translates title & content to EN, JA, RU
 *    c. Creates PostTranslation records for each translation
 * 6. User navigates to post: /blog/my-slug?lang=en
 * 7. Page loads with English translation
 * 8. If translation didn't exist initially:
 *    - Auto-translate on the fly
 *    - Cache the translation
 * 9. Other users can view in their preferred language
 */

// ============================================================================
// 10. ERROR HANDLING & FALLBACKS
// ============================================================================

/**
 * Translation API failures are handled gracefully:
 * - Original content is returned as fallback
 * - Error is logged but doesn't fail the request
 * - Post is still accessible to users
 * - Failures are marked in database for retry later
 */

/**
 * Retry failed translations:
 */
import { retryFailedTranslations } from "@/lib/translation/saveTranslations";

async function retryTranslations(postId) {
  const result = await retryFailedTranslations(postId);
  console.log(`Retried ${result.retried} translations`);
}

// ============================================================================
// 11. CONFIGURATION
// ============================================================================

/**
 * Supported languages are configured in lib/translation/index.ts:
 * - UZ: Uzbek
 * - EN: English
 * - JA: Japanese
 * - RU: Russian
 * 
 * Default language is Japanese (JA)
 * 
 * You can modify these constants if needed:
 */
export const SUPPORTED_LANGUAGES = ["uz", "en", "ja", "ru"];
export const DEFAULT_LANGUAGE = "ja"; // Change if needed

// ============================================================================
// 12. PERFORMANCE OPTIMIZATION
// ============================================================================

/**
 * Translations are cached:
 * - In database with unique (postId, language) constraint
 * - Prevents duplicate translations
 * - Auto-translation happens lazily (only when needed)
 * 
 * Translation requests are:
 * - Rate-limited by API (LibreTranslate)
 * - Cached locally
 * - Retryable on failure
 */
