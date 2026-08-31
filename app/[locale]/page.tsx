import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { PostCard } from "@/components/post/post-card";
import { PostCarousel } from "@/components/post/post-carousel";
import { HeroSection } from "@/components/layout/hero-section";
import { PartnersCarousel } from "@/components/layout/partners-carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; tag?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("post");
  const tc = await getTranslations("common");
  const tp = await getTranslations("partners");
  const th = await getTranslations("hero");
  const { page: pageStr, tag } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 12;

  const where: Record<string, unknown> = { published: true, hidden: false };
  if (tag) {
    where.translations = { some: { tags: { some: { tag: { slug: tag } } } } };
  }

  // Get posts with translation filtering
  const [posts, total, featuredPosts, allTags] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, image: true } },
        translations: {
          where: { language: locale },
          select: { title: true, slug: true, coverImage: true, tags: { include: { tag: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit * 2, // Fetch more to account for filtering
    }),
    prisma.post.count({ where }),
    prisma.post.findMany({
        where: { published: true, hidden: false, featured: true },
        include: {
          author: { select: { id: true, name: true, image: true } },
          translations: {
            where: { language: locale },
            select: { title: true, slug: true, coverImage: true, tags: { include: { tag: true } } },
          },
          _count: { select: { likes: true, comments: true } },
        },
        take: 3,
      }),
      prisma.tag.findMany({
        include: { _count: { select: { posts: true } } },
        orderBy: { posts: { _count: "desc" } },
        take: 20,
      }),
    ]);

  const totalPages = Math.ceil(total / limit);

  // Filter posts to only show those with translations for current locale
  const filteredPosts = posts
    .filter((post) => post.translations.length > 0 || post.language === locale)
    .slice(0, limit);

  // Filter featured posts
  const filteredFeaturedPosts = featuredPosts.filter(
    (post) => post.translations.length > 0 || post.language === locale
  );

  // Fetch homepage content for the current locale
  const homepageContent = await prisma.homepageContent.findUnique({
    where: { language: locale },
  });

  // Use homepage content or fallback to translations
  const heroTranslations = {
    subtitle: homepageContent?.subtitle || th("subtitle"),
    welcome: homepageContent?.title || th("welcome"),
    description: homepageContent?.description || th("description"),
    explorePosts: th("explorePosts"),
    joinCommunity: th("joinCommunity"),
  };

  const partnerTranslations = {
    ourPartners: tp("ourPartners"),
    partnersDescription: tp("partnersDescription"),
  };

  return (
    <div className="mx-auto min-h-screen flex flex-col max-w-7xl px-3 py-6 sm:px-6 sm:py-8">
      {/* Welcome Hero Section */}
      {!tag && page === 1 && (
        <HeroSection translations={heroTranslations} />
      )}

      {/* Partners Section */}
      {!tag && page === 1 && (
        <PartnersCarousel translations={partnerTranslations} />
      )}

      {/* Featured Section */}
      {!tag && page === 1 && filteredFeaturedPosts.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">{t("featured")}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFeaturedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      <div id="posts" className="flex flex-col gap-8 w-full">
        {/* Main Content */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {tag ? `#${tag}` : t("latest")}
            </h2>
            {!tag && page === 1 && (
              <Link href="/posts">
                <Button variant="outline" size="sm">
                  {tc("seeAllPosts")}
                </Button>
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">{t("noPostsYet")}</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">
                {t("noPostsYet")} ({t("noTranslations")})
              </p>
            </div>
          ) : !tag && page === 1 ? (
            // Carousel view for latest posts
            <PostCarousel>
              {filteredPosts.map((post) => (
                <div key={post.id} className="shrink-0 w-[calc(100vw-3rem)] sm:w-80 snap-start">
                  <PostCard post={post} />
                </div>
              ))}
            </PostCarousel>
          ) : (
            // Grid view for paginated results
            <div className="flex flex-col gap-6">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (tag || page > 1) && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={`/?page=${page - 1}${tag ? `&tag=${tag}` : ""}`}>
                  <Button variant="outline" size="sm">
                    {tc("previous")}
                  </Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/?page=${page + 1}${tag ? `&tag=${tag}` : ""}`}>
                  <Button variant="outline" size="sm">
                    {tc("next")}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Tags */}
        {!tag && (
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-20">
              <h3 className="mb-4 font-semibold">{tc("tags")}</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((t) => (
                  <Link key={t.id} href={`/?tag=${t.slug}`}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer"
                    >
                      {t.name} ({t._count.posts})
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
