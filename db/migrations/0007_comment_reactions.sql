CREATE TABLE "comment_reactions" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "emoji" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "comment_reactions_comment_id_idx" ON "comment_reactions"("comment_id");
CREATE INDEX "comment_reactions_user_id_idx" ON "comment_reactions"("user_id");
CREATE UNIQUE INDEX "comment_reactions_user_unique" ON "comment_reactions"("comment_id", "user_id", "emoji") WHERE "user_id" IS NOT NULL;
