import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getSessionUser, isAdmin } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { GoBackButton } from "@/components/go-back-button";

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  edit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default async function HistoryPage() {
  const user = await getSessionUser();
  const locale = await getLocale();

  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  if (!isAdmin(user!)) {
    redirect({ href: "/dashboard/bookmarks", locale });
  }

  const t = await getTranslations("dashboard");

  const history = await prisma.postHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, image: true } },
      post: { select: { title: true, slug: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GoBackButton />
        <h1 className="text-3xl font-bold">{t("history")}</h1>
      </div>

      {history.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No history yet.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 rounded-lg border border-border p-4"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entry.user.name}</span>
                  <Badge
                    className={`text-xs ${actionColors[entry.action] || ""}`}
                  >
                    {entry.action}
                  </Badge>
                  {entry.post && (
                    <Link
                      href={`/post/${entry.post.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {entry.post.title}
                    </Link>
                  )}
                </div>
                {entry.changes && (
                  <p className="text-sm text-muted-foreground">
                    {entry.changes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
