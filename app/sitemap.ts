import { prisma } from "@/lib/prisma";
import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const locales = ["uz", "en", "ja", "ru"];

  const posts = await prisma.post.findMany({
    where: { published: true },
    select: {
      slug: true,
      updatedAt: true,
      translations: { select: { language: true, slug: true } },
    },
  });

  const staticPages = locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
  ]);

  // Emit one URL per post per locale, using that locale's own translation
  // slug when available. Falls back to the post's original slug for
  // locales that don't yet have a translation row.
  const postPages = posts.flatMap((post) =>
    locales.map((locale) => {
      const translationSlug = post.translations.find((t) => t.language === locale)?.slug;
      return {
        url: `${baseUrl}/${locale}/post/${translationSlug || post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    })
  );

  return [...staticPages, ...postPages];
}
