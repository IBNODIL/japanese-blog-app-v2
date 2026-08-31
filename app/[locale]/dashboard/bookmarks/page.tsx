"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { PostCard } from "@/components/post/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

interface BookmarkData {
  id: string;
  post: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    readingTime: number;
    createdAt: string;
    author: { id: string; name: string; image: string | null };
    translations?: {
      title: string;
      slug?: string;
      coverImage?: string | null;
      tags?: { tag: { name: string; slug: string } }[];
    }[];
    _count: { likes: number; comments: number };
  };
}

export default function BookmarksPage() {
  const t = useTranslations("nav");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bookmarks?language=${locale}`)
      .then((res) => res.json())
      .then(setBookmarks)
      .catch(() => toast.error("Failed to load bookmarks"))
      .finally(() => setLoading(false));
  }, [locale]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Bookmark className="h-7 w-7" />
        {t("bookmarks")}
      </h1>

      {bookmarks.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {td("noBookmarks")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {bookmarks.map((bm) => (
            <PostCard key={bm.id} post={bm.post} />
          ))}
        </div>
      )}
    </div>
  );
}
