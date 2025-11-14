
-- Add title column to budgets table
ALTER TABLE "budgets" ADD COLUMN "title" text NOT NULL DEFAULT '';

-- Update existing budgets to have a default title based on category
UPDATE "budgets" SET "title" = category WHERE "title" = '';
