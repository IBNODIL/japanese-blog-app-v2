/**
 * One-time backfill script.
 *
 * Run this ONCE, after applying migration
 * `20260629063257_per_language_slug_cover_tags`, and BEFORE applying
 * the follow-up migration that makes PostTranslation.slug required +
 * unique and drops the old PostTag table.
 *
 * What it does:
 *  1. For every PostTranslation row missing a slug:
 *     - if it's the original-language translation, reuse Post.slug
 *     - otherwise, slugify its own title (deduping against collisions)
 *  2. Copies Post.coverImage onto every PostTranslation row that
 *     doesn't have its own coverImage set yet.
 *  3. Copies every existing PostTag (post, tag) row onto that post's
 *     ORIGINAL-language PostTranslation row, AND onto every other
 *     translation row for that same post (tags are treated as
 *     language-agnostic categories at backfill time — you can
 *     differentiate them per-language afterwards in the UI).
 *
 * Usage:
 *   npx tsx prisma/backfill-translation-fields.ts
 *   (or: npx ts-node prisma/backfill-translation-fields.ts)
 */


import { PrismaClient } from "../app/generated/prisma";
import slugify from "slugify";

const prisma = new PrismaClient();

async function uniqueSlug(base: string, postId: string): Promise<string> {
  let candidate = base || `post-${postId.slice(0, 8)}`;
  let suffix = 0;

  // Loop until we find a slug not already used by some OTHER PostTranslation row.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.postTranslation.findFirst({
      where: { slug: candidate },
      select: { postId: true },
    });

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${base || "post"}-${suffix}`;
  }
}

async function backfillSlugsAndCovers() {
  console.log("🔄 Backfilling PostTranslation.slug and coverImage...");

  const translations = await prisma.postTranslation.findMany({
    include: { post: true },
  });

  let updated = 0;

  for (const t of translations) {
    const needsSlug = !t.slug;
    const needsCover = !t.coverImage && !!t.post.coverImage;

    if (!needsSlug && !needsCover) continue;

    let slug = t.slug;
    if (needsSlug) {
      if (t.isOriginal || t.language === t.post.language) {
        // Original language: reuse the post's existing global slug.
        slug = await uniqueSlug(t.post.slug, t.postId);
      } else {
        const base = slugify(t.title || t.post.title || "post", {
          lower: true,
          strict: true,
        });
        slug = await uniqueSlug(base, t.postId);
      }
    }

    await prisma.postTranslation.update({
      where: { id: t.id },
      data: {
        ...(needsSlug ? { slug } : {}),
        ...(needsCover ? { coverImage: t.post.coverImage } : {}),
      },
    });

    updated++;
  }

  console.log(`✓ Backfilled ${updated} PostTranslation row(s)`);
}

async function backfillTags() {
  console.log("🔄 Copying PostTag rows into PostTranslationTag...");

  // Read raw PostTag rows via $queryRaw since the Prisma schema no longer
  // declares the PostTag model/relation (it was removed from schema.prisma).
  const postTags = await prisma.$queryRaw<
    Array<{ postId: string; tagId: string }>
  >`SELECT "postId", "tagId" FROM "PostTag"`;

  console.log(`Found ${postTags.length} legacy PostTag row(s)`);

  let linksCreated = 0;

  for (const { postId, tagId } of postTags) {
    const translations = await prisma.postTranslation.findMany({
      where: { postId },
      select: { id: true },
    });

    for (const { id: postTranslationId } of translations) {
      try {
        await prisma.postTranslationTag.upsert({
          where: { postTranslationId_tagId: { postTranslationId, tagId } },
          update: {},
          create: { postTranslationId, tagId },
        });
        linksCreated++;
      } catch (err) {
        console.error(
          `✗ Failed to link tag ${tagId} to translation ${postTranslationId}`,
          err
        );
      }
    }
  }

  console.log(`✓ Created ${linksCreated} PostTranslationTag link(s)`);
}

async function main() {
  await backfillSlugsAndCovers();
  await backfillTags();
  console.log("✅ Backfill complete. You can now apply the follow-up migration");
  console.log("   that makes PostTranslation.slug required+unique and drops PostTag.");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
