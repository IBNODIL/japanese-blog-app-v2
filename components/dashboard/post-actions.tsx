"use client";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, EyeOff, Eye, Upload, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import { useLoadingAction } from "@/hooks/use-loading-action";

interface PostActionsProps {
  postId: string;
  isOwner: boolean;
  hidden?: boolean;
  isDraft?: boolean;
  isPublished?: boolean;
}

export function PostActions({ postId, isOwner, hidden = false, isDraft = false, isPublished = false }: PostActionsProps) {
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(hidden);
  const [published, setPublished] = useState(isPublished);

  const doPublish = useCallback(async () => {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    if (res.ok) {
      setPublished(!published);
      toast.success(published ? "Post unpublished" : "Post published");
      router.refresh();
    } else {
      toast.error("Failed to update post status");
    }
  }, [postId, published, router]);

  const doDelete = useCallback(async () => {
    if (!confirm("Delete this post?")) return;

    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Post deleted");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete post");
    }
  }, [postId, router]);

  const doToggleVisibility = useCallback(async () => {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !isHidden }),
    });
    if (res.ok) {
      setIsHidden(!isHidden);
      toast.success(isHidden ? "Post is now visible" : "Post is now hidden");
      router.refresh();
    } else {
      toast.error("Failed to update visibility");
    }
  }, [postId, isHidden, router]);

  const [handlePublish, publishing] = useLoadingAction(doPublish);
  const [handleDelete, deleting] = useLoadingAction(doDelete);
  const [handleToggle, toggling] = useLoadingAction(doToggleVisibility);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" disabled={deleting || toggling || publishing} className="h-8 w-8" title="Post actions" />}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => router.push(`/dashboard/edit/${postId}`)}
          className="cursor-pointer"
        >
          <Pencil className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        {isDraft && (
          <DropdownMenuItem
            onClick={() => handlePublish()}
            disabled={publishing}
            className="cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4" />
            <span>{publishing ? "Publishing..." : "Publish"}</span>
          </DropdownMenuItem>
        )}
        {!isDraft && (
          <DropdownMenuItem
            onClick={() => handlePublish()}
            disabled={publishing}
            className="cursor-pointer"
          >
            <Lock className="mr-2 h-4 w-4" />
            <span>{publishing ? "Unpublishing..." : "Unpublish"}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => handleToggle()}
          disabled={toggling}
          className="cursor-pointer"
        >
          {isHidden ? (
            <>
              <Eye className="mr-2 h-4 w-4" />
              <span>Show</span>
            </>
          ) : (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              <span>Hide</span>
            </>
          )}
        </DropdownMenuItem>
        {isOwner && (
          <DropdownMenuItem
            onClick={() => handleDelete()}
            disabled={deleting}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>{deleting ? "Deleting..." : "Delete"}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
