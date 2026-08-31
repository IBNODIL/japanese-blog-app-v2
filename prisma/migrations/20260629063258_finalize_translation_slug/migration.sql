-- Run this ONLY after prisma/backfill-translation-fields.ts has completed
-- successfully (every PostTranslation row must already have a non-null slug,
-- and every PostTag row must already be copied into PostTranslationTag).

-- Make slug required and unique now that every row has one.
ALTER TABLE "PostTranslation" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "PostTranslation_slug_key" ON "PostTranslation"("slug");

-- Drop the old post-level tag join table — replaced by PostTranslationTag.
ALTER TABLE "PostTag" DROP CONSTRAINT IF EXISTS "PostTag_postId_fkey";
ALTER TABLE "PostTag" DROP CONSTRAINT IF EXISTS "PostTag_tagId_fkey";
DROP TABLE "PostTag";
