CREATE TABLE "budget_rule_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"rule_type" varchar(50) NOT NULL,
	"rule_config" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_auto_sweep" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"source_category" varchar(100) NOT NULL,
	"target_goal_id" varchar(255),
	"threshold" numeric(15, 2) NOT NULL,
	"is_active" integer DEFAULT 1,
	"last_swept_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" DROP CONSTRAINT "achievements_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "shopping_items" DROP CONSTRAINT "shopping_items_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "achievements" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "budget_templates" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "budget_templates" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "shopping_items" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "budget_templates" ADD COLUMN "version" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "budget_templates" ADD COLUMN "parent_template_id" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" text DEFAULT 'posted' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "enable_push_notifications" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "preferred_currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "ai_suggestion_stats" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "ai_suggestion_engagement" varchar(10) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "budget_rule_presets" ADD CONSTRAINT "budget_rule_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_auto_sweep" ADD CONSTRAINT "savings_auto_sweep_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_auto_sweep" ADD CONSTRAINT "savings_auto_sweep_target_goal_id_goals_id_fk" FOREIGN KEY ("target_goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_templates" ADD CONSTRAINT "budget_templates_parent_template_id_budget_templates_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "public"."budget_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;