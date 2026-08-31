"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PostCard } from "@/components/post/post-card";
import { GoBackButton } from "@/components/go-back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Search, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  readingTime: number;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
  translations?: {
    title: string;
    slug?: string;
    coverImage?: string | null;
    language?: string;
    tags?: { tag: { name: string; slug: string } }[];
  }[];
  _count: { likes: number; comments: number };
  language: string;
}

interface Tag {
  name: string;
  slug: string;
}

interface Author {
  id: string;
  name: string;
  image?: string;
}

export default function AdvancedSearchPage() {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();

  // State for search and filters
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");
  const [searchFields, setSearchFields] = useState(
    searchParams.get("fields") || "all"
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tags")?.split(",").filter(Boolean) || []
  );
  const [selectedLanguage, setSelectedLanguage] = useState(
    searchParams.get("language") || ""
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");

  // UI states
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  // Fetch all available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const res = await fetch("/api/tags");
        if (res.ok) {
          const data = await res.json();
          setAllTags(data.tags || []);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setTagsLoading(false);
      }
    };
    fetchTags();
  }, []);

  // Perform search
  const performSearch = async (
    searchQuery: string,
    pageNum: number,
    sort: string,
    fields: string,
    tags: string[],
    language: string,
    from: string,
    to: string
  ) => {
    if (!searchQuery.trim() && tags.length === 0) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: pageNum.toString(),
        limit: "12",
        sortBy: sort,
        searchFields: fields,
      });

      if (tags.length > 0) {
        params.append("tags", tags.join(","));
      }
      
      // Only pass language filter if user explicitly selected one
      // Always fetch translations for system language
      if (language) {
        params.append("language", language);
      } else {
        // For translations when not filtering by language
        params.append("translationLanguage", locale);
      }
      
      if (from) {
        params.append("dateFrom", from);
      }
      if (to) {
        params.append("dateTo", to);
      }

      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.posts || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);

        // Update URL with locale
        const urlParams = new URLSearchParams({
          q: searchQuery,
          page: pageNum.toString(),
          sort,
          fields,
        });
        if (tags.length > 0) urlParams.append("tags", tags.join(","));
        if (language) urlParams.append("language", language);
        if (from) urlParams.append("dateFrom", from);
        if (to) urlParams.append("dateTo", to);

        router.replace(`/${locale}/search?${urlParams.toString()}`, {
          scroll: false,
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all posts on page load or when language changes
  useEffect(() => {
    const fetchAllPosts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "100",
          sortBy: "newest",
          translationLanguage: locale, // Get translations for system language
        });

        const res = await fetch(`/api/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.posts || []);
          setTotal(data.total || 0);
          setTotalPages(Math.ceil((data.total || 0) / 100));
        } else {
          console.error("API error:", res.status);
          setResults([]);
          setTotal(0);
          setTotalPages(0);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setResults([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    // Fetch all posts on initial load or when locale changes
    fetchAllPosts();
  }, [locale]);

  // Handle search
  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
    performSearch(
      newQuery,
      1,
      sortBy,
      searchFields,
      selectedTags,
      selectedLanguage,
      dateFrom,
      dateTo
    );
  };

  // Handle filter changes
  const handleApplyFilters = () => {
    setPage(1);
    performSearch(
      query,
      1,
      sortBy,
      searchFields,
      selectedTags,
      selectedLanguage,
      dateFrom,
      dateTo
    );
    setShowFilters(false);
  };

  // Toggle tag selection
  const toggleTag = (tagSlug: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagSlug)
        ? prev.filter((t) => t !== tagSlug)
        : [...prev, tagSlug]
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setQuery("");
    setSelectedTags([]);
    setSelectedLanguage("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setSortBy("newest");
    setSearchFields("all");

    // Reload all posts with system language translations
    const params = new URLSearchParams({
      limit: "100",
      sortBy: "newest",
      translationLanguage: locale, // Get translations for system language
    });

    setLoading(true);
    fetch(`/api/search?${params}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data) => {
        setResults(data.posts || []);
        setTotal(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / 100));
      })
      .catch((error) => {
        console.error("Failed to load posts:", error);
        setResults([]);
      })
      .finally(() => setLoading(false));
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      performSearch(
        query,
        newPage,
        sortBy,
        searchFields,
        selectedTags,
        selectedLanguage,
        dateFrom,
        dateTo
      );
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      performSearch(
        query,
        newPage,
        sortBy,
        searchFields,
        selectedTags,
        selectedLanguage,
        dateFrom,
        dateTo
      );
    }
  };

  const hasActiveFilters =
    query ||
    selectedTags.length > 0 ||
    selectedLanguage ||
    dateFrom ||
    dateTo;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-2">
          <GoBackButton />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("subtitle")}
        </p>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleApplyFilters();
        }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={t("placeholder")}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full text-base sm:text-sm"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={!hasActiveFilters || loading}
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showFilters ? "rotate-180" : ""
              }`}
            />
            {(selectedTags.length > 0 ||
              selectedLanguage ||
              dateFrom ||
              dateTo) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </Button>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 border rounded-lg bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Sort */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("sortBy")}
              </label>
              <Select value={sortBy} onValueChange={(value) => value && setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t("relevance")}</SelectItem>
                  <SelectItem value="newest">{t("newest")}</SelectItem>
                  <SelectItem value="oldest">{t("oldest")}</SelectItem>
                  <SelectItem value="popular">{t("mostPopular")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Fields */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("searchBy")}
              </label>
              <Select value={searchFields} onValueChange={(value) => value && setSearchFields(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allFields")}</SelectItem>
                  <SelectItem value="title">{t("titleField")}</SelectItem>
                  <SelectItem value="content">{t("content")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {tc("language")}
              </label>
              <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value || "")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("allLanguages")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("allLanguages")}</SelectItem>
                  <SelectItem value="en">{t("english")}</SelectItem>
                  <SelectItem value="ja">{t("japanese")}</SelectItem>
                  <SelectItem value="uz">{t("uzbek")}</SelectItem>
                  <SelectItem value="ru">{t("russian")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("fromDate")}
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium mb-2">{t("toDate")}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Tags Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {tc("tags")} ({selectedTags.length})
            </label>
            {tagsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                {allTags.map((tag) => (
                  <Badge
                    key={tag.slug}
                    variant={
                      selectedTags.includes(tag.slug) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag.slug)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noTagsAvailable")}</p>
            )}
          </div>

          {/* Filter Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
            >
              {t("clearAll")}
            </Button>
            <Button type="button" onClick={handleApplyFilters} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("searching")}
                </>
              ) : (
                t("applyFilters")
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mb-6 sm:mb-8">
          {query && (
            <div className="mb-3 text-sm text-muted-foreground">
              {total > 0 ? (
                <span>
                  Found {total} result{total !== 1 ? "s" : ""} for{" "}
                  <span className="font-semibold">&quot;{query}&quot;</span>
                </span>
              ) : loading ? (
                <span>{tc("loading")}</span>
              ) : (
                <span>No results found for &quot;{query}&quot;</span>
              )}
            </div>
          )}

          {/* Active Filter Tags */}
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tagSlug) => {
              const tag = allTags.find((t) => t.slug === tagSlug);
              return (
                <Badge
                  key={tagSlug}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag?.name || tagSlug}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setSelectedTags((prev) =>
                        prev.filter((t) => t !== tagSlug)
                      );
                    }}
                  />
                </Badge>
              );
            })}
            {selectedLanguage && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1"
              >
                {t("language")}: {selectedLanguage}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSelectedLanguage("")}
                />
              </Badge>
            )}
            {dateFrom && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1"
              >
                {t("from")}: {dateFrom}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setDateFrom("")}
                />
              </Badge>
            )}
            {dateTo && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1"
              >
                {t("to")}: {dateTo}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setDateTo("")}
                />
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {loading && !results.length ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {results.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                onClick={handlePreviousPage}
                disabled={page === 1}
                variant="outline"
              >
                {tc("previous")}
              </Button>
              <div className="text-sm text-muted-foreground">
                {t("page").replace("{page}", page.toString()).replace("{total}", totalPages.toString())}
              </div>
              <Button
                onClick={handleNextPage}
                disabled={page === totalPages}
                variant="outline"
              >
                {tc("next")}
              </Button>
            </div>
          )}
        </>
      ) : hasActiveFilters ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("noResults")}</p>
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="mt-4"
          >
            {t("clearFiltersAndTryAgain")}
          </Button>
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {t("noPostsAvailable")}
          </p>
        </div>
      )}
    </div>
  );
}
