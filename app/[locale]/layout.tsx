import { Inter, Noto_Sans_JP } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "@/app/globals.css";
import messagesUz from "@/messages/uz.json";
import messagesJa from "@/messages/ja.json";
import messagesEn from "@/messages/en.json";
import messagesRu from "@/messages/ru.json";

const messages: Record<Locale, typeof messagesUz> = {
  uz: messagesUz,
  ja: messagesJa,
  en: messagesEn,
  ru: messagesRu,
};

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
});

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const localeMessages = messages[locale as Locale];

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${notoSansJP.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased">
        <NextIntlClientProvider messages={localeMessages} locale={locale}>
          <Providers>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
