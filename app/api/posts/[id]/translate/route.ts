import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/session";
import { updateTranslationSchema } from "@/lib/validations";
import {
  translateText,
  mapLocaleToTranslatorLang,
  isSupportedLanguage,
} from "@/lib/translate";
import slugify from "slugify";

/**
 * GET /api/posts/[id]/translate?lang=ja
 *
 * Returns the editable translation data (title, content, slug,
 * coverImage, tags, translationStatus) for a single language. If no
 * translation row exists yet for that language, it auto-translates
 * and caches one first (same lazy-translation behavior as before),
 * then returns it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const targetLang = searchParams.get("lang");

  if (!targetLang || !isSupportedLanguage(targetLang)) {
    return NextResponse.json(
      { error: "Invalid language. Supported: uz, ja, en, ru" },
      { status: 400 }
    );
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, title: true, content: true, language: true, slug: true, coverImage: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Translation row for the post's own original language always exists
  // once savePostTranslations has run; for other languages it may not
  // exist yet if auto-translation failed or hasn't run.
  const existing = await prisma.postTranslation.findUnique({
    where: { postId_language: { postId: id, language: targetLang } },
    include: { tags: { include: { tag: true } } },
  });

  if (existing) {
    return NextResponse.json({
      language: targetLang,
      title: existing.title,
      content: existing.content,
      slug: existing.slug,
      coverImage: existing.coverImage,
      tags: existing.tags.map((t) => t.tag.name),
      translationStatus: existing.translationStatus,
      isOriginal: existing.isOriginal,
    });
  }

  // No row yet — auto-translate now and cache it.
  try {
    const fromLang = mapLocaleToTranslatorLang(post.language);
    const toLang = mapLocaleToTranslatorLang(targetLang);

    const translatedTitle = await translateText(post.title, fromLang, toLang);
    const contentStr = JSON.stringify(post.content);
    const translatedContentStr = await translateText(contentStr, fromLang, toLang);

    let translatedContent;
    try {
      translatedContent = JSON.parse(translatedContentStr);
    } catch {
      translatedContent = post.content;
    }

    const baseSlug = slugify(translatedTitle || "post", { lower: true, strict: true });
    const slug = await uniqueTranslationSlug(baseSlug, id, targetLang);

    const created = await prisma.postTranslation.create({
      data: {
        postId: id,
        language: targetLang,
        title: translatedTitle,
        content: translatedContent,
        slug,
        coverImage: post.coverImage,
        translationStatus: "AUTO_TRANSLATED",
      },
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json({
      language: targetLang,
      title: created.title,
      content: created.content,
      slug: created.slug,
      coverImage: created.coverImage,
      tags: created.tags.map((t) => t.tag.name),
      translationStatus: created.translationStatus,
      isOriginal: created.isOriginal,
    });
  } catch (error) {
    console.error("Translation error:", error);
    // Fall back to original content so the editor still has something to show.
    return NextResponse.json({
      language: post.language,
      title: post.title,
      content: post.content,
      slug: post.slug,
      coverImage: post.coverImage,
      tags: [],
      translationStatus: "FAILED",
      isOriginal: false,
      fallback: true,
      error: "Translation service unavailable",
    });
  }
}

/**
 * PATCH /api/posts/[id]/translate?lang=ja
 * Body: { title?, content?, slug?, coverImage?, tags? }
 *
 * Manually edit a single language's translation. Marks the row
 * MANUAL_TRANSLATED so future auto re-translation passes (triggered by
 * editing the original language) will never overwrite it.
 *
 * If lang === the post's original language, also updates the parent
 * Post row so the two stay in sync.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const targetLang = searchParams.get("lang");

  if (!targetLang || !isSupportedLanguage(targetLang)) {
    return NextResponse.json(
      { error: "Invalid language. Supported: uz, ja, en, ru" },
      { status: 400 }
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.authorId !== user.id && !isAdmin(user)) {
    return NextResponse.json(
      { error: "You can only edit your own posts" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, content, slug, coverImage, tags } = parsed.data;

  if (slug) {
    const slugTaken = await prisma.postTranslation.findFirst({
      where: { slug, NOT: { postId: id, language: targetLang } },
    });
    if (slugTaken) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
  }

  // Resolve tag names to ids if provided
  let tagIds: string[] | undefined;
  if (tags) {
    tagIds = await Promise.all(
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
  }

  const isOriginalLanguage = targetLang === post.language;

  const updated = await prisma.postTranslation.upsert({
    where: { postId_language: { postId: id, language: targetLang } },
    create: {
      postId: id,
      language: targetLang,
      title: title ?? post.title,
      content: content ?? post.content,
      slug: slug ?? `post-${id.slice(0, 8)}-${targetLang}`,
      coverImage: coverImage ?? post.coverImage,
      isOriginal: isOriginalLanguage,
      translationStatus: "MANUAL_TRANSLATED",
    },
    update: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(coverImage !== undefined ? { coverImage } : {}),
      translationStatus: "MANUAL_TRANSLATED",
    },
    include: { tags: { include: { tag: true } } },
  });

  if (tagIds) {
    await prisma.postTranslationTag.deleteMany({
      where: { postTranslationId: updated.id },
    });
    if (tagIds.length > 0) {
      await prisma.postTranslationTag.createMany({
        data: tagIds.map((tagId) => ({ postTranslationId: updated.id, tagId })),
        skipDuplicates: true,
      });
    }
  }

  // Keep the parent Post row in sync when editing the original language.
  if (isOriginalLanguage) {
    await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(coverImage !== undefined ? { coverImage } : {}),
      },
    });
  }

  await prisma.postHistory.create({
    data: {
      postId: id,
      userId: user.id,
      action: "edit",
      changes: `Manually edited ${targetLang.toUpperCase()} translation`,
    },
  });

  const refreshed = await prisma.postTranslation.findUnique({
    where: { id: updated.id },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({
    language: targetLang,
    title: refreshed!.title,
    content: refreshed!.content,
    slug: refreshed!.slug,
    coverImage: refreshed!.coverImage,
    tags: refreshed!.tags.map((t) => t.tag.name),
    translationStatus: refreshed!.translationStatus,
    isOriginal: refreshed!.isOriginal,
  });
}

async function uniqueTranslationSlug(
  base: string,
  postId: string,
  language: string
): Promise<string> {
  let candidate = base || `post-${postId.slice(0, 8)}-${language}`;
  let suffix = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.postTranslation.findFirst({
      where: { slug: candidate, NOT: { postId, language } },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base || "post"}-${suffix}`;
  }
}
