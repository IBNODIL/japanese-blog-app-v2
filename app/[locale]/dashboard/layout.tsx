import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const locale = await getLocale();

  if (!session?.user) {
    redirect({ href: "/sign-in", locale });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</div>
  );
}
