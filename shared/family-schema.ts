
import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const families = pgTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyMembers = pgTable("family_members", {
  familyId: text("family_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(), // owner, admin, member, viewer
  permissions: text("permissions").notNull(), // JSON string of permissions
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.familyId, table.userId] }),
}));

export const sharedBudgets = pgTable("shared_budgets", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  category: text("category").notNull(),
  amount: text("amount").notNull(),
  period: text("period").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
