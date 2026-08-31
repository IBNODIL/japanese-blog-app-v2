/**
 * Language utilities for client-side language switching
 * Handles URL parameters, cookies, and localStorage
 */

export type Language = "uz" | "en" | "ja" | "ru";

const STORAGE_KEY = "blog_language";
const COOKIE_NAME = "blog_language";

export const SUPPORTED_LANGUAGES: Language[] = ["uz", "en", "ja", "ru"];
export const DEFAULT_LANGUAGE: Language = "ja";

export const LANGUAGE_NAMES: Record<Language, string> = {
  uz: "Ўзбек",
  en: "English",
  ja: "日本語",
  ru: "Русский",
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  uz: "🇺🇿",
  en: "🇬🇧",
  ja: "🇯🇵",
  ru: "🇷🇺",
};

/**
 * Get current language from various sources (in priority order)
 * 1. URL query parameter (?lang=EN)
 * 2. User's saved preference in localStorage
 * 3. Browser locale
 * 4. Default language
 */
export function getCurrentLanguage(): Language {
  // Check URL parameter (only in browser)
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang");
    if (urlLang && isValidLanguage(urlLang)) {
      return urlLang as Language;
    }

    // Check localStorage
    const savedLang = localStorage.getItem(STORAGE_KEY);
    if (savedLang && isValidLanguage(savedLang)) {
      return savedLang as Language;
    }

    // Check browser locale
    const browserLang = getBrowserLanguage();
    if (browserLang && isValidLanguage(browserLang)) {
      return browserLang as Language;
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Set language preference
 * Saves to localStorage and optionally updates URL
 */
export function setLanguage(language: Language, updateUrl = true): void {
  if (!isValidLanguage(language)) {
    console.warn(
      `Invalid language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`
    );
    return;
  }

  // Save to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, language);
    setCookie(COOKIE_NAME, language);
  }

  // Update URL with language parameter
  if (updateUrl && typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", language);
    window.history.replaceState({}, "", url.toString());
  }
}

/**
 * Build URL with language parameter
 */
export function buildLanguageUrl(
  baseUrl: string,
  language: Language,
  preserveParams = true
): string {
  const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");

  if (preserveParams && typeof window !== "undefined") {
    // Copy existing query parameters
    const current = new URL(window.location.href);
    current.searchParams.forEach((value, key) => {
      if (key !== "lang") {
        url.searchParams.set(key, value);
      }
    });
  }

  url.searchParams.set("lang", language);
  return url.toString();
}

/**
 * Validate language code
 */
export function isValidLanguage(lang: unknown): boolean {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
}

/**
 * Get browser language
 */
function getBrowserLanguage(): Language | null {
  if (typeof window === "undefined") {
    return null;
  }

  const navigatorLanguage =
    navigator.language || (navigator as unknown as {userLanguage: string}).userLanguage;

  // Extract language code (e.g., "en-US" -> "en")
  const langCode = navigatorLanguage.split("-")[0].toLowerCase();

  // Map browser language codes to our supported languages
  const mapping: Record<string, Language> = {
    uz: "uz",
    en: "en",
    ja: "ja",
    ru: "ru",
    oe: "uz", // Uzbek alternative
  };

  return mapping[langCode] || null;
}

/**
 * Set HTTP cookie
 */
function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;

  const expiresDate = new Date();
  expiresDate.setTime(expiresDate.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${expiresDate.toUTCString()}`;

  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

/**
 * Get HTTP cookie value
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookieName = `${name}=`;
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(cookieName) === 0) {
      return cookie.substring(cookieName.length);
    }
  }

  return null;
}

/**
 * Build language switcher options
 */
export function getLanguageSwitcherOptions(current?: Language) {
  return SUPPORTED_LANGUAGES.map((lang) => ({
    code: lang,
    name: LANGUAGE_NAMES[lang],
    flag: LANGUAGE_FLAGS[lang],
    isCurrent: lang === (current || getCurrentLanguage()),
  }));
}

/**
 * Format language display name with flag
 */
export function formatLanguageDisplay(language: Language): string {
  return `${LANGUAGE_FLAGS[language]} ${LANGUAGE_NAMES[language]}`;
}
