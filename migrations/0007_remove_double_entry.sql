-- Migration to remove double-entry bookkeeping and simplify transactions
-- This migration adds accountId and transactionType to transactions table
-- and removes the transactionEntries table

-- Step 1: Create transaction_type enum
DO $$ BEGIN
 CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to transactions (nullable first)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "account_id" varchar(255);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "transaction_type" "transaction_type";

-- Step 3: Migrate data from transaction_entries to transactions
-- For each transaction, find the asset/checking account entry and use that as the accountId
-- Determine transaction_type based on whether totalAmount is positive (income) or we have expense entries
UPDATE "transactions" t
SET 
  "account_id" = (
    SELECT te.account_id 
    FROM "transaction_entries" te
    INNER JOIN "accounts" a ON te.account_id = a.id
    WHERE te.transaction_id = t.id 
      AND a.account_type = 'asset'
    LIMIT 1
  ),
  "transaction_type" = CASE
    WHEN t.total_amount::numeric >= 0 THEN 'income'::"transaction_type"
    ELSE 'expense'::"transaction_type"
  END
WHERE t.account_id IS NULL;

-- Step 4: For any transactions that still don't have an account_id (edge cases),
-- use the first account from transaction_entries
UPDATE "transactions" t
SET "account_id" = (
    SELECT te.account_id 
    FROM "transaction_entries" te
    WHERE te.transaction_id = t.id
    LIMIT 1
  )
WHERE t.account_id IS NULL;

-- Step 5: Set a default transaction_type for any remaining nulls
UPDATE "transactions"
SET "transaction_type" = 'expense'::"transaction_type"
WHERE "transaction_type" IS NULL;

-- Step 6: Make the new columns NOT NULL
ALTER TABLE "transactions" ALTER COLUMN "account_id" SET NOT NULL;
ALTER TABLE "transactions" ALTER COLUMN "transaction_type" SET NOT NULL;

-- Step 7: Add foreign key constraint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" 
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;

-- Step 8: Drop the transaction_entries table
DROP TABLE IF EXISTS "transaction_entries";

-- Step 9: Drop the entry_type enum
DROP TYPE IF EXISTS "entry_type";
