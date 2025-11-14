
-- Add debt tracking tables
CREATE TABLE IF NOT EXISTS "debts" (
  "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "creditor_debtor" varchar(255) NOT NULL,
  "principal_amount" varchar(50) NOT NULL,
  "current_balance" varchar(50) NOT NULL,
  "interest_rate" varchar(50),
  "repayment_method" varchar(50) NOT NULL,
  "payment_amount" varchar(50),
  "payment_frequency" varchar(50),
  "start_date" date NOT NULL,
  "due_date" date,
  "next_payment_date" date,
  "payoff_date" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "debt_payments" (
  "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "debt_id" varchar(255) NOT NULL REFERENCES "debts"("id") ON DELETE CASCADE,
  "amount" varchar(50) NOT NULL,
  "principal_paid" varchar(50) NOT NULL,
  "interest_paid" varchar(50),
  "payment_date" date NOT NULL,
  "account_id" varchar(255) REFERENCES "accounts"("id"),
  "is_extra_payment" boolean NOT NULL DEFAULT false,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recurring_income" (
  "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "amount" varchar(50) NOT NULL,
  "frequency" varchar(50) NOT NULL,
  "day_of_week" integer,
  "day_of_month" integer,
  "month_of_year" integer,
  "start_date" date NOT NULL,
  "end_date" date,
  "deposit_account_id" varchar(255) REFERENCES "accounts"("id"),
  "is_active" boolean NOT NULL DEFAULT true,
  "last_reminded" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Update budget_categories to include allocated_amount
ALTER TABLE "budget_categories" ADD COLUMN IF NOT EXISTS "allocated_amount" varchar(50) NOT NULL DEFAULT '0';
