/**
 * React hook for language management
 * Provides language state and utilities in components
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCurrentLanguage,
  setLanguage,
  isValidLanguage,
  SUPPORTED_LANGUAGES,
  buildLanguageUrl,
  type Language,
} from "@/lib/language";
import { useRouter, useSearchParams } from "next/navigation";

export function useLanguage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguageState] = useState<Language | null>(() => {
    // Initialize language on mount
    const urlLang = searchParams?.get("lang");
    if (urlLang && isValidLanguage(urlLang)) {
      return urlLang as Language;
    }
    return getCurrentLanguage();
  });

  const changeLanguage = useCallback(
    (newLang: Language) => {
      if (!isValidLanguage(newLang)) {
        console.warn(`Invalid language: ${newLang}`);
        return;
      }

      setLanguage(newLang, false); // Save to localStorage
      setLanguageState(newLang);

      // Update URL with language parameter
      const url = buildLanguageUrl(window.location.pathname, newLang, true);
      router.push(url);
    },
    [router]
  );

  return {
    language: language || "ja",
    setLanguage: changeLanguage,
    isSupported: isValidLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

/**
 * Hook to fetch translated content by language
 */
export function useTranslatedContent(slug: string, language: Language) {
  const [content, setContent] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/posts/${slug}?lang=${language}`, {
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch post: ${response.statusText}`);
        }

        const data = await response.json();
        setContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error fetching translated content:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [slug, language]);

  return { content, loading, error };
}

/**
 * Hook to translate a comment
 */
export function useTranslateComment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (commentId: string, language: Language) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/translate/comment?commentId=${commentId}&language=${language}`
        );

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error translating comment:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { translate, loading, error };
}

/**
 * Hook to get translation status
 */
export function useTranslationStatus(postId: string) {
  const [status, setStatus] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/translate/post-status?postId=${postId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.statusText}`);
        }

        const data = await response.json();
        setStatus(data.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error fetching translation status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [postId]);

  return { status, loading, error };
}
