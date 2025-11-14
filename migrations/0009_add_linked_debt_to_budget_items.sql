
-- Add linked_debt_id column to budget_items for debt payment integration
ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "linked_debt_id" varchar(255) REFERENCES "debts"("id") ON DELETE SET NULL;

-- Add index for faster debt item queries
CREATE INDEX IF NOT EXISTS "budget_items_linked_debt_idx" ON "budget_items" ("linked_debt_id");
