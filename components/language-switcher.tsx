/**
 * Language Switcher Component
 * Displays available languages with flags
 * Handles language switching and URL updates
 */

"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { formatLanguageDisplay, getLanguageSwitcherOptions } from "@/lib/language";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const options = getLanguageSwitcherOptions(language);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-2" title="Change language" />}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">
          {formatLanguageDisplay(language)}
        </span>
        <span className="sm:hidden">{language.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => {
              setLanguage(option.code);
              setOpen(false);
            }}
            className="gap-2"
          >
            <span>{option.flag}</span>
            <span>{option.name}</span>
            {option.isCurrent && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Inline Language Selector
 * For use in footers or secondary navigation
 */
export function LanguageSelectorInline() {
  const { language, setLanguage, supportedLanguages } = useLanguage();

  return (
    <div className="flex gap-2">
      {supportedLanguages.map((lang) => (
        <Button
          key={lang}
          variant={language === lang ? "default" : "outline"}
          size="sm"
          onClick={() => setLanguage(lang)}
          className="font-medium"
        >
          {lang.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
