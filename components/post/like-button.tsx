"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLoadingAction } from "@/hooks/use-loading-action";

interface LikeButtonProps {
  postId: string;
  initialCount: number;
}

export function LikeButton({ postId, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    fetch(`/api/likes?postId=${encodeURIComponent(postId)}`)
      .then((res) => res.json())
      .then((data) => {
        setLiked(data.liked);
        setCount(data.count);
      })
      .catch(() => {});
  }, [postId]);

  const doToggle = useCallback(async () => {
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });

    if (res.status === 401) {
      toast.error("Please sign in to like posts");
      return;
    }

    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setCount((prev) => (data.liked ? prev + 1 : prev - 1));
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
      <Heart
        className={cn(
          "h-5 w-5 transition-colors",
          liked ? "fill-red-500 text-red-500" : ""
        )}
      />
      <span>{count}</span>
    </Button>
  );
}
