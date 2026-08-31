const SUPPORTED_LANGUAGES = ["uz", "ja", "en", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export async function translateText(
  text: string,
  from: string,
  to: string
): Promise<string> {
  if (!text.trim()) return text;
  if (from === to) return text;

  // Split long texts into chunks to stay within URL length limits
  const MAX_CHUNK = 1500;
  if (text.length > MAX_CHUNK) {
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
      translated.push(await translateText(chunk, from, to));
      await new Promise((r) => setTimeout(r, 300));
    }
    return translated.join("");
  }

  // Unofficial Google Translate API — free, no key needed
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}` +
    `&dt=t&q=${encodeURIComponent(text)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Translation failed (${response.status}): ${response.statusText}`
    );
  }

  const data = await response.json();
  // Response format: [[[translated, original, ...], ...], ...]
  if (!data?.[0]) {
    throw new Error("Empty translation response");
  }
  const translated = (data[0] as [string, string][])
    .map((item) => item[0])
    .join("");
  if (!translated) {
    throw new Error("Empty translation response");
  }
  return translated;
}

export function mapLocaleToTranslatorLang(locale: string): string {
  const map: Record<string, string> = {
    uz: "uz",
    ja: "ja",
    en: "en",
    ru: "ru",
  };
  return map[locale] || locale;
}

export function getTargetLanguages(sourceLanguage: string): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang !== sourceLanguage);
}
