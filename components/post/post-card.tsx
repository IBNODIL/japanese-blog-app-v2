"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Clock } from "lucide-react";

interface PostCardProps {
  post: {
    id: string;
    title: string;
    slug: string; // legacy/original-language slug, used as a fallback
    coverImage?: string | null; // legacy/original-language cover, used as a fallback
    readingTime: number;
    createdAt: string | Date;
    author: { id: string; name: string; image: string | null };
    _count: { likes: number; comments: number };
    // Per-locale translation data (title/slug/coverImage/tags for the
    // language currently being viewed). Falls back to the fields above
    // when no translation row exists yet for this locale.
    translations?: {
      title: string;
      slug?: string;
      coverImage?: string | null;
      tags?: { tag: { name: string; slug: string } }[];
    }[];
  };
}

export function PostCard({ post }: PostCardProps) {
  const t = useTranslations("post");
  const translation = post.translations?.[0];
  const displayTitle = translation?.title || post.title;
  const displaySlug = translation?.slug || post.slug;
  const displayCoverImage = translation?.coverImage ?? post.coverImage;
  const displayTags = translation?.tags || [];

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      {/* Tags Section - Moved to Top */}
      {displayTags.length > 0 && (
        <CardHeader className="pb-2">
          <div className="flex flex-wrap gap-1.5">
            {displayTags.slice(0, 3).map((pt) => (
              <Badge key={pt.tag.slug} variant="secondary" className="text-xs">
                {pt.tag.name}
              </Badge>
            ))}
          </div>
        </CardHeader>
      )}

      {displayCoverImage && (
        <Link href={`/post/${displaySlug}`}>
          <div className="aspect-video overflow-hidden">
            <img
              src={displayCoverImage}
              alt={displayTitle}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </Link>
      )}
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.author.image || ""} />
            <AvatarFallback>
              {post.author.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {post.author.name}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(post.createdAt)}
          </span>
        </div>
        <Link href={`/post/${displaySlug}`}>
          <h3 className="text-xl font-bold leading-tight hover:underline">
            {displayTitle}
          </h3>
        </Link>
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {post._count.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {post._count.comments}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t("readingTime", { minutes: post.readingTime })}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
