"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLoadingAction } from "@/hooks/use-loading-action";

interface BookmarkButtonProps {
  postId: string;
}

export function BookmarkButton({ postId }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    fetch(`/api/bookmarks?postId=${encodeURIComponent(postId)}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setBookmarked(data.bookmarked);
      })
      .catch(() => {});
  }, [postId]);

  const doToggle = useCallback(async () => {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });

    if (res.status === 401) {
      toast.error("Please sign in to bookmark posts");
      return;
    }

    if (res.ok) {
      const data = await res.json();
      setBookmarked(data.bookmarked);
      toast.success(data.bookmarked ? "Bookmarked!" : "Removed bookmark");
    }
  }, [postId]);

  const [handleToggle, toggling] = useLoadingAction(doToggle);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleToggle()}
      disabled={toggling}
      className="gap-2"
    >
      <Bookmark
        className={cn(
          "h-5 w-5 transition-colors",
          bookmarked ? "fill-current" : ""
        )}
      />
      <span>{bookmarked ? "Saved" : "Save"}</span>
    </Button>
  );
}
