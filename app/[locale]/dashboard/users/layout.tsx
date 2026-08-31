import { getSessionUser, isSuperAdmin } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const locale = await getLocale();

  if (!user || !isSuperAdmin(user)) {
    redirect({ href: "/dashboard/bookmarks", locale });
  }

  return <>{children}</>;
}
