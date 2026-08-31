"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Languages, Loader2, MessageCircle, Reply, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";

interface Comment {
  id: string;
  content: string;
  language: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
  replies: Comment[];
}

interface CommentSectionProps {
  postId: string;
}

// Extracted as separate component to prevent remounting
const CommentItem = memo(function CommentItem({
  comment,
  isReply = false,
  replyingTo,
  replyContents,
  translatedComments,
  translatingIds,
  onTextareaRef,
  onReplyChange,
  onReplyClick,
  onCancelReply,
  onSubmitReply,
  onDelete,
  onTranslate,
  submitting,
  locale,
  sessionUserId,
  t,
}: CommentItemProps) {
  return (
    <div className={`${isReply ? "ml-8 mt-3" : "mt-4"}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.author.image || ""} />
          <AvatarFallback>
            {comment.author.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {comment.author.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 text-sm">
              {translatedComments[comment.id] || comment.content}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onTranslate(comment.id)}
              disabled={translatingIds.has(comment.id) || comment.language === locale}
            >
              {translatingIds.has(comment.id) ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Languages className="mr-1 h-3 w-3" />
              )}
              {translatedComments[comment.id] ? t("showOriginal") : t("translate")}
            </Button>
            {!isReply && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onReplyClick(comment.id)}
              >
                <Reply className="mr-1 h-3 w-3" />
                {t("reply")}
              </Button>
            )}
            {sessionUserId === comment.author.id && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onDelete(comment.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {t("deleteComment")}
              </Button>
            )}
          </div>

          {/* Reply Box */}
          {replyingTo === comment.id && (
            <div className="mt-2 space-y-2">
              <Textarea
                ref={(el: HTMLTextAreaElement | null) => {
                  onTextareaRef(comment.id, el);
                }}
                value={replyContents[comment.id] || ""}
                onChange={(e) => onReplyChange(comment.id, e.target.value)}
                placeholder={t("placeholder")}
                className="min-h-15"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelReply(comment.id)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSubmitReply(comment.id)}
                  disabled={submitting || !(replyContents[comment.id]?.trim())}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("reply")
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies?.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply
              replyingTo={replyingTo}
              replyContents={replyContents}
              translatedComments={translatedComments}
              translatingIds={translatingIds}
              onTextareaRef={onTextareaRef}
              onReplyChange={onReplyChange}
              onReplyClick={onReplyClick}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              onDelete={onDelete}
              onTranslate={onTranslate}
              submitting={submitting}
              locale={locale}
              sessionUserId={sessionUserId}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

CommentItem.displayName = "CommentItem";


interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  replyingTo: string | null;
  replyContents: Record<string, string>;
  translatedComments: Record<string, string>;
  translatingIds: Set<string>;
  onTextareaRef: (commentId: string, el: HTMLTextAreaElement | null) => void;
  onReplyChange: (commentId: string, content: string) => void;
  onReplyClick: (commentId: string) => void;
  onCancelReply: (commentId: string) => void;
  onSubmitReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onTranslate: (commentId: string) => void;
  submitting: boolean;
  locale: string;
  sessionUserId?: string;
  t: (key: string) => string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const t = useTranslations("comment");
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const locale = useLocale();
  
  // Refs to store textarea elements for each comment
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const handleTextareaRef = useCallback((commentId: string, el: HTMLTextAreaElement | null) => {
    textareaRefs.current[commentId] = el;
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}&locale=${locale}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [postId, locale]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Focus textarea when reply is opened
  useEffect(() => {
    if (replyingTo && textareaRefs.current[replyingTo]) {
      requestAnimationFrame(() => {
        textareaRefs.current[replyingTo]?.focus();
      });
    }
  }, [replyingTo]);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment, postId }),
      });

      if (res.status === 401) {
        toast.error("Please sign in to comment");
        return;
      }

      if (res.ok) {
        setNewComment("");
        fetchComments();
        toast.success("Comment added");
      }
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    const replyContent = replyContents[parentId] || "";
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent, postId, parentId }),
      });

      if (res.ok) {
        setReplyContents((prev) => {
          const next = { ...prev };
          delete next[parentId];
          return next;
        });
        setReplyingTo(null);
        fetchComments();
        toast.success("Reply added");
      }
    } catch {
      toast.error("Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?") || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchComments();
        toast.success("Comment deleted");
      }
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTranslate = async (commentId: string) => {
    if (translatedComments[commentId]) {
      // Toggle off - remove translation
      setTranslatedComments((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      return;
    }

    setTranslatingIds((prev) => new Set(prev).add(commentId));
    try {
      const res = await fetch(
        `/api/comments/${encodeURIComponent(commentId)}/translate?lang=${locale}`
      );
      if (res.ok) {
        const data = await res.json();
        setTranslatedComments((prev) => ({ ...prev, [commentId]: data.content }));
      } else {
        toast.error(t("translateFailed"));
      }
    } catch {
      toast.error(t("translateFailed"));
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const handleReplyChange = useCallback((commentId: string, content: string) => {
    setReplyContents((prev) => ({
      ...prev,
      [commentId]: content,
    }));
  }, []);

  const handleReplyClick = useCallback((commentId: string) => {
    setReplyingTo((prev) => (prev === commentId ? null : commentId));
  }, []);

  const handleCancelReply = useCallback((commentId: string) => {
    setReplyContents((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    setReplyingTo(null);
  }, []);



  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-20 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5" />
        {t("addComment")} ({comments.length})
      </h3>

      {/* New Comment Box */}
      {session?.user ? (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={session.user.image || ""} />
            <AvatarFallback>
              {session.user.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t("placeholder")}
              className="min-h-20"
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              size="sm"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("addComment")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Please sign in to comment.
        </p>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <p className="mt-4 text-muted-foreground text-center py-4">
          {t("noComments")}
        </p>
      ) : (
        <div className="mt-4 space-y-0">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replyingTo={replyingTo}
              replyContents={replyContents}
              translatedComments={translatedComments}
              translatingIds={translatingIds}
              onTextareaRef={handleTextareaRef}
              onReplyChange={handleReplyChange}
              onReplyClick={handleReplyClick}
              onCancelReply={handleCancelReply}
              onSubmitReply={handleReply}
              onDelete={handleDelete}
              onTranslate={handleTranslate}
              submitting={submitting}
              locale={locale}
              sessionUserId={session?.user?.id}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
