import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePostSchema } from "@/lib/validations";
import { savePostTranslations } from "@/lib/translation/saveTranslations";
import { getSessionUser, isAdmin, isSuperAdmin } from "@/lib/session";
import slugify from "slugify";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true, email: true } },
      translations: { include: { tags: { include: { tag: true } } } },
      _count: { select: { likes: true, comments: true, bookmarks: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Allow edit only if user is the owner or admin
  if (post.authorId !== user.id && !isAdmin(user)) {
    return NextResponse.json(
      { error: "You can only edit your own posts" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updatePostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tags, ...data } = parsed.data;

  // Build list of changes for history tracking
  const changes: string[] = [];
  if (data.title && data.title !== post.title) changes.push(`title: "${post.title}" → "${data.title}"`);
  if (data.content) changes.push("content updated");
  if (data.published !== undefined && data.published !== post.published) changes.push(`published: ${post.published} → ${data.published}`);
  if ((data as Record<string, unknown>).hidden !== undefined && (data as Record<string, unknown>).hidden !== post.hidden) changes.push(`hidden: ${post.hidden} → ${(data as Record<string, unknown>).hidden}`);
  if (data.language && data.language !== post.language) changes.push(`language: ${post.language} → ${data.language}`);

  // Estimate reading time if content changed
  if (data.content) {
    const textContent = JSON.stringify(data.content);
    const wordCount = textContent.split(/\s+/).length;
    (data as Record<string, unknown>).readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  // Resolve tag names to ids if tags were sent — these apply to the
  // ORIGINAL language's translation row. Other languages keep whatever
  // tags they already have (edit those via the translation-scoped route).
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

  // NOTE: we intentionally do NOT delete existing PostTranslation rows
  // here anymore. savePostTranslations() below safely upserts each
  // language and skips any row already marked MANUAL_TRANSLATED, so a
  // title/content edit on the original language no longer wipes out
  // translations an admin has hand-corrected.
  const needsRetranslation = data.content || data.title;

  const updatedPost = await prisma.post.update({
    where: { id },
    data,
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  // Re-translate if content/title changed (or just sync tags/slug/cover
  // for the original language even if nothing else changed).
  if (needsRetranslation || tagIds || data.slug || data.coverImage !== undefined) {
    const finalTitle = data.title ?? post.title;
    const finalContent = data.content ?? post.content;
    const finalLanguage = (data.language || post.language) as "uz" | "en" | "ja" | "ru";
    try {
      await savePostTranslations(updatedPost.id, finalTitle, finalContent, finalLanguage, {
        skipTranslation: !needsRetranslation, // don't re-run MT if only tags/slug/cover changed
        slug: data.slug,
        coverImage: data.coverImage,
        tagIds,
      });
    } catch (err) {
      console.error("Re-translation failed for post", updatedPost.id, err);
    }
  }

  // Log history
  if (changes.length > 0) {
    await prisma.postHistory.create({
      data: {
        postId: id,
        userId: user.id,
        action: "edit",
        changes: changes.join("; "),
      },
    });
  }

  const fullPost = await prisma.post.findUnique({
    where: { id: updatedPost.id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      translations: { include: { tags: { include: { tag: true } } } },
    },
  });

  return NextResponse.json(fullPost);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Allow delete if: user is the owner OR user is super admin
  if (post.authorId !== user.id && !isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Only the post owner or super admin can delete" },
      { status: 403 }
    );
  }

  // Log deletion in history before deleting
  await prisma.postHistory.create({
    data: {
      postId: id,
      userId: user.id,
      action: "delete",
      changes: `Deleted post "${post.title}"`,
    },
  });

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
