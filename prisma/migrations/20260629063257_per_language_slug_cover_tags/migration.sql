-- Step 1: Add new columns to PostTranslation as NULLABLE first.
-- They will be backfilled by scripts/backfill-translation-fields.ts
-- before a later migration makes "slug" required + unique.
ALTER TABLE "PostTranslation" ADD COLUMN "slug" TEXT;
ALTER TABLE "PostTranslation" ADD COLUMN "coverImage" TEXT;

-- Step 2: Create the new per-translation tag join table.
-- The old "PostTag" table is intentionally NOT dropped yet — it stays
-- in place until the backfill script has copied its rows into
-- PostTranslationTag and you've verified the app works. Drop it with
-- the follow-up migration (02_drop_post_tag) once confirmed.
CREATE TABLE "PostTranslationTag" (
    "postTranslationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTranslationTag_pkey" PRIMARY KEY ("postTranslationId","tagId")
);

CREATE INDEX "PostTranslationTag_tagId_idx" ON "PostTranslationTag"("tagId");

ALTER TABLE "PostTranslationTag" ADD CONSTRAINT "PostTranslationTag_postTranslationId_fkey"
  FOREIGN KEY ("postTranslationId") REFERENCES "PostTranslation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostTranslationTag" ADD CONSTRAINT "PostTranslationTag_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
