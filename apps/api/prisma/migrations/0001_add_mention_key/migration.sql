-- AlterTable: Add mentionKey column (nullable)
ALTER TABLE "User" ADD COLUMN "mentionKey" TEXT;

-- Backfill existing users: generate mentionKey from email local-part
UPDATE "User" SET "mentionKey" = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^\w]', '', 'g'));
-- Handle empty mentionKeys (e.g. email like '@domain.com')
UPDATE "User" SET "mentionKey" = 'user_' || REPLACE(gen_random_uuid()::text, '-', '') WHERE "mentionKey" IS NULL OR "mentionKey" = '';

-- Handle duplicate mentionKeys by appending short UUID suffix
UPDATE "User" u1 SET "mentionKey" = u1."mentionKey" || '_' || LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 4)
WHERE EXISTS (
  SELECT 1 FROM "User" u2
  WHERE u2."mentionKey" = u1."mentionKey" AND u2."id" > u1."id"
);
-- Run a second pass for any remaining duplicates (3+ way collisions)
UPDATE "User" u1 SET "mentionKey" = u1."mentionKey" || '_' || LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 4)
WHERE EXISTS (
  SELECT 1 FROM "User" u2
  WHERE u2."mentionKey" = u1."mentionKey" AND u2."id" > u1."id"
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mentionKey_key" ON "User"("mentionKey");