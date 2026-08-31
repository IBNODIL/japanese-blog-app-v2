import { defineRouting } from "next-intl/routing";

export const locales = ["uz", "ja", "en", "ru"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ja",
});
