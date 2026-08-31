/**
 * Core translation function using unofficial Google Translate API
 * Free, no API key needed, supports uz, en, ja, ru
 */

type Language = "uz" | "en" | "ja" | "ru";

const REQUEST_TIMEOUT = 30000;

interface TranslateOptions {
  maxRetries?: number;
  timeout?: number;
}

/**
 * Translate text from one language to another using Google Translate
 */
export async function translateText(
  text: string,
  fromLang: Language,
  toLang: Language,
  options: TranslateOptions = {}
): Promise<string> {
  const { maxRetries = 2, timeout = REQUEST_TIMEOUT } = options;

  if (fromLang === toLang) {
    return text;
  }

  if (!text || text.trim().length === 0) {
    return text;
  }

  // Split long texts into chunks to stay within URL length limits
  const MAX_CHUNK = 1500;
  if (text.length > MAX_CHUNK) {
    return translateLongText(text, fromLang, toLang, options);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const url =
        `https://translate.googleapis.com/translate_a/single` +
        `?client=gtx&sl=${encodeURIComponent(fromLang)}&tl=${encodeURIComponent(toLang)}` +
        `&dt=t&q=${encodeURIComponent(text)}`;

      console.log(`[translateText] Calling Google Translate: ${fromLang} → ${toLang} (${text.length} chars)`);

      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as [[string, string][]];

      if (!data?.[0]) {
        throw new Error("Empty translation response from Google");
      }

      const result = (data[0] as [string, string][]).map((item) => item[0]).join("");

      if (!result) {
        throw new Error("Empty translation result from Google");
      }

      console.log(`✓ Translated: ${fromLang} → ${toLang} (${text.length} chars) → "${result.substring(0, 60)}..."`);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `⚠ Translation attempt ${attempt + 1}/${maxRetries + 1} failed: ${errorMessage}`
      );

      if (attempt === maxRetries) {
        console.error(
          `✗ Translation failed after ${maxRetries + 1} attempts: ${fromLang} → ${toLang} — ERROR: ${errorMessage}`
        );
        throw new Error(`Translation failed: ${errorMessage}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error("Translation failed: all attempts exhausted");
}

/**
 * Translate long text by splitting into chunks
 */
async function translateLongText(
  text: string,
  fromLang: Language,
  toLang: Language,
  options: TranslateOptions
): Promise<string> {
  const MAX_CHUNK = 500;
  // Split on sentence boundaries where possible
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK && current.length > 0) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);

  const translated: string[] = [];
  for (const chunk of chunks) {
    const result = await translateText(chunk, fromLang, toLang, options);
    translated.push(result);
    // Small delay between chunks to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return translated.join("");
}

/**
 * Translate multiple texts in batch
 * @param texts - Array of texts to translate
 * @param fromLang - Source language
 * @param toLang - Target language
 * @returns Array of translated texts
 */
export async function translateBatch(
  texts: string[],
  fromLang: Language,
  toLang: Language
): Promise<string[]> {
  // Process in parallel for efficiency
  const results = await Promise.all(
    texts.map((text) => translateText(text, fromLang, toLang))
  );
  return results;
}

/**
 * Check if translation is needed
 */
export function isTranslationNeeded(fromLang: Language, toLang: Language): boolean {
  return fromLang !== toLang;
}
