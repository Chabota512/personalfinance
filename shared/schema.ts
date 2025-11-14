// PersonalFinance Pro - Database Schema
// Implements professional double-entry bookkeeping with comprehensive financial tracking

import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, date, pgEnum, serial, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import crypto from "crypto"; // Import crypto for UUID generation

// ===== SESSIONS TABLE (for express-session) =====
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// ===== USERS TABLE =====
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ===== ACCOUNT TYPES ENUM =====
export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
]);

export const accountCategoryEnum = pgEnum("account_category", [
  // Assets
  "cash",
  "checking",
  "savings",
  "investment",
  "retirement",
  "property",
  // Liabilities
  "credit_card",
  "loan",
  "mortgage",
  // Income
  "salary",
  "business",
  "investment_income",
  "other_income",
  // Expenses
  "housing",
  "transportation",
  "food",
  "healthcare",
  "entertainment",
  "personal_care",
  "education",
  "utilities",
  "insurance",
  "debt_payment",
  "savings_transfer",
  "other_expense",
]);

// ===== ACCOUNTS TABLE (Chart of Accounts) =====
export const accounts = pgTable("accounts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  accountCategory: accountCategoryEnum("account_category").notNull(),
  accountNumber: text("account_number"), // Professional account numbering (1000s, 2000s, etc.)
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactionEntries: many(transactionEntries),
}));

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectAccountSchema = createSelectSchema(accounts);

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

// ===== TRANSACTIONS TABLE =====
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  description: text("description").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default('posted'), // 'pending' | 'posted'
  notes: text("notes"),
  category: text("category"),
  locationName: text("location_name"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  voiceNoteUrl: text("voice_note_url"),
  voiceNoteTranscription: text("voice_note_transcription"),
  reason: text("reason"),
  reasonAudioUrl: text("reason_audio_url"),
  contentmentLevel: integer("contentment_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  entries: many(transactionEntries),
}));

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// ===== TRANSACTION ENTRIES (Double-Entry Bookkeeping) =====
export const entryTypeEnum = pgEnum("entry_type", ["debit", "credit"]);

export const transactionEntries = pgTable("transaction_entries", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id", { length: 255 })
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  accountId: varchar("account_id", { length: 255 })
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  entryType: entryTypeEnum("entry_type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactionEntriesRelations = relations(transactionEntries, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionEntries.transactionId],
    references: [transactions.id],
  }),
  account: one(accounts, {
    fields: [transactionEntries.accountId],
    references: [accounts.id],
  }),
}));

export const insertTransactionEntrySchema = createInsertSchema(transactionEntries).omit({
  id: true,
  createdAt: true,
});

export type TransactionEntry = typeof transactionEntries.$inferSelect;
export type InsertTransactionEntry = z.infer<typeof insertTransactionEntrySchema>;

// ===== BUDGETS TABLE =====
export const budgetPeriodEnum = pgEnum("budget_period", ["weekly", "monthly", "quarterly", "yearly"]);

export const budgets = pgTable("budgets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // User-friendly budget name
  category: accountCategoryEnum("category").notNull(), // Primary/default category for backwards compatibility
  allocatedAmount: decimal("allocated_amount", { precision: 15, scale: 2 }).notNull(),
  period: budgetPeriodEnum("period").notNull().default("monthly"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: integer("is_active").notNull().default(1),
  isTemplate: boolean("is_template").notNull().default(false),
  recurrence: varchar("recurrence", { length: 50 }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  budgetCategories: many(budgetCategories),
  budgetItems: many(budgetItems),
}));

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Budget title is required").max(255, "Title too long"),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

// ===== BUDGET CATEGORIES TABLE =====
export const budgetCategories = pgTable("budget_categories", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id", { length: 255 })
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  allocatedAmount: varchar("allocated_amount", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetCategoriesRelations = relations(budgetCategories, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [budgetCategories.budgetId],
    references: [budgets.id],
  }),
  categoryItems: many(budgetCategoryItems),
}));

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({
  id: true,
  createdAt: true,
});

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;

// ===== BUDGET CATEGORY ITEMS TABLE =====
export const budgetCategoryItems = pgTable("budget_category_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id", { length: 255 })
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 50 }).notNull(),
  locationName: varchar("location_name", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetCategoryItemsRelations = relations(budgetCategoryItems, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetCategoryItems.budgetId],
    references: [budgets.id],
  }),
}));

export const insertBudgetCategoryItemSchema = createInsertSchema(budgetCategoryItems).omit({
  id: true,
  createdAt: true,
});

export type BudgetCategoryItem = typeof budgetCategoryItems.$inferSelect;
export type InsertBudgetCategoryItem = z.infer<typeof insertBudgetCategorySchema>;

// ===== BUDGET ITEMS TABLE =====
export const budgetItems = pgTable("budget_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id", { length: 255 })
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  estimatedPrice: varchar("estimated_price", { length: 50 }),
  quantity: varchar("quantity", { length: 50 }),
  quantityPurchased: varchar("quantity_purchased", { length: 50 }),
  unit: varchar("unit", { length: 50 }),
  purchased: boolean("purchased").notNull().default(false),
  actualPrice: varchar("actual_price", { length: 50 }),
  purchaseDate: timestamp("purchase_date"),
  locationLat: varchar("location_lat", { length: 50 }),
  locationLon: varchar("location_lon", { length: 50 }),
  locationName: varchar("location_name", { length: 255 }),
  linkedDebtId: varchar("linked_debt_id", { length: 255 }).references(() => debts.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetItemsRelations = relations(budgetItems, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [budgetItems.budgetId],
    references: [budgets.id],
  }),
  priceHistoryEntries: many(itemPriceHistory),
}));

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true,
  createdAt: true,
});

export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;

// ===== BUDGET TEMPLATES TABLE =====
export const budgetTemplates = pgTable("budget_templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  categories: text("categories").array(),
  usageCount: integer("usage_count").notNull().default(0),
  version: integer("version").default(1),
  parentTemplateId: varchar("parent_template_id", { length: 255 }).references((): any => budgetTemplates.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetTemplatesRelations = relations(budgetTemplates, ({ one, many }) => ({
  user: one(users, {
    fields: [budgetTemplates.userId],
    references: [users.id],
  }),
  templateItems: many(budgetTemplateItems),
}));

export const insertBudgetTemplateSchema = createInsertSchema(budgetTemplates).omit({
  id: true,
  createdAt: true,
});

export type BudgetTemplate = typeof budgetTemplates.$inferSelect;
export type InsertBudgetTemplate = z.infer<typeof insertBudgetTemplateSchema>;


// ===== BUDGET RULE PRESETS TABLE =====
export const budgetRulePresets = pgTable("budget_rule_presets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // "percentage" | "zero-based" | "custom"
  ruleConfig: text("rule_config").notNull(), // JSON stringified config
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetRulePresetsRelations = relations(budgetRulePresets, ({ one }) => ({
  user: one(users, {
    fields: [budgetRulePresets.userId],
    references: [users.id],
  }),
}));

export const insertBudgetRulePresetSchema = createInsertSchema(budgetRulePresets).omit({
  id: true,
  createdAt: true,
});

export type BudgetRulePreset = typeof budgetRulePresets.$inferSelect;
export type InsertBudgetRulePreset = z.infer<typeof insertBudgetRulePresetSchema>;

// ===== SAVINGS AUTO SWEEP TABLE =====
export const savingsAutoSweep = pgTable("savings_auto_sweep", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceCategory: varchar("source_category", { length: 100 }).notNull(),
  targetGoalId: varchar("target_goal_id", { length: 255 }).references(() => goals.id, { onDelete: "cascade" }),
  threshold: numeric("threshold", { precision: 15, scale: 2 }).notNull(),
  isActive: integer("is_active").default(1),
  lastSweptAt: timestamp("last_swept_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savingsAutoSweepRelations = relations(savingsAutoSweep, ({ one }) => ({
  user: one(users, {
    fields: [savingsAutoSweep.userId],
    references: [users.id],
  }),
  targetGoal: one(goals, {
    fields: [savingsAutoSweep.targetGoalId],
    references: [goals.id],
  }),
}));

export const insertSavingsAutoSweepSchema = createInsertSchema(savingsAutoSweep).omit({
  id: true,
  createdAt: true,
});

export type SavingsAutoSweep = typeof savingsAutoSweep.$inferSelect;
export type InsertSavingsAutoSweep = z.infer<typeof insertSavingsAutoSweepSchema>;


// ===== BUDGET TEMPLATE ITEMS TABLE =====
export const budgetTemplateItems = pgTable("budget_template_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id", { length: 255 })
    .notNull()
    .references(() => budgetTemplates.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 50 }),
  unit: varchar("unit", { length: 50 }),
  averagePrice: varchar("average_price", { length: 50 }),
  bestLocation: varchar("best_location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetTemplateItemsRelations = relations(budgetTemplateItems, ({ one }) => ({
  template: one(budgetTemplates, {
    fields: [budgetTemplateItems.templateId],
    references: [budgetTemplates.id],
  }),
}));

export const insertBudgetTemplateItemSchema = createInsertSchema(budgetTemplateItems).omit({
  id: true,
  createdAt: true,
});

export type BudgetTemplateItem = typeof budgetTemplateItems.$inferSelect;
export type InsertBudgetTemplateItem = z.infer<typeof insertBudgetTemplateItemSchema>;

// ===== ITEMS TABLE (Master Item List) =====
export const items = pgTable("items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  aliases: text("aliases").array(),
  averagePrice: varchar("average_price", { length: 50 }),
  bestPrice: varchar("best_price", { length: 50 }),
  bestLocation: varchar("best_location", { length: 255 }),
  lastPurchased: timestamp("last_purchased"),
  purchaseCount: integer("purchase_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.id],
  }),
  priceHistory: many(itemPriceHistory),
}));

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
});

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

// ===== ITEM PRICE HISTORY TABLE =====
export const itemPriceHistory = pgTable("item_price_history", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id", { length: 255 })
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  price: varchar("price", { length: 50 }).notNull(),
  locationName: varchar("location_name", { length: 255 }),
  locationLat: varchar("location_lat", { length: 50 }),
  locationLon: varchar("location_lon", { length: 50 }),
  purchaseDate: timestamp("purchase_date").notNull(),
  budgetItemId: varchar("budget_item_id", { length: 255 })
    .references(() => budgetItems.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const itemPriceHistoryRelations = relations(itemPriceHistory, ({ one }) => ({
  item: one(items, {
    fields: [itemPriceHistory.itemId],
    references: [items.id],
  }),
  budgetItem: one(budgetItems, {
    fields: [itemPriceHistory.budgetItemId],
    references: [budgetItems.id],
  }),
}));

export const insertItemPriceHistorySchema = createInsertSchema(itemPriceHistory).omit({
  id: true,
  createdAt: true,
});

export type ItemPriceHistory = typeof itemPriceHistory.$inferSelect;
export type InsertItemPriceHistory = z.infer<typeof insertItemPriceHistorySchema>;

// ===== FINANCIAL GOALS TABLE =====
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "cancelled", "paused"]);
export const goalCategoryEnum = pgEnum("goal_category", ["emergency", "vacation", "education", "house", "investment", "debt_payoff", "other"]);
export const contributionFrequencyEnum = pgEnum("contribution_frequency", ["daily", "weekly", "monthly", "yearly", "flexible"]);
export const contributionModeEnum = pgEnum("contribution_mode", ["calculated_amount", "calculated_date", "flexible_amount", "completely_flexible"]);

export const goals = pgTable("goals", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  deadline: date("deadline"),
  status: goalStatusEnum("status").notNull().default("active"),
  description: text("description"),
  why: text("why"),
  category: goalCategoryEnum("category").default("other"),
  monthlyContribution: decimal("monthly_contribution", { precision: 15, scale: 2 }),
  pausedAt: timestamp("paused_at"),
  originalDeadline: date("original_deadline"),
  milestonesReached: text("milestones_reached").default("[]"),
  witnessEmail: text("witness_email"),
  witnessName: text("witness_name"),
  boostWeekActive: integer("boost_week_active").default(0),
  boostWeekEnds: timestamp("boost_week_ends"),
  boostWeekStarted: timestamp("boost_week_started"),
  quickGoalNlpSource: text("quick_goal_nlp_source"),
  progressUnit: text("progress_unit").default("percentage"),
  clonedFromId: varchar("cloned_from_id", { length: 255 }),
  lastBoostWeekQuarter: text("last_boost_week_quarter"),
  contributionFrequency: contributionFrequencyEnum("contribution_frequency"),
  contributionMode: contributionModeEnum("contribution_mode"),
  scheduledAmount: decimal("scheduled_amount", { precision: 15, scale: 2 }),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  sourceAccountId: varchar("source_account_id", { length: 255 })
    .references(() => accounts.id, { onDelete: "set null" }),
  nextScheduledContribution: date("next_scheduled_contribution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  sourceAccount: one(accounts, {
    fields: [goals.sourceAccountId],
    references: [accounts.id],
  }),
}));

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  targetAmount: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format"),
    z.number().positive("Must be positive")
  ]).transform(val => String(val)),
  currentAmount: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format"),
    z.number().nonnegative("Must be non-negative")
  ]).transform(val => String(val)),
  monthlyContribution: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format"),
    z.number().nonnegative("Must be non-negative"),
    z.null()
  ]).transform(val => val === null ? null : String(val)).optional().nullable(),
  scheduledAmount: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format"),
    z.number().nonnegative("Must be non-negative"),
    z.null()
  ]).transform(val => val === null ? null : String(val)).optional().nullable(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

// ===== GOAL CONTRIBUTIONS TABLE =====
export const goalContributions = pgTable("goal_contributions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id", { length: 255 })
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  scheduledDate: date("scheduled_date"),
  actualDate: date("actual_date").notNull(),
  sourceAccountId: varchar("source_account_id", { length: 255 })
    .references(() => accounts.id, { onDelete: "set null" }),
  transactionId: varchar("transaction_id", { length: 255 })
    .references(() => transactions.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goalContributionsRelations = relations(goalContributions, ({ one }) => ({
  goal: one(goals, {
    fields: [goalContributions.goalId],
    references: [goals.id],
  }),
  sourceAccount: one(accounts, {
    fields: [goalContributions.sourceAccountId],
    references: [accounts.id],
  }),
  transaction: one(transactions, {
    fields: [goalContributions.transactionId],
    references: [transactions.id],
  }),
}));

export const insertGoalContributionSchema = createInsertSchema(goalContributions).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format"),
    z.number().positive("Must be positive")
  ]).transform(val => String(val)),
});

export type GoalContribution = typeof goalContributions.$inferSelect;
export type InsertGoalContribution = z.infer<typeof insertGoalContributionSchema>;

// ===== SAVINGS RECOMMENDATIONS TABLE =====
export const savingsRecommendations = pgTable("savings_recommendations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  suggestedAmount: decimal("suggested_amount", { precision: 15, scale: 2 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // 0-100 percentage
  category: text("category").notNull(), // "expense_reduction", "savings_increase", etc.
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savingsRecommendationsRelations = relations(savingsRecommendations, ({ one }) => ({
  user: one(users, {
    fields: [savingsRecommendations.userId],
    references: [users.id],
  }),
}));

export const insertSavingsRecommendationSchema = createInsertSchema(savingsRecommendations).omit({
  id: true,
  createdAt: true,
});

export type SavingsRecommendation = typeof savingsRecommendations.$inferSelect;
export type InsertSavingsRecommendation = z.infer<typeof insertSavingsRecommendationSchema>;

// ===== LEARNING CENTER =====
export const lessonStatusEnum = pgEnum("lesson_status", ["not_started", "in_progress", "completed"]);

export const lessons = pgTable("lessons", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(), // Markdown content
  category: text("category").notNull(), // "budgeting", "saving", "investing", "credit", etc.
  orderIndex: integer("order_index").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(10),
  objectives: text("objectives").array(), // Learning objectives
  isPublished: integer("is_published").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lessonsRelations = relations(lessons, ({ many }) => ({
  quizQuestions: many(quizQuestions),
  userProgress: many(userLessonProgress),
}));

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;

// ===== USER LESSON PROGRESS =====
export const userLessonProgress = pgTable("user_lesson_progress", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id", { length: 255 })
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  status: lessonStatusEnum("status").notNull().default("not_started"),
  score: integer("score"), // Quiz score (0-100)
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userLessonProgressRelations = relations(userLessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [userLessonProgress.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [userLessonProgress.lessonId],
    references: [lessons.id],
  }),
}));

export const insertUserLessonProgressSchema = createInsertSchema(userLessonProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserLessonProgress = typeof userLessonProgress.$inferSelect;
export type InsertUserLessonProgress = z.infer<typeof insertUserLessonProgressSchema>;

// ===== QUIZ QUESTIONS =====
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id", { length: 255 })
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options").array().notNull(), // Array of answer options
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"), // Optional explanation for the answer
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  lesson: one(lessons, {
    fields: [quizQuestions.lessonId],
    references: [lessons.id],
  }),
}));

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;

// ===== QUIZ RESULTS =====
export const quizResults = pgTable("quiz_results", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id", { length: 255 })
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // Percentage (0-100)
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  answers: text("answers"), // JSON string of user's answers
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const quizResultsRelations = relations(quizResults, ({ one }) => ({
  user: one(users, {
    fields: [quizResults.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [quizResults.lessonId],
    references: [lessons.id],
  }),
}));

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  completedAt: true,
});

export type QuizResult = typeof quizResults.$inferSelect;
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;

// ===== ACHIEVEMENTS TABLE =====
export const achievements = pgTable("achievements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  achievementType: text("achievement_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  earnedAt: true,
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

// ===== SHOPPING ITEMS TABLE =====
export const shoppingItems = pgTable("shopping_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetPrice: text("target_price").notNull(),
  category: text("category").default("General"),
  deadline: timestamp("deadline"),
  notifications: integer("notifications").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const priceHistory = pgTable("shopping_price_checks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id", { length: 255 }).notNull().references(() => shoppingItems.id, { onDelete: "cascade" }),
  storeName: text("store_name").notNull(),
  price: text("price").notNull(),
  location: text("location"),
  checkedAt: timestamp("checked_at").defaultNow(),
});

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  shoppingItem: one(shoppingItems, {
    fields: [priceHistory.itemId],
    references: [shoppingItems.id],
  }),
}));

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  checkedAt: true,
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;

// ===== USERS RELATIONS =====
export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  transactions: many(transactions),
  budgets: many(budgets),
  budgetTemplates: many(budgetTemplates),
  budgetRulePresets: many(budgetRulePresets),
  savingsAutoSweep: many(savingsAutoSweep),
  budgetTemplateItems: many(budgetTemplateItems),
  items: many(items),
  goals: many(goals),
  savingsRecommendations: many(savingsRecommendations),
  lessonProgress: many(userLessonProgress),
  quizResults: many(quizResults),
  achievements: many(achievements),
  debts: many(debts),
  recurringIncome: many(recurringIncome),
  categoryOverrides: many(categoryOverrides),
  notificationSubscriptions: many(notificationSubscriptions),
  userPreferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
}));


// ===== DEBTS TABLE =====
export const debtRepaymentMethodEnum = pgEnum("debt_repayment_method", [
  "bullet",
  "amortization",
  "reborrowing_cascade",
  "interest_only_balloon",
  "equal_principal",
  "graduated",
  "snowball",
  "avalanche",
  "settlement",
  "forbearance"
]);

export const debts = pgTable("debts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "i_owe" or "owed_to_me"
  creditorDebtor: varchar("creditor_debtor", { length: 255 }).notNull(),
  principalAmount: varchar("principal_amount", { length: 50 }).notNull(),
  currentBalance: varchar("current_balance", { length: 50 }).notNull(),
  interestRate: varchar("interest_rate", { length: 50 }), // APR as percentage (per period)
  repaymentMethod: debtRepaymentMethodEnum("repayment_method").notNull().default("amortization"),

  // Classic amortization fields
  paymentAmount: varchar("payment_amount", { length: 50 }), // for amortization
  paymentFrequency: varchar("payment_frequency", { length: 50 }), // "monthly", "biweekly", "weekly"
  totalPeriods: integer("total_periods"), // number of payment periods

  // Graduated (step-up) payment fields
  graduatedBasePayment: varchar("graduated_base_payment", { length: 50 }), // starting payment amount
  graduatedStepPeriods: integer("graduated_step_periods"), // periods between increases (e.g., 3)
  graduatedStepPercentage: varchar("graduated_step_percentage", { length: 50 }), // increase % (e.g., 25)
  graduatedAllowNegativeAmort: boolean("graduated_allow_negative_amort").default(false),

  // Re-borrowing cascade fields
  reborrowPercentage: varchar("reborrow_percentage", { length: 50 }), // % of principal to reborrow (e.g., 80)
  reborrowMaxCycles: integer("reborrow_max_cycles"), // max number of cascade cycles

  // Settlement fields
  settlementCashAvailable: varchar("settlement_cash_available", { length: 50 }),
  settlementAcceptedPercentage: varchar("settlement_accepted_percentage", { length: 50 }), // lender accepts X% (e.g., 70)
  settlementMinCashBuffer: varchar("settlement_min_cash_buffer", { length: 50 }), // min cash to keep after settlement

  // Forbearance fields
  forbearanceHolidayPeriods: integer("forbearance_holiday_periods"), // periods with zero payment
  forbearanceRepayPeriods: integer("forbearance_repay_periods"), // periods to repay accrued interest

  // User financial context for risk warnings
  monthlyIncome: varchar("monthly_income", { length: 50 }), // user's monthly income
  monthlyLivingCosts: varchar("monthly_living_costs", { length: 50 }), // user's living expenses
  maxAffordablePayment: varchar("max_affordable_payment", { length: 50 }), // max they can pay per period

  // Debt reasons and voice recording
  reasons: text("reasons"), // why user is taking this debt
  reasonsVoiceUrl: text("reasons_voice_url"), // URL to voice recording
  reasonsTranscription: text("reasons_transcription"), // voice transcription

  // AI risk analysis
  aiRiskAnalysis: jsonb("ai_risk_analysis"), // structured AI analysis results
  aiRecommendation: text("ai_recommendation"), // AI recommendation text
  aiRiskScore: integer("ai_risk_score"), // 0-100 risk score

  startDate: date("start_date").notNull(),
  dueDate: date("due_date"),
  nextPaymentDate: date("next_payment_date"),
  payoffDate: date("payoff_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const debtsRelations = relations(debts, ({ one, many }) => ({
  user: one(users, {
    fields: [debts.userId],
    references: [users.id],
  }),
  payments: many(debtPayments),
}));

export const insertDebtSchema = createInsertSchema(debts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;

// ===== DEBT PAYMENTS TABLE =====
export const debtPayments = pgTable("debt_payments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  debtId: varchar("debt_id", { length: 255 })
    .notNull()
    .references(() => debts.id, { onDelete: "cascade" }),
  amount: varchar("amount", { length: 50 }).notNull(),
  principalPaid: varchar("principal_paid", { length: 50 }).notNull(),
  interestPaid: varchar("interest_paid", { length: 50 }),
  paymentDate: date("payment_date").notNull(),
  accountId: varchar("account_id", { length: 255 }).references(() => accounts.id),
  isExtraPayment: boolean("is_extra_payment").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const debtPaymentsRelations = relations(debtPayments, ({ one }) => ({
  debt: one(debts, {
    fields: [debtPayments.debtId],
    references: [debts.id],
  }),
  account: one(accounts, {
    fields: [debtPayments.accountId],
    references: [accounts.id],
  }),
}));

export const insertDebtPaymentSchema = createInsertSchema(debtPayments).omit({
  id: true,
  createdAt: true,
});

export type DebtPayment = typeof debtPayments.$inferSelect;
export type InsertDebtPayment = z.infer<typeof insertDebtPaymentSchema>;

// ===== RECURRING INCOME TABLE =====
export const recurringIncome = pgTable("recurring_income", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 50 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // "weekly", "biweekly", "monthly", "yearly"
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly
  monthOfYear: integer("month_of_year"), // 1-12 for yearly
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null = ongoing
  depositAccountId: varchar("deposit_account_id", { length: 255 }).references(() => accounts.id),
  isActive: boolean("is_active").notNull().default(true),
  lastReminded: timestamp("last_reminded"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recurringIncomeRelations = relations(recurringIncome, ({ one }) => ({
  user: one(users, {
    fields: [recurringIncome.userId],
    references: [users.id],
  }),
  depositAccount: one(accounts, {
    fields: [recurringIncome.depositAccountId],
    references: [accounts.id],
  }),
}));

export const insertRecurringIncomeSchema = createInsertSchema(recurringIncome).omit({
  id: true,
  createdAt: true,
});

export type RecurringIncome = typeof recurringIncome.$inferSelect;
export type InsertRecurringIncome = z.infer<typeof insertRecurringIncomeSchema>;

// ===== CATEGORY OVERRIDES TABLE (NLP Learning) =====
export const categoryOverrides = pgTable("category_overrides", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  originalDescription: text("original_description").notNull(),
  normalizedDescription: text("normalized_description").notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // "income" or "expense"
  suggestedCategory: varchar("suggested_category", { length: 100 }).notNull(),
  userSelectedCategory: varchar("user_selected_category", { length: 100 }).notNull(),
  overrideCount: integer("override_count").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categoryOverridesRelations = relations(categoryOverrides, ({ one }) => ({
  user: one(users, {
    fields: [categoryOverrides.userId],
    references: [users.id],
  }),
}));

export const insertCategoryOverrideSchema = createInsertSchema(categoryOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CategoryOverride = typeof categoryOverrides.$inferSelect;
export type InsertCategoryOverride = z.infer<typeof insertCategoryOverrideSchema>;

// ===== USER PREFERENCES TABLE =====
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  budgetRule: varchar("budget_rule", { length: 50 }).notNull().default("50/30/20"), // "50/30/20", "60/20/20", "80/20", "zero-based", "envelope", "custom"
  customNeedsPercent: integer("custom_needs_percent"),
  customWantsPercent: integer("custom_wants_percent"),
  customSavingsPercent: integer("custom_savings_percent"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  notifyAt75Percent: boolean("notify_at_75_percent").notNull().default(true),
  notifyAt100Percent: boolean("notify_at_100_percent").notNull().default(true),
  browserPushEnabled: boolean("browser_push_enabled").notNull().default(false),
  debtPayoffStrategy: varchar("debt_payoff_strategy", { length: 50 }), // "snowball", "avalanche", null
  gamificationEnabled: boolean("gamification_enabled").notNull().default(true),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  autoSweepEnabled: boolean("auto_sweep_enabled").notNull().default(false),
  autoSweepThreshold: varchar("auto_sweep_threshold", { length: 50 }).default("50"),
  autoSweepTargetGoalId: varchar("auto_sweep_target_goal_id", { length: 255 }),
  overdraftWarningEnabled: boolean("overdraft_warning_enabled").notNull().default(true),
  enablePushNotifications: integer("enable_push_notifications").default(1),
  preferredCurrency: varchar("preferred_currency", { length: 3 }).default("USD"),
  aiSuggestionStats: text("ai_suggestion_stats"), // JSON tracking of suggestion interactions
  aiSuggestionEngagement: varchar("ai_suggestion_engagement", { length: 10 }).default("0"), // Count of applied suggestions
  showInsufficientFundsWarning: boolean("show_insufficient_funds_warning").notNull().default(true),
  showBudgetOverspendWarning: boolean("show_budget_overspend_warning").notNull().default(true),
  showLowBalanceWarning: boolean("show_low_balance_warning").notNull().default(true),
  lowBalanceThreshold: decimal("low_balance_threshold", { precision: 15, scale: 2 }).default("100"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

// ===== AI INSIGHTS HISTORY TABLE =====
export const aiInsightsHistory = pgTable("ai_insights_history", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  insights: jsonb("insights").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userFeedback: jsonb("user_feedback"),
});

// ===== BUDGET NOTIFICATIONS TABLE =====
export const budgetNotifications = pgTable("budget_notifications", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  budgetId: varchar("budget_id", { length: 255 })
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  percentUsed: integer("percent_used").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetNotificationsRelations = relations(budgetNotifications, ({ one }) => ({
  user: one(users, {
    fields: [budgetNotifications.userId],
    references: [users.id],
  }),
  budget: one(budgets, {
    fields: [budgetNotifications.budgetId],
    references: [budgets.id],
  }),
}));

export const insertBudgetNotificationSchema = createInsertSchema(budgetNotifications).omit({
  id: true,
  createdAt: true,
});

export type BudgetNotification = typeof budgetNotifications.$inferSelect;
export type InsertBudgetNotification = z.infer<typeof insertBudgetNotificationSchema>;

// ===== MERCHANT PRICE BOOK TABLE =====
export const merchantPriceBook = pgTable("merchant_price_book", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  merchantName: varchar("merchant_name", { length: 255 }).notNull(),
  normalizedItemName: varchar("normalized_item_name", { length: 255 }).notNull(), // for matching
  category: varchar("category", { length: 100 }).notNull(),
  userVerifiedPrice: varchar("user_verified_price", { length: 50 }),
  lastPrice: varchar("last_price", { length: 50 }).notNull(),
  averagePrice: varchar("average_price", { length: 50 }),
  minPrice: varchar("min_price", { length: 50 }),
  maxPrice: varchar("max_price", { length: 50 }),
  priceCheckCount: integer("price_check_count").notNull().default(1),
  lastPurchased: timestamp("last_purchased").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const merchantPriceBookRelations = relations(merchantPriceBook, ({ one }) => ({
  user: one(users, {
    fields: [merchantPriceBook.userId],
    references: [users.id],
  }),
}));

export const insertMerchantPriceBookSchema = createInsertSchema(merchantPriceBook).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MerchantPriceBook = typeof merchantPriceBook.$inferSelect;
export type InsertMerchantPriceBook = z.infer<typeof insertMerchantPriceBookSchema>;

// ===== USER STREAKS TABLE =====
export const userStreaks = pgTable("user_streaks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastBudgetCheckDate: date("last_budget_check_date"),
  totalDaysInBudget: integer("total_days_in_budget").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
  user: one(users, {
    fields: [userStreaks.userId],
    references: [users.id],
  }),
}));

export const insertUserStreakSchema = createInsertSchema(userStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserStreak = typeof userStreaks.$inferSelect;
export type InsertUserStreak = z.infer<typeof insertUserStreakSchema>;

// ===== QUICK DEAL MONTHLY ACCOUNTS TABLE =====
export const quickDealMonthlyAccounts = pgTable("quick_deal_monthly_accounts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: varchar("account_id", { length: 255 })
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  month: varchar("month", { length: 7 }).notNull(), // Format: YYYY-MM
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quickDealMonthlyAccountsRelations = relations(quickDealMonthlyAccounts, ({ one }) => ({
  user: one(users, {
    fields: [quickDealMonthlyAccounts.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [quickDealMonthlyAccounts.accountId],
    references: [accounts.id],
  }),
}));

export const insertQuickDealMonthlyAccountSchema = createInsertSchema(quickDealMonthlyAccounts).omit({
  id: true,
  createdAt: true,
});

export type QuickDealMonthlyAccount = typeof quickDealMonthlyAccounts.$inferSelect;
export type InsertQuickDealMonthlyAccount = z.infer<typeof insertQuickDealMonthlyAccountSchema>;

// ===== BUDGET GOAL ALLOCATIONS TABLE =====
export const budgetGoalAllocations = pgTable("budget_goal_allocations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id", { length: 255 })
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  goalId: varchar("goal_id", { length: 255 })
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  allocatedAmount: varchar("allocated_amount", { length: 50 }).notNull(),
  autoSweepUnused: boolean("auto_sweep_unused").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetGoalAllocationsRelations = relations(budgetGoalAllocations, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetGoalAllocations.budgetId],
    references: [budgets.id],
  }),
  goal: one(goals, {
    fields: [budgetGoalAllocations.goalId],
    references: [goals.id],
  }),
}));

export const insertBudgetGoalAllocationSchema = createInsertSchema(budgetGoalAllocations).omit({
  id: true,
  createdAt: true,
});

export type BudgetGoalAllocation = typeof budgetGoalAllocations.$inferSelect;
export type InsertBudgetGoalAllocation = z.infer<typeof insertBudgetGoalAllocationSchema>;

// ===== CASH FLOW FORECAST TABLE =====
export const cashFlowForecasts = pgTable("cash_flow_forecasts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  forecastDate: date("forecast_date").notNull(),
  predictedBalance: varchar("predicted_balance", { length: 50 }).notNull(),
  predictedIncome: varchar("predicted_income", { length: 50 }).notNull(),
  predictedExpenses: varchar("predicted_expenses", { length: 50 }).notNull(),
  isLowBalanceWarning: boolean("is_low_balance_warning").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cashFlowForecastsRelations = relations(cashFlowForecasts, ({ one }) => ({
  user: one(users, {
    fields: [cashFlowForecasts.userId],
    references: [users.id],
  }),
}));

export const insertCashFlowForecastSchema = createInsertSchema(cashFlowForecasts).omit({
  id: true,
  createdAt: true,
});

export type CashFlowForecast = typeof cashFlowForecasts.$inferSelect;
export type InsertCashFlowForecast = z.infer<typeof insertCashFlowForecastSchema>;

// ===== PANTRY INVENTORY TABLE =====
export const pantryInventory = pgTable("pantry_inventory", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  normalizedItemName: varchar("normalized_item_name", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  category: varchar("category", { length: 100 }).notNull(),
  lastPurchased: timestamp("last_purchased").notNull(),
  expirationDate: date("expiration_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pantryInventoryRelations = relations(pantryInventory, ({ one }) => ({
  user: one(users, {
    fields: [pantryInventory.userId],
    references: [users.id],
  }),
}));

export const insertPantryInventorySchema = createInsertSchema(pantryInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PantryInventory = typeof pantryInventory.$inferSelect;
export type InsertPantryInventory = z.infer<typeof insertPantryInventorySchema>;


// ===== NOTIFICATION SUBSCRIPTIONS TABLE (Push Notifications) =====
export const notificationSubscriptions = pgTable("notification_subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationSubscriptionsRelations = relations(notificationSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [notificationSubscriptions.userId],
    references: [users.id],
  }),
}));

export const insertNotificationSubscriptionSchema = createInsertSchema(notificationSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type InsertNotificationSubscription = z.infer<typeof insertNotificationSubscriptionSchema>;