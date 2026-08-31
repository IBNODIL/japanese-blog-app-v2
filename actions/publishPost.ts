/**
 * Server action: publish a post with background translation.
 *
 * 1. Create post immediately with status = PROCESSING
 * 2. Queue translation job via QStash
 * 3. Return instantly — UI never waits for translation
 */

"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/session";
import { createPostSchema } from "@/lib/validations";
import { addTranslationJob } from "@/lib/queue";
import slugify from "slugify";

interface PublishResult {
  success: boolean;
  postId?: string;
  slug?: string;
  error?: string;
}

export async function publishPost(
  formData: Record<string, unknown>
): Promise<PublishResult> {
  // Auth
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Unauthorized" };
  if (!isAdmin(user)) return { success: false, error: "Forbidden" };

  // Validate
  const parsed = createPostSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { title, content, slug, coverImage, language, tags } = parsed.data;
  const finalSlug =
    slug ||
    (title
      ? slugify(title, { lower: true, strict: true })
      : `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);

  // Slug uniqueness
  if (await prisma.post.findUnique({ where: { slug: finalSlug } })) {
    return { success: false, error: "Slug already exists" };
  }

  // Reading time
  const wordCount = JSON.stringify(content).split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // ── Create post with status = PROCESSING ──
  // TUZATILDI: tags obyekti translations ichidagi original til (language) blokiga ko'chirildi
  const post = await prisma.post.create({
    data: {
      title,
      content,
      slug: finalSlug,
      coverImage: coverImage || null,
      published: false, // flipped to true after translation
      status: "PROCESSING",
      language,
      readingTime,
      authorId: user.id,
      translations: {
        create: {
          language: language, // Ma'lumot formadan kelgan original til (masalan: "uz")
          title,
          content,
          slug: finalSlug,
          coverImage: coverImage || null,
          isOriginal: true,
          translationStatus: "ORIGINAL",
          tags: {
            create: await Promise.all(
              tags.map(async (tagName: string) => {
                const tagSlug = slugify(tagName, { lower: true, strict: true });
                const tag = await prisma.tag.upsert({
                  where: { slug: tagSlug },
                  update: {},
                  create: { name: tagName, slug: tagSlug },
                });
                return { tagId: tag.id };
              })
            ),
          },
        },
      },
    },
  });

  // History
  await prisma.postHistory.create({
    data: {
      postId: post.id,
      userId: user.id,
      action: "create",
      changes: `Created post "${title}" (translation queued)`,
    },
  });

  // ── Queue background translation — does NOT block ──
  try {
    await addTranslationJob(post.id);
  } catch (err) {
    console.error("Failed to queue translation:", err);
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "FAILED" },
    });
    return {
      success: false,
      postId: post.id,
      slug: finalSlug,
      error: "Failed to queue translation. Post saved as draft.",
    };
  }

  return { success: true, postId: post.id, slug: finalSlug };
}
