-- Backfill existing votes with user name and email data

UPDATE "votes"
SET 
  "user_name" = u."name",
  "user_email" = u."email"
FROM "user" u
WHERE 
  votes."user_id" = u."id"
  AND votes."user_name" IS NULL
  AND votes."user_email" IS NULL;
