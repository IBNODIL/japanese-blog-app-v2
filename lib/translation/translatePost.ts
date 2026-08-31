/**
 * Translate entire post to all supported languages
 * Returns translations for all languages except the source language
 */

import { translateText } from "./translateText";

export type Language = "uz" | "en" | "ja" | "ru";

const SUPPORTED_LANGUAGES: Language[] = ["uz", "en", "ja", "ru"];

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

interface PostTranslations {
  [key: string]: {
    title: string;
    content: string;
  };
}

interface TranslatePostOptions {
  includeSource?: boolean;
  timeout?: number;
}

/**
 * Translate post title and content to all supported languages
 * @param title - Post title
 * @param content - Post content (plain text or structured text)
 * @param sourceLanguage - Language the content is written in
 * @param options - Additional options
 * @returns Object with translations for each language
 */
export async function translatePost(
  title: string,
  content: string,
  sourceLanguage: Language,
  options: TranslatePostOptions = {}
): Promise<PostTranslations> {
  const { includeSource = false, timeout = 30000 } = options;

  const targetLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => includeSource || lang !== sourceLanguage
  );

  const translations: PostTranslations = {};

  // Translate title and content in parallel for each language
  const translationPromises = targetLanguages.map(async (lang) => {
    try {
      console.log(`🔄 Translating post to ${lang.toUpperCase()}...`);

      // Translate title and content in parallel
      const [translatedTitle, translatedContent] = await Promise.all([
        translateText(title, sourceLanguage, lang, { timeout }),
        translateText(content, sourceLanguage, lang, { timeout }),
      ]);

      translations[lang] = {
        title: translatedTitle,
        content: translatedContent,
      };

      console.log(`✓ Post translated to ${lang.toUpperCase()}`);
    } catch (error) {
      console.error(
        `✗ Failed to translate post to ${lang.toUpperCase()}: ${error}`
      );
      // Return original content on failure
      translations[lang] = {
        title,
        content,
      };
    }
  });

  try {
    await Promise.all(translationPromises);
  } catch (error) {
    console.error("Translation batch processing failed:", error);
  }

  return translations;
}

/**
 * Get list of target languages for translation
 */
export function getTargetLanguages(
  sourceLanguage: Language
): Language[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang !== sourceLanguage);
}

/**
 * Extract all text strings from a TipTap JSON node tree
 * Returns an array of { path, text } so they can be reassembled after translation
 */
function collectTexts(node: TiptapNode, path: string = ""): Array<{ path: string; text: string }> {
  const results: Array<{ path: string; text: string }> = [];

  if (node.text) {
    results.push({ path, text: node.text });
  }

  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child, i) => {
      results.push(...collectTexts(child, `${path}.content[${i}]`));
    });
  }

  return results;
}

/**
 * Deep clone a TipTap JSON node and replace text at given paths
 */
function replaceTexts(
  node: TiptapNode,
  textMap: Map<string, string>,
  path: string = ""
): TiptapNode {
  const clone: TiptapNode = { ...node };

  if (node.text && textMap.has(path)) {
    clone.text = textMap.get(path)!;
  }

  if (node.marks) {
    clone.marks = [...node.marks];
  }

  if (node.attrs) {
    clone.attrs = { ...node.attrs };
  }

  if (node.content && Array.isArray(node.content)) {
    clone.content = node.content.map((child, i) =>
      replaceTexts(child, textMap, `${path}.content[${i}]`)
    );
  }

  return clone;
}

/**
 * Translate a TipTap JSON document, preserving all structure (headings, images, tables, marks, etc.)
 * Only text nodes are translated; everything else is kept intact.
 * Text nodes are batched together with a separator for better translation context and quality.
 */
export async function translateTiptapContent(
  doc: TiptapNode,
  fromLang: Language,
  toLang: Language,
  options: TranslatePostOptions = {}
): Promise<TiptapNode> {
  const { timeout = 30000 } = options;

  const texts = collectTexts(doc);
  if (texts.length === 0) return doc;

  const SEPARATOR = " ||| ";
  const MAX_BATCH = 450; // Leave room for separator overhead within 500 char API limit

  // Batch text nodes together for better translation context
  const batches: Array<{ paths: string[]; originals: string[]; combined: string }> = [];
  let currentPaths: string[] = [];
  let currentOriginals: string[] = [];
  let currentCombined = "";

  for (const { path, text } of texts) {
    const wouldBe = currentCombined
      ? currentCombined + SEPARATOR + text
      : text;

    if (wouldBe.length > MAX_BATCH && currentCombined.length > 0) {
      // Flush current batch
      batches.push({ paths: [...currentPaths], originals: [...currentOriginals], combined: currentCombined });
      currentPaths = [path];
      currentOriginals = [text];
      currentCombined = text;
    } else {
      currentPaths.push(path);
      currentOriginals.push(text);
      currentCombined = wouldBe;
    }
  }
  if (currentCombined.length > 0) {
    batches.push({ paths: currentPaths, originals: currentOriginals, combined: currentCombined });
  }

  // Translate batches and split results back
  const translatedTexts = new Map<string, string>();

  for (const batch of batches) {
    try {
      const translated = await translateText(batch.combined, fromLang, toLang, { timeout });
      const parts = translated.split(/\s*\|\|\|\s*/);

      for (let i = 0; i < batch.paths.length; i++) {
        // Use translated part if available, otherwise fall back to original
        translatedTexts.set(batch.paths[i], parts[i]?.trim() || batch.originals[i]);
      }
    } catch {
      // Keep originals on failure
      for (let i = 0; i < batch.paths.length; i++) {
        translatedTexts.set(batch.paths[i], batch.originals[i]);
      }
    }
  }

  return replaceTexts(doc, translatedTexts);
}

/**
 * Format post content for translation
 * Handles JSON content if needed
 */
export function formatContentForTranslation(
  content: unknown
): string {
  if (typeof content === "string") {
    return content;
  }

  if (typeof content === "object" && content !== null) {
    // If it's a Tiptap JSON structure, extract text
    if ("type" in content && content.type === "doc") {
      return extractTextFromTiptap(content as TiptapNode);
    }

    // Try to stringify JSON content
    return JSON.stringify(content);
  }

  return String(content);
}

/**
 * Extract plain text from Tiptap JSON structure
 */
function extractTextFromTiptap(node: TiptapNode): string {
  let text = "";

  if (node.text) {
    text += node.text;
  }

  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child: TiptapNode) => {
      text += extractTextFromTiptap(child);
      // Add line breaks between paragraphs
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
