import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const tagsParam = searchParams.get("tags");
  const language = searchParams.get("language");
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");
  const sortBy = searchParams.get("sortBy") || "relevance";
  const searchFields = searchParams.get("searchFields") || "all";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const translationLanguage = searchParams.get("translationLanguage") || language || "en";

  const where: Record<string, unknown> = { published: true };

  // Allow fetching all posts if no q or tags provided
  // (useful for showing all posts on initial load)

  // Text search
  if (q) {
    if (searchFields === "title") {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { translations: { some: { title: { contains: q, mode: "insensitive" } } } },
      ];
    } else if (searchFields === "content") {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { translations: { some: { title: { contains: q, mode: "insensitive" } } } },
      ];
    } else {
      // Search in title and slug only (content is JSON and harder to search)
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { translations: { some: { title: { contains: q, mode: "insensitive" } } } },
      ];
    }
  }

  // Tags filter
  if (tagsParam) {
    const tags = tagsParam.split(",").filter(Boolean);
    where.translations = { some: { tags: { some: { tag: { slug: { in: tags } } } } } };
  }

  // Only filter by language if explicitly searching with language parameter
  // (don't filter on initial page load to show all posts)
  if (q && language) {
    where.language = language;
  }

  // Date range filter
  if (dateFromParam || dateToParam) {
    where.createdAt = {};
    if (dateFromParam) {
      (where.createdAt as Record<string, unknown>).gte = new Date(dateFromParam);
    }
    if (dateToParam) {
      const toDate = new Date(dateToParam);
      toDate.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = toDate;
    }
  }

  // Determine sort order
  let orderBy: Record<string, unknown> = { createdAt: "desc" };
  if (sortBy === "newest") {
    orderBy = { createdAt: "desc" };
  } else if (sortBy === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sortBy === "popular") {
    orderBy = { likes: { _count: "desc" } } as Record<string, unknown>;
  } else if (sortBy === "relevance" && q) {
    // For relevance, we'll use basic sorting with createdAt as secondary
    orderBy = { createdAt: "desc" };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, image: true } },
        translations: {
          where: { language: translationLanguage },
          select: { title: true, slug: true, coverImage: true, language: true, tags: { include: { tag: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
