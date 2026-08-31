import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/session";
import { createPostSchema } from "@/lib/validations";
import { savePostTranslations } from "@/lib/translation/saveTranslations";
import slugify from "slugify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const tag = searchParams.get("tag");
  const authorId = searchParams.get("authorId");
  const published = searchParams.get("published");
  const featured = searchParams.get("featured");
  const myPosts = searchParams.get("myPosts") === "true"; // For dashboard - user's own posts

  const where: Record<string, unknown> = {};

  // If myPosts=true, get user's posts (for dashboard)
  if (myPosts) {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    where.authorId = user.id;
    // Don't filter by published for dashboard (show drafts too)
  } else {
    // For public view (main page), only show published posts
    if (published !== null) {
      where.published = published === "true";
    } else {
      where.published = true;
    }
  }

  if (tag) {
    // Tags now live on PostTranslation, not Post directly.
    where.translations = { some: { tags: { some: { tag: { slug: tag } } } } };
  }

  if (authorId && !myPosts) {
    where.authorId = authorId;
  }

  if (featured === "true") {
    where.featured = true;
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, image: true } },
        translations: {
          include: { tags: { include: { tag: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
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

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, content, slug, coverImage, published, language, tags } =
    parsed.data;

  const finalSlug =
    slug ||
    (title
      ? slugify(title, { lower: true, strict: true })
      : `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
      
  // Check slug uniqueness
  const existing = await prisma.post.findUnique({
    where: { slug: finalSlug },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 409 }
    );
  }

  // Estimate reading time from content
  const textContent = JSON.stringify(content);
  const wordCount = textContent.split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Resolve tag names to Tag ids up front — tags now attach to
  // PostTranslation rows (one set per language) rather than the Post itself.
  const tagIds = await Promise.all(
    tags.map(async (tagName: string) => {
      const tagSlug = slugify(tagName, { lower: true, strict: true });
      const tagRecord = await prisma.tag.upsert({
        where: { slug: tagSlug },
        update: {},
        create: { name: tagName, slug: tagSlug },
      });
      return tagRecord.id;
    })
  );

  const post = await prisma.post.create({
    data: {
      title,
      content,
      slug: finalSlug,
      coverImage: coverImage || null,
      published,
      language,
      readingTime,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  // Save translations (original + auto-translate to other languages).
  // This also creates the original-language PostTranslation row with its
  // own slug/coverImage/tags, and copies tags onto every auto-translated row.
  try {
    await savePostTranslations(post.id, title, content, language, {
      slug: finalSlug,
      coverImage: coverImage || null,
      tagIds,
    });
  } catch (err) {
    console.error("Translation failed for post", post.id, err);
  }

  // Log creation in history
  await prisma.postHistory.create({
    data: {
      postId: post.id,
      userId: user.id,
      action: "create",
      changes: `Created post "${title}"`,
    },
  });

  const fullPost = await prisma.post.findUnique({
    where: { id: post.id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      translations: { include: { tags: { include: { tag: true } } } },
    },
  });

  return NextResponse.json(fullPost, { status: 201 });
}
