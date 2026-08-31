import { getSessionUser, isAdmin } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const locale = await getLocale();

  if (!user || !isAdmin(user)) {
    redirect({ href: "/dashboard/bookmarks", locale });
  }

  return <>{children}</>;
}
