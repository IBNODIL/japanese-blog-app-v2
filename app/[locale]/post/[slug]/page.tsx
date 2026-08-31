import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PostContent } from "@/components/post/post-content";
import { PostLanguageSwitcher } from "@/components/post/post-language-switcher";
import { LikeButton } from "@/components/post/like-button";
import { BookmarkButton } from "@/components/post/bookmark-button";
import { CommentSection } from "@/components/comments/comment-section";
import { GoBackButton } from "@/components/go-back-button";
import { Clock, Calendar } from "lucide-react";
import type { Metadata } from "next";

interface PostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * Resolve a post by slug, preferring a match against the locale-specific
 * PostTranslation.slug. Falls back to the legacy Post.slug for old links
 * created before slugs became per-language.
 */
async function resolvePostBySlug(slug: string, locale: string) {
  // 1. Try matching a translation row with this exact slug (any language).
  const translationMatch = await prisma.postTranslation.findUnique({
    where: { slug },
    include: {
      tags: { include: { tag: true } },
      post: {
        include: {
          author: { select: { id: true, name: true, image: true } },
          _count: { select: { likes: true, comments: true, bookmarks: true } },
        },
      },
    },
  });

  if (translationMatch) {
    // If the slug belongs to a different language than the current URL
    // locale, the canonical URL for this locale is that locale's own
    // translation slug (if one exists) — redirect there.
    if (translationMatch.language !== locale) {
      const localeTranslation = await prisma.postTranslation.findUnique({
        where: { postId_language: { postId: translationMatch.postId, language: locale } },
        select: { slug: true },
      });
      if (localeTranslation && localeTranslation.slug !== slug) {
        redirect(`/${locale}/post/${localeTranslation.slug}`);
      }
    }
    return { post: translationMatch.post, translation: translationMatch };
  }

  // 2. Legacy fallback: old links used the global Post.slug directly.
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { likes: true, comments: true, bookmarks: true } },
    },
  });
  if (!post) return null;

  const translation = await prisma.postTranslation.findUnique({
    where: { postId_language: { postId: post.id, language: locale } },
    include: { tags: { include: { tag: true } } },
  });

  return { post, translation };
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const resolved = await resolvePostBySlug(slug, locale);
  if (!resolved) return { title: "Post not found" };

  const { post, translation } = resolved;
  const translatedTitle = translation?.title || post.title;
  const coverImage = translation?.coverImage || post.coverImage;

  return {
    title: translatedTitle,
    description: `${translatedTitle} by ${post.author.name}`,
    openGraph: {
      title: translatedTitle,
      description: `${translatedTitle} by ${post.author.name}`,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      authors: [post.author.name],
      ...(coverImage ? { images: [coverImage] } : {}),
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug, locale } = await params;
  const t = await getTranslations("post");

  const resolved = await resolvePostBySlug(slug, locale);
  if (!resolved) notFound();

  const { post, translation } = resolved;

  // Use translated title/content if available for this locale
  const displayTitle = translation?.title || post.title;
  const displayContent = translation?.content || post.content;
  const displayCoverImage = translation?.coverImage || post.coverImage;
  const tags = translation?.tags || [];

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Go Back */}
      <div className="mb-4">
        <GoBackButton />
      </div>

      {/* Cover Image */}
      {displayCoverImage && (
        <div className="mb-8 aspect-video overflow-hidden rounded-xl">
          <img
            src={displayCoverImage}
            alt={displayTitle}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="mb-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
        {displayTitle}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-muted-foreground">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
            <AvatarImage src={post.author.image || ""} />
            <AvatarFallback>
              {post.author.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground text-sm sm:text-base">
            {post.author.name}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs sm:text-sm">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1 text-xs sm:text-sm">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {t("readingTime", { minutes: post.readingTime })}
        </span>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((pt) => (
            <Badge key={pt.tag.slug} variant="secondary">
              {pt.tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Language Switcher */}
      <div className="mb-6">
        <PostLanguageSwitcher
          postId={post.id}
          originalLanguage={post.language}
          currentLocale={locale}
        />
      </div>

      <Separator className="mb-8" />

      {/* Content */}
      <PostContent
        content={displayContent}
      />

      <Separator className="my-8" />

      {/* Actions */}
      <div className="flex items-center gap-4 mb-8">
        <LikeButton postId={post.id} initialCount={post._count.likes} />
        <BookmarkButton postId={post.id} />
      </div>

      <Separator className="my-8" />

      {/* Author Section */}
      <div className="flex items-center gap-3 sm:gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:p-6">
        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
          <AvatarImage src={post.author.image || ""} />
          <AvatarFallback className="text-lg sm:text-xl">
            {post.author.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground">{t("by", { author: "" }).replace(/:\s*$/, "").trim()}</p>
          <p className="text-base sm:text-lg font-semibold truncate">{post.author.name}</p>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Comments */}
      <CommentSection postId={post.id} />
    </article>
  );
}
