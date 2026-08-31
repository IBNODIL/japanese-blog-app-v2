import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostActions } from "@/components/dashboard/post-actions";
import { Heart, MessageCircle } from "lucide-react";
import { getSessionUser, isAdmin, type SessionUser } from "@/lib/session";

// 1. TIPlar To'g'rilandi: Sxemangizga mos ravishda PostTranslationTag va Tag tiplari berildi
interface Post {
  id: string;
  title: string;
  slug: string;
  hidden: boolean;
  authorId: string;
  published: boolean;
  createdAt: Date;
  author: { id: string; name: string; image: string | null };
  translations: Array<{
    language: string;
    tags: Array<{
      postTranslationId: string;
      tagId: string;
      tag: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  }>;
  _count: { likes: number; comments: number };
}

interface PostListProps {
  posts: Post[];
  tp: (key: string) => string;
  formatDate: (date: Date) => string;
  user: SessionUser;
  isAdmin: (user: SessionUser) => boolean;
}

function PostList({ posts, tp, formatDate, user, isAdmin }: PostListProps) {
  return (
    <div className="space-y-3">
      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {tp("noPostsYet")}
        </p>
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className={`flex items-start justify-between gap-4 rounded-lg border border-border p-4 ${post.hidden ? "opacity-50" : ""
              }`}
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/post/${post.slug}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {post.title}
                </Link>
                {post.hidden && (
                  <Badge variant="outline" className="text-xs">
                    Hidden
                  </Badge>
                )}
              </div>
              {isAdmin(user) && post.authorId !== user.id && (
                <p className="text-xs text-muted-foreground">
                  by {post.author.name}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {Array.from(
                  new Map(
                    post.translations.flatMap((tr) => tr.tags).map((pt) => [pt.tagId, pt])
                  ).values()
                ).map((pt) => (
                  <Badge key={pt.tagId} variant="secondary">
                    {pt.tag.name}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {post._count.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {post._count.comments}
                </span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
            <PostActions
              postId={post.id}
              isOwner={post.authorId === user.id}
              hidden={post.hidden}
              isDraft={!post.published}
              isPublished={post.published}
            />
          </div>
        ))
      )}
    </div>
  );
}

export default async function PostsPage() {
  const user = await getSessionUser();
  const locale = await getLocale();

  if (!user) {
    redirect({ href: "/sign-in", locale });
    return null as never;
  }

  if (!isAdmin(user)) {
    redirect({ href: "/dashboard/bookmarks", locale });
    return null as never;
  }

  const t = await getTranslations("dashboard");
  const tp = await getTranslations("post");
  const tc = await getTranslations("common");

  const postWhere = isAdmin(user) ? {} : { authorId: user.id };
  
  // 2. SO'ROV TO'G'RILANDI: tags munosabati sxemadagidek translations ichiga qaytarildi
  const allPosts = (await prisma.post.findMany({
    where: postWhere,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, image: true } },
      translations: {
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  })) as unknown as Post[]; // TypeScript tiplari mos kelishi uchun majburiy "as unknown as Post[]" kasting qo'shildi

  const published = allPosts.filter((p) => p.published);
  const drafts = allPosts.filter((p) => !p.published);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("myPosts")}</h1>
        <Link href="/dashboard/create">
          <Button>{t("createPost")}</Button>
        </Link>
      </div>

      <Tabs defaultValue="all" className="flex flex-col">
        <div>
          <TabsList>
            <TabsTrigger value="all">
              {tc("all")} ({allPosts.length})
            </TabsTrigger>
            <TabsTrigger value="published">
              {t("publishedPosts")} ({published.length})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              {t("drafts")} ({drafts.length})
            </TabsTrigger>
          </TabsList>
        </div>
        <div>
          <TabsContent value="all">
            <PostList posts={allPosts} tp={tp} formatDate={formatDate} user={user} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="published">
            <PostList posts={published} tp={tp} formatDate={formatDate} user={user} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="drafts">
            <PostList posts={drafts} tp={tp} formatDate={formatDate} user={user} isAdmin={isAdmin} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
