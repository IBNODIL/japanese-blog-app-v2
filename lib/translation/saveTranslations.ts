/**
 * Handle post publication with automatic translation
 * Creates original translation and auto-translates to other languages
 */

import { prisma } from "@/lib/prisma";
import { translatePost, getTargetLanguages, translateTiptapContent, formatContentForTranslation } from "./translatePost";
import { translateText } from "./translateText";
import slugify from "slugify";

export type Language = "uz" | "en" | "ja" | "ru";

interface SaveTranslationsOptions {
  skipTranslation?: boolean; // For testing or manual translation later
  timeout?: number;
  slug?: string; // slug for the original-language translation row
  coverImage?: string | null;
  tagIds?: string[]; // tag ids to attach to every (re)generated translation row
}

/**
 * Generate a slug that doesn't collide with any other PostTranslation row.
 * Excludes the given postId+language pair (so re-saving the same row works).
 */
async function uniqueTranslationSlug(
  base: string,
  postId: string,
  language: string
): Promise<string> {
  let candidate = base || `post-${postId.slice(0, 8)}-${language}`;
  let suffix = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.postTranslation.findFirst({
      where: { slug: candidate, NOT: { postId, language } },
      select: { id: true },
    });

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${base || "post"}-${suffix}`;
  }
}

/**
 * Save post translations when publishing
 * Creates original translation and auto-translates to other languages.
 *
 * IMPORTANT: this will never overwrite a translation row whose
 * translationStatus is MANUAL_TRANSLATED — those are admin hand-edits
 * and must survive re-saves of the post (e.g. editing the title in the
 * original language should not wipe out a manually corrected Japanese
 * translation).
 */
export async function savePostTranslations(
  postId: string,
  title: string,
  content: unknown,
  sourceLanguage: Language,
  options: SaveTranslationsOptions = {}
): Promise<{ success: boolean; translations: string[] }> {
  const { skipTranslation = false, timeout = 30000, slug, coverImage, tagIds } = options;

  try {
    console.log(
      `📝 Saving translations for post: ${postId} (source: ${sourceLanguage})`
    );

    // 1. Save original translation
    const originalSlugBase = slug || slugify(title || "post", { lower: true, strict: true });
    const originalSlug = await uniqueTranslationSlug(originalSlugBase, postId, sourceLanguage);

    await prisma.postTranslation.upsert({
      where: {
        postId_language: {
          postId,
          language: sourceLanguage,
        },
      },
      create: {
        postId,
        language: sourceLanguage,
        title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: content as any,
        slug: originalSlug,
        coverImage: coverImage ?? null,
        isOriginal: true,
        translationStatus: "ORIGINAL",
      },
      update: {
        title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: content as any,
        ...(slug ? { slug: originalSlug } : {}),
        ...(coverImage !== undefined ? { coverImage } : {}),
        isOriginal: true,
        translationStatus: "ORIGINAL",
      },
    });

    if (tagIds) {
      await syncTranslationTags(postId, sourceLanguage, tagIds);
    }

    const savedLanguages: string[] = [sourceLanguage];
    console.log(`✓ Original translation saved (${sourceLanguage})`);

    // 2. Auto-translate to other languages (if not skipped)
    if (!skipTranslation) {
      const targetLanguages = getTargetLanguages(sourceLanguage);

      console.log(`🔄 Auto-translating to: ${targetLanguages.join(", ")}`);

      // Translate and save each target language
      for (const targetLang of targetLanguages) {
        try {
          // Skip languages that have already been manually edited by an
          // admin — never clobber a human-reviewed translation.
          const existing = await prisma.postTranslation.findUnique({
            where: { postId_language: { postId, language: targetLang } },
            select: { translationStatus: true },
          });

          if (existing?.translationStatus === "MANUAL_TRANSLATED") {
            console.log(
              `⏭️  Skipping ${targetLang} — manually translated, preserving admin edits`
            );
            savedLanguages.push(targetLang);
            continue;
          }

          // Translate title
          const translatedTitle = await translateText(
            title,
            sourceLanguage,
            targetLang,
            { timeout }
          );

          // Translate content while preserving TipTap JSON structure
          let contentToSave: unknown;
          if (typeof content === "object" && content !== null && "type" in content && content.type === "doc") {
            // Preserve full document structure - only translate text nodes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contentToSave = await translateTiptapContent(
              content as Record<string, unknown>,
              sourceLanguage,
              targetLang,
              { timeout }
            );
          } else {
            // Fallback for plain text content
            const textContent = typeof content === "string" ? content : String(content);
            const translatedContent = await translateText(textContent, sourceLanguage, targetLang, { timeout });
            contentToSave = translatedContent;
          }

          const targetSlugBase = slugify(translatedTitle || "post", { lower: true, strict: true });
          const targetSlug = await uniqueTranslationSlug(targetSlugBase, postId, targetLang);

          await prisma.postTranslation.upsert({
            where: {
              postId_language: {
                postId,
                language: targetLang,
              },
            },
            create: {
              postId,
              language: targetLang,
              title: translatedTitle,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: contentToSave as any,
              slug: targetSlug,
              coverImage: coverImage ?? null,
              isOriginal: false,
              translationStatus: "AUTO_TRANSLATED",
            },
            update: {
              title: translatedTitle,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: contentToSave as any,
              slug: targetSlug,
              ...(coverImage !== undefined ? { coverImage } : {}),
              translationStatus: "AUTO_TRANSLATED",
            },
          });

          if (tagIds) {
            await syncTranslationTags(postId, targetLang, tagIds);
          }

          savedLanguages.push(targetLang);
          console.log(
            `✓ Translation saved (${targetLang}): "${translatedTitle.substring(0, 50)}..."`
          );
        } catch (error) {
          console.error(`✗ Failed to save translation for ${targetLang}:`, error);
        }
      }
    } else {
      console.log("⏭️  Translation skipped (skipTranslation = true)");
    }

    console.log(
      `✅ Post translations saved successfully: ${savedLanguages.join(", ")}`
    );

    return {
      success: true,
      translations: savedLanguages,
    };
  } catch (error) {
    console.error("Error saving post translations:", error);

    return {
      success: false,
      translations: [sourceLanguage], // At least original was attempted
    };
  }
}

/**
 * Replace the tag links for a single (postId, language) translation row
 * with the given list of tag ids.
 */
async function syncTranslationTags(
  postId: string,
  language: string,
  tagIds: string[]
) {
  const translation = await prisma.postTranslation.findUnique({
    where: { postId_language: { postId, language } },
    select: { id: true },
  });

  if (!translation) return;

  await prisma.postTranslationTag.deleteMany({
    where: { postTranslationId: translation.id },
  });

  if (tagIds.length > 0) {
    await prisma.postTranslationTag.createMany({
      data: tagIds.map((tagId) => ({
        postTranslationId: translation.id,
        tagId,
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Check translation status for a post
 */
export async function getPostTranslationStatus(postId: string) {
  try {
    const translations = await prisma.postTranslation.findMany({
      where: { postId },
      select: {
        language: true,
        translationStatus: true,
        isOriginal: true,
        createdAt: true,
      },
    });

    return {
      totalLanguages: translations.length,
      translations: translations.reduce(
        (acc, t) => {
          acc[t.language] = {
            status: t.translationStatus,
            isOriginal: t.isOriginal,
            createdAt: t.createdAt,
          };
          return acc;
        },
        {} as Record<
          string,
          {
            status: string;
            isOriginal: boolean;
            createdAt: Date;
          }
        >
      ),
    };
  } catch (error) {
    console.error("Error getting translation status:", error);
    return null;
  }
}

/**
 * Retry failed translations
 */
export async function retryFailedTranslations(postId: string) {
  try {
    const failedTranslations = await prisma.postTranslation.findMany({
      where: {
        postId,
        translationStatus: "FAILED",
      },
    });

    if (failedTranslations.length === 0) {
      console.log("No failed translations to retry");
      return { success: true, retried: 0 };
    }

    console.log(`🔄 Retrying ${failedTranslations.length} failed translations...`);

    let retried = 0;

    for (const translation of failedTranslations) {
      try {
        // Fetch original content
        const original = await prisma.postTranslation.findFirst({
          where: {
            postId,
            isOriginal: true,
          },
        });

        if (!original) {
          console.warn("Original translation not found");
          continue;
        }

        const sourceLanguage = original.language as Language;
        const targetLanguage = translation.language as Language;

        const formattedContent = formatContentForTranslation(original.content);

        const [retranslatedTitle, retranslatedContent] = await Promise.all([
          await import("./translateText").then((m) =>
            m.translateText(original.title, sourceLanguage, targetLanguage, {
              maxRetries: 3,
            })
          ),
          await import("./translateText").then((m) =>
            m.translateText(formattedContent, sourceLanguage, targetLanguage, {
              maxRetries: 3,
            })
          ),
        ]);

        await prisma.postTranslation.update({
          where: { id: translation.id },
          data: {
            title: retranslatedTitle,
            content: retranslatedContent,
            translationStatus: "AUTO_TRANSLATED",
          },
        });

        retried++;
        console.log(`✓ Retried translation for ${targetLanguage}`);
      } catch (error) {
        console.error(
          `✗ Failed to retry translation for ${translation.language}:`,
          error
        );
      }
    }

    return { success: true, retried };
  } catch (error) {
    console.error("Error retrying translations:", error);
    return { success: false, retried: 0 };
  }
}

function extractTextFromTiptap(node: TiptapNode): string {
  let text = "";

  if (node.text) {
    text += node.text;
  }

  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child: TiptapNode) => {
      text += extractTextFromTiptap(child);
      if (child.type === "paragraph") {
        text += "\n";
      }
    });
  }

  return text;
}

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  [key: string]: unknown;
}
