import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { getSessionUser, isAdmin, isSuperAdmin } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Heart, MessageCircle, Plus, FileText as FileDraft, Users, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
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
  const tc = await getTranslations("common");
  const postFilter = {};

  const [totalPosts, totalLikes, totalComments, totalPartners] = await Promise.all([
    prisma.post.count({ where: postFilter }),
    prisma.like.count({
      where: { post: postFilter },
    }),
    prisma.comment.count({
      where: { post: postFilter },
    }),
    prisma.partner.count(),
  ]);

  const recentPosts = await prisma.post.findMany({
    where: postFilter,
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      _count: { select: { likes: true, comments: true } },
    },
  });

  const recentPartners = await prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/create?draft=true">
            <Button variant="outline" className="flex-1 sm:flex-none">
              <FileDraft className="mr-2 h-4 w-4" />
              {t("draft")}
            </Button>
          </Link>
          <Link href="/dashboard/create">
            <Button className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              {t("createPost")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalPosts")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalLikes")}
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalComments")}
            </CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalPartners")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPartners}</div>
          </CardContent>
        </Card>
      </div>

      {/* Super Admin Management Section */}
      {isSuperAdmin(user) && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Super Admin Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/dashboard/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/dashboard/partners">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Partners
                </Button>
              </Link>
              <Link href="/dashboard/homepage">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Manage Homepage
                </Button>
              </Link>
              <Link href="/dashboard/footer">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Footer
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Partners - Only show for Super Admin */}
      {isSuperAdmin(user) && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("partnersManagement")}</CardTitle>
          <Link href="/dashboard/partners">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("manage")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentPartners.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("noPartnersYet")}
            </p>
          ) : (
            <div className="space-y-3">
              {recentPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center gap-4 rounded-lg border border-border p-3"
                >
                  <div className="h-12 w-12 overflow-hidden rounded border border-border bg-muted">
                    <img
                      src={partner.image}
                      alt={partner.name}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{partner.name}</p>
                    {partner.text && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {partner.text}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle>{t("myPosts")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("noPosts")}
            </p>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 sm:p-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/dashboard/edit/${post.id}`}
                      className="font-medium hover:underline line-clamp-2 block"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post._count.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post._count.comments}
                      </span>
                    </div>
                  </div>
                  <Link href={`/dashboard/edit/${post.id}`} className="shrink-0">
                    <Button variant="outline" size="sm">
                      {tc("edit")}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
