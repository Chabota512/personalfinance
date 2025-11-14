CREATE TYPE "public"."contribution_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."contribution_mode" AS ENUM('calculated_amount', 'calculated_date', 'flexible_amount', 'completely_flexible');--> statement-breakpoint
CREATE TYPE "public"."goal_category" AS ENUM('emergency', 'vacation', 'education', 'house', 'investment', 'debt_payoff', 'other');--> statement-breakpoint
ALTER TYPE "public"."budget_period" ADD VALUE 'weekly' BEFORE 'monthly';--> statement-breakpoint
ALTER TYPE "public"."goal_status" ADD VALUE 'paused';--> statement-breakpoint
CREATE TABLE "budget_category_items" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"amount" varchar(50) NOT NULL,
	"location_name" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" varchar(255) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"scheduled_date" date,
	"actual_date" date NOT NULL,
	"source_account_id" varchar(255),
	"transaction_id" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "achievements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "budget_rule_presets" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "budget_rule_presets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "budget_templates" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "budget_templates" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "shopping_price_checks" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "shopping_price_checks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "shopping_price_checks" ALTER COLUMN "item_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "savings_auto_sweep" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "savings_auto_sweep" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "shopping_items" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "shopping_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "quantity_purchased" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "why" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "category" "goal_category" DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "monthly_contribution" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "original_deadline" date;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "milestones_reached" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "witness_email" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "witness_name" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "boost_week_active" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "boost_week_ends" timestamp;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "boost_week_started" timestamp;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "quick_goal_nlp_source" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "progress_unit" text DEFAULT 'percentage';--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "cloned_from_id" varchar(255);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "last_boost_week_quarter" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "contribution_frequency" "contribution_frequency";--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "contribution_mode" "contribution_mode";--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "scheduled_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "day_of_week" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "day_of_month" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "source_account_id" varchar(255);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "next_scheduled_contribution" date;--> statement-breakpoint
ALTER TABLE "budget_category_items" ADD CONSTRAINT "budget_category_items_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_source_account_id_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_source_account_id_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;