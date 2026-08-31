import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";
import messagesUz from "../messages/uz.json";
import messagesJa from "../messages/ja.json";
import messagesEn from "../messages/en.json";
import messagesRu from "../messages/ru.json";

const messages: Record<Locale, typeof messagesUz> = {
  uz: messagesUz,
  ja: messagesJa,
  en: messagesEn,
  ru: messagesRu,
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale as Locale],
  };
});
