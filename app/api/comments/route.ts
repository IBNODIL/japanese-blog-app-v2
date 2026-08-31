import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { commentSchema } from "@/lib/validations";
import { detectCommentLanguage } from "@/lib/translation/commentAutoDetect";
import type { Language } from "@/lib/translation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  const locale = (searchParams.get("locale") || "uz") as Language;

  if (!postId) {
    return NextResponse.json(
      { error: "postId is required" },
      { status: 400 }
    );
  }

  // Get comments with auto-detection support
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null },
    include: {
      author: { select: { id: true, name: true, image: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, image: true } },
          translations: {
            where: { language: locale },
            select: { content: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      translations: {
        where: { language: locale },
        select: { content: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Process comments with auto-detected language info
  const processedComments = comments.map((comment) => ({
    ...comment,
    language: comment.language || "uz",
    translations: comment.translations,
    replies: comment.replies.map((reply) => ({
      ...reply,
      language: reply.language || "uz",
      translations: reply.translations,
    })),
  }));

  return NextResponse.json(processedComments);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = commentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { content, postId, parentId, language } = parsed.data;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Auto-detect language if not provided
  const detectedLanguage = language || detectCommentLanguage(content, "uz");

  const comment = await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: session.user.id,
      parentId: parentId || null,
      language: detectedLanguage,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  // Create notification for post author (if not self)
  if (post.authorId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: parentId ? "reply" : "comment",
        message: parentId
          ? `${session.user.name} replied to your comment`
          : `${session.user.name} commented on your post`,
        postId,
        commentId: comment.id,
      },
    });
  }

  // If reply, also notify parent comment author
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });
    if (
      parentComment &&
      parentComment.authorId !== session.user.id &&
      parentComment.authorId !== post.authorId
    ) {
      await prisma.notification.create({
        data: {
          userId: parentComment.authorId,
          type: "reply",
          message: `${session.user.name} replied to your comment`,
          postId,
          commentId: comment.id,
        },
      });
    }
  }

  return NextResponse.json({ ...comment, language: detectedLanguage }, { status: 201 });
}

