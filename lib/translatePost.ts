import { prisma } from "@/lib/prisma";
import {
  translateText,
  mapLocaleToTranslatorLang,
  getTargetLanguages,
  type SupportedLanguage,
} from "@/lib/translate";
import { translateTiptapContent } from "@/lib/translation/translatePost";
// 1. TUZATILDI: slugify funksiyasi import qilindi
import slugify from "slugify";

interface TranslationResult {
  language: SupportedLanguage;
  title: string;
  content: unknown;
}

/**
 * Translates a post's title and content into all target languages
 * and caches the results in the PostTranslation table.
 *
 * Preserves TipTap JSON structure by only translating text nodes.
 * If a single language fails, it logs the error and continues with others.
 */
export async function translateAndCachePost(
  postId: string,
  title: string,
  content: unknown,
  sourceLanguage: string
): Promise<TranslationResult[]> {
  const targetLanguages = getTargetLanguages(sourceLanguage);
  const fromLang = mapLocaleToTranslatorLang(sourceLanguage);
  const results: TranslationResult[] = [];

  for (const targetLang of targetLanguages) {
    try {
      const toLang = mapLocaleToTranslatorLang(targetLang);

      // Translate title
      const translatedTitle = await translateText(title, fromLang, toLang);

      // Translate content preserving TipTap structure
      let translatedContent: unknown;
      if (
        typeof content === "object" &&
        content !== null &&
        "type" in content &&
        (content as { type: string }).type === "doc"
      ) {
        // Use structure-preserving translation

        translatedContent = await translateTiptapContent(
          content as Record<string, unknown>,
          fromLang as "uz" | "en" | "ja" | "ru",
          toLang as "uz" | "en" | "ja" | "ru"
        );
      } else {
        // Fallback for plain text
        const contentStr = typeof content === "string" ? content : JSON.stringify(content);
        const translatedStr = await translateText(contentStr, fromLang, toLang);
        try {
          translatedContent = JSON.parse(translatedStr);
        } catch {
          translatedContent = content;
        }
      }

      // 2. TUZATILDI: create blokiga slug va translationStatus maydonlari qo'shildi
      // Har doim takrorlanmas slug hosil qilish uchun oxiriga targetLang qo'shib ketildi
      const generatedSlug = slugify(translatedTitle, { lower: true, strict: true }) + `-${targetLang}`;

      // Upsert to handle re-translation (e.g., on post edit)
      await prisma.postTranslation.upsert({
        where: {
          postId_language: { postId, language: targetLang },
        },
        update: {
          title: translatedTitle,
          content: translatedContent as object,
          translationStatus: "AUTO_TRANSLATED",
        },
        create: {
          postId,
          language: targetLang,
          title: translatedTitle,
          content: translatedContent as object,
          slug: generatedSlug,
          translationStatus: "AUTO_TRANSLATED",
        },
      });

      results.push({
        language: targetLang,
        title: translatedTitle,
        content: translatedContent,
      });
    } catch (error) {
      console.error(
        `Translation to ${targetLang} failed for post ${postId}:`,
        error
      );
      // Continue with other languages — partial translation is better than none
    }
  }

  return results;
}

/**
 * Clears all cached translations for a post.
 * Call this when the original post content is updated.
 */
export async function clearPostTranslations(postId: string): Promise<void> {
  await prisma.postTranslation.deleteMany({
    where: { postId },
  });
}
