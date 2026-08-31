"use client";

import { redirect } from "next/navigation";
import { useLocale } from "next-intl";

export default function AdvancedSearchPage() {
  const locale = useLocale();
  redirect(`/${locale}/posts`);
}
