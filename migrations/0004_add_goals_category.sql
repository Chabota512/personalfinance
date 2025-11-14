
-- Create goal_category enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE goal_category AS ENUM('emergency', 'vacation', 'education', 'house', 'investment', 'debt_payoff', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add category column to goals table
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "category" goal_category DEFAULT 'other';

-- Add why column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "why" text;

-- Add monthly_contribution column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "monthly_contribution" numeric(15, 2);

-- Add paused_at column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "paused_at" timestamp;

-- Add original_deadline column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "original_deadline" date;

-- Add milestones_reached column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "milestones_reached" text DEFAULT '[]';

-- Add witness_email column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "witness_email" text;

-- Add witness_name column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "witness_name" text;

-- Add boost_week_active column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "boost_week_active" integer DEFAULT 0;

-- Add boost_week_ends column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "boost_week_ends" timestamp;

-- Add boost_week_started column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "boost_week_started" timestamp;

-- Add quick_goal_nlp_source column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "quick_goal_nlp_source" text;

-- Add progress_unit column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "progress_unit" text DEFAULT 'percentage';

-- Add cloned_from_id column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "cloned_from_id" varchar(255);

-- Add last_boost_week_quarter column if missing
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "last_boost_week_quarter" text;
