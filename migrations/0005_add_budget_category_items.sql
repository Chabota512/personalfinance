
-- Add budget_category_items table for itemized category breakdowns
CREATE TABLE IF NOT EXISTS "budget_category_items" (
  "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "budget_id" varchar(255) NOT NULL REFERENCES "budgets"("id") ON DELETE CASCADE,
  "category" varchar(100) NOT NULL,
  "item_name" varchar(255) NOT NULL,
  "amount" varchar(50) NOT NULL,
  "location_name" varchar(255),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "budget_category_items_budget_id_idx" ON "budget_category_items" ("budget_id");
CREATE INDEX IF NOT EXISTS "budget_category_items_category_idx" ON "budget_category_items" ("category");
