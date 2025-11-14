
-- Add ai_insights_history table for persistent AI learning
CREATE TABLE IF NOT EXISTS "ai_insights_history" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "insights" jsonb NOT NULL,
  "score" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "user_feedback" jsonb
);

-- Add index for faster queries by user
CREATE INDEX IF NOT EXISTS "ai_insights_history_user_id_idx" ON "ai_insights_history"("user_id");

-- Add index for faster queries by date
CREATE INDEX IF NOT EXISTS "ai_insights_history_created_at_idx" ON "ai_insights_history"("created_at");
