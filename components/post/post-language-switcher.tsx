"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import type { Locale } from "@/i18n/routing";

interface PostLanguageSwitcherProps {
  postId: string;
  originalLanguage: string;
  currentLocale: string;
}

export function PostLanguageSwitcher({
  originalLanguage,
  currentLocale,
}: PostLanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const languages = [
    { code: "uz", label: "🇺🇿 O'zbek" },
    { code: "ja", label: "🇯🇵 日本語" },
    { code: "en", label: "🇬🇧 English" },
    { code: "ru", label: "🇷🇺 Русский" },
  ];

  const switchLanguage = (lang: string) => {
    router.replace(pathname, { locale: lang as Locale });
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={currentLocale === lang.code ? "default" : "outline"}
          size="sm"
          onClick={() => switchLanguage(lang.code)}
        >
          {lang.label}
          {lang.code === originalLanguage && (
            <span className="ml-1 text-xs opacity-60">(original)</span>
          )}
        </Button>
      ))}
    </div>
  );
}
