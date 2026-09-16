/**
 * Background post translator
 *
 * Reuses the existing savePostTranslations() logic from lib/translation/.
 * Called by the worker to translate a post by ID.
 */

import { prisma } from "@/lib/prisma";
import { savePostTranslations } from "@/lib/translation/saveTranslations";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

type Language = "uz" | "en" | "ja" | "ru";

/**
 * Translate a post by its ID.
 *
 * 1. Fetches the post from the database
 * 2. Delegates to the existing savePostTranslations()
 * 3. Updates post status to PUBLISHED or FAILED
 *
 * Throws on unrecoverable errors so the worker can mark the job failed.
 */
export async function translatePost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new Error(`Post not found: ${postId}`);
  }

  console.log(
    `🔄 Background translation starting for post ${postId} (lang: ${post.language})`
  );

  const result = await savePostTranslations(
    postId,
    post.title,
    post.content,
    post.language as Language
  );

  if (result.success) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHED", published: true },
    });
    // The post is now publicly visible — bust the cached home feed/tags
    // so it shows up without waiting for the TTL to expire.
    revalidateTag(CACHE_TAGS.posts, "max");
    revalidateTag(CACHE_TAGS.tags, "max");
    console.log(`✅ Post ${postId} → PUBLISHED`);
  } else {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "FAILED" },
    });
    throw new Error(
      `Translation partially failed. Languages saved: ${result.translations.join(", ")}`
    );
  }
}
