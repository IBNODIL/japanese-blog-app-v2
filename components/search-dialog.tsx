"use client";

import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useRouter } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
}

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle Escape key and clicking outside to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (open && (e.target as HTMLElement)?.getAttribute?.("data-slot") === "dialog-overlay") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.posts || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange}
      showCloseButton={true}
    >
      <CommandInput
        placeholder={t("placeholder")}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "..." : t("noResults")}
        </CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading={t("results", { count: results.length })}>
            {results.map((post) => (
              <CommandItem
                key={post.id}
                onSelect={() => {
                  router.push(`/post/${post.slug}`);
                  onOpenChange(false);
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                {post.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
