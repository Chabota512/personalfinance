
-- Add quantity_purchased column to track partial purchases
ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "quantity_purchased" varchar(50) DEFAULT '0';

-- Add index for faster queries on purchased items
CREATE INDEX IF NOT EXISTS "budget_items_purchased_idx" ON "budget_items" ("purchased");
