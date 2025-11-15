import { suggestCategory, recordCategoryChoice } from "./ai-recommendations";

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import * as storage from "./storage";
import {
  insertUserSchema, insertAccountSchema, insertTransactionSchema,
  insertBudgetSchema, insertGoalSchema, type InsertUser
} from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getBalanceSheet, getCashFlow, getFinancialRatios, calculateFinancialHealthScore, getSpendingPatterns, getNetWorthHistory, getBalanceHistory } from "./analytics";
import { generateAIRecommendations } from "./ai-recommendations";
import { importCSV } from "./import";
import { predictExpenses, generateFinancialInsights } from "./gemini-ai";
import { setupSecurity } from "./security";
import multer from "multer";
import { eq, and, desc, or } from "drizzle-orm"; // Imported and, desc, or
import { users, budgetNotifications, budgetTemplates, budgetTemplateItems, budgetRulePresets, savingsAutoSweep, userPreferences, budgets, budgetItems, budgetCategoryItems, goals, pantryInventory, notificationSubscriptions, userStreaks, priceHistory, accounts, transactions, transactionEntries } from "@shared/schema";

// Extend session type to include userId
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
import { randomUUID } from "crypto"; // Imported randomUUID
import { promises as fs } from 'fs';
import path from 'path';


const upload = multer({ storage: multer.memoryStorage() });

// Utility function for formatting currency
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}


export async function registerRoutes(app: Express): Promise<Server> {
  setupSecurity(app);

  // Seed lessons (will skip existing ones)
  try {
    const { seedLessons } = await import("./seed-lessons");
    console.log("Checking and seeding lessons...");
    await seedLessons();
  } catch (error) {
    console.error("Failed to seed lessons:", error);
  }


  // Session-based authentication middleware
  const authenticate = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }
    req.userId = req.session.userId;
    next();
  };

  // ============= Authentication Routes =============

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      // Check if user exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      // Set session and save it before doing any work
      req.session.userId = user.id;

      // Ensure session is saved before proceeding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // No default accounts or sample data - user will set up via onboarding wizard
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create session
      req.session.userId = user.id;

      // Ensure session is saved before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Check authentication status
  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // ============= User Routes =============

  app.get("/api/users/me", authenticate, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/me", authenticate, async (req: any, res) => {
    try {
      const data = req.body;

      // If changing email, check it's not already taken
      if (data.email) {
        const existingEmail = await storage.getUserByEmail(data.email);
        if (existingEmail && existingEmail.id !== req.userId) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      // If changing password, hash it
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      const user = await storage.updateUser(req.userId, data);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User preferences
  app.get("/api/users/preferences", authenticate, async (req: any, res) => {
    try {
      const prefs = await storage.getUserPreferences(req.userId);
      if (!prefs) {
        // Return default preferences if none exist yet
        return res.json({
          userId: req.userId,
          hasCompletedOnboarding: false,
          settings: {}
        });
      }
      res.json(prefs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/preferences', authenticate, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }

    try {
      const { hasCompletedOnboarding, preferredCurrency, weekStartDay, skipSampleData } = req.body;
      const userId = req.userId;

      const [updatedUser] = await db
        .update(users)
        .set({
          hasCompletedOnboarding: hasCompletedOnboarding ?? undefined,
          preferredCurrency: preferredCurrency ?? undefined,
          weekStartDay: weekStartDay ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      // Skip sample data seeding - users start with clean slate
      // Sample data seeding has been disabled per user request

      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= Account Routes =============

  app.get("/api/accounts", authenticate, async (req: any, res) => {
    try {
      const accounts = await storage.getAccountsByUserId(req.userId);
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/accounts/:id", authenticate, async (req: any, res) => {
    try {
      const account = await storage.getAccountById(req.params.id);
      if (!account || account.userId !== req.userId) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/accounts", authenticate, async (req: any, res) => {
    try {
      const data = insertAccountSchema.parse({ ...req.body, userId: req.userId });
      const account = await storage.createAccount(data);
      res.status(201).json(account);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/accounts/:id", authenticate, async (req: any, res) => {
    try {
      const account = await storage.getAccountById(req.params.id);
      if (!account || account.userId !== req.userId) {
        return res.status(404).json({ error: "Account not found" });
      }
      const updated = await storage.updateAccount(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/accounts/:id", authenticate, async (req: any, res) => {
    try {
      const account = await storage.getAccountById(req.params.id);
      if (!account || account.userId !== req.userId) {
        return res.status(404).json({ error: "Account not found" });
      }
      await storage.deleteAccount(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/accounts/adjust-balance", authenticate, async (req: any, res) => {
    try {
      const { accountId, actualBalance, notes } = req.body;

      const account = await storage.getAccountById(accountId);
      if (!account || account.userId !== req.userId) {
        return res.status(404).json({ error: "Account not found" });
      }

      const currentBalance = parseFloat(account.balance);
      const newBalance = parseFloat(actualBalance);
      const difference = newBalance - currentBalance;

      if (difference === 0) {
        return res.status(400).json({ error: "No adjustment needed" });
      }

      // Create adjustment transaction
      const today = new Date().toISOString().split('T')[0];
      const description = notes || `Balance adjustment for ${account.name}`;

      // Find or create "Balance Adjustment" equity account
      let adjustmentAccount = await storage.getAccountsByUserId(req.userId).then(accounts =>
        accounts.find(a => a.name === 'Balance Adjustments' && a.accountType === 'equity')
      );

      if (!adjustmentAccount) {
        adjustmentAccount = await storage.createAccount({
          userId: req.userId,
          name: 'Balance Adjustments',
          accountType: 'equity' as any,
          accountCategory: 'other_expense' as any,
          balance: '0',
          description: 'Auto-created for balance adjustments and reconciliations',
        });
      }

      // Create double-entry adjustment
      if (difference > 0) {
        // Increase asset balance
        await storage.createTransactionWithEntries(req.userId, {
          date: today,
          description,
          totalAmount: Math.abs(difference).toFixed(2),
          notes: `Adjustment: ${formatCurrency(currentBalance)} → ${formatCurrency(newBalance)}`,
        }, [
          { accountId: account.id, entryType: 'debit', amount: Math.abs(difference).toFixed(2) },
          { accountId: adjustmentAccount.id, entryType: 'credit', amount: Math.abs(difference).toFixed(2) },
        ]);
      } else {
        // Decrease asset balance
        await storage.createTransactionWithEntries(req.userId, {
          date: today,
          description,
          totalAmount: Math.abs(difference).toFixed(2),
          notes: `Adjustment: ${formatCurrency(currentBalance)} → ${formatCurrency(newBalance)}`,
        }, [
          { accountId: adjustmentAccount.id, entryType: 'debit', amount: Math.abs(difference).toFixed(2) },
          { accountId: account.id, entryType: 'credit', amount: Math.abs(difference).toFixed(2) },
        ]);
      }

      const updatedAccount = await storage.getAccountById(accountId);
      res.json(updatedAccount);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Transaction Routes =============
  app.get("/api/transactions", authenticate, async (req: any, res) => {
    try {
      const transactions = await storage.getTransactionsByUserId(req.userId);
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      res.json(transactions.slice(0, limit));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transactions/range", authenticate, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const transactions = await storage.getTransactionsByDateRange(
        req.userId,
        startDate as string,
        endDate as string
      );
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transactions/:id", authenticate, async (req: any, res) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction || transaction.userId !== req.userId) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", authenticate, async (req: any, res) => {
    try {
      // Validate request with Zod schema
      const transactionEntrySchema = z.object({
        accountId: z.string().uuid(),
        entryType: z.enum(['debit', 'credit']),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/)
      });

      const transactionRequestSchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().min(1).max(500),
        notes: z.string().max(1000).optional().nullable(),
        entries: z.array(transactionEntrySchema).min(2)
      });

      const validatedData = transactionRequestSchema.parse(req.body);

      // Calculate total amount from debits
      let totalDebits = 0;
      for (const entry of validatedData.entries) {
        if (entry.entryType === 'debit') {
          totalDebits += parseFloat(entry.amount);
        }
      }

      const totalAmount = totalDebits.toFixed(2);

      // createTransactionWithEntries now enforces all invariants (ownership, balance)
      const transaction = await storage.createTransactionWithEntries(
        req.userId,
        {
          date: validatedData.date,
          description: validatedData.description,
          totalAmount,
          notes: validatedData.notes || null
        },
        validatedData.entries
      );

      res.status(201).json(transaction);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error("Error creating transaction:", error); // Added detailed logging
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/transactions/:id", authenticate, async (req: any, res) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction || transaction.userId !== req.userId) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      const updated = await storage.updateTransaction(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/transactions/:id", authenticate, async (req: any, res) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction || transaction.userId !== req.userId) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      await storage.deleteTransaction(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Opening Balance Transaction
  app.post("/api/transactions/opening-balance", authenticate, async (req: any, res) => {
    try {
      const schema = z.object({
        accountId: z.string(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      });

      const data = schema.parse(req.body);

      // Get the account to verify ownership and get details
      const account = await storage.getAccountById(data.accountId);
      if (!account || account.userId !== req.userId) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Create an equity/opening balance account if it doesn't exist
      let equityAccount = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, req.userId),
            eq(accounts.name, "Opening Balance Equity"),
            eq(accounts.accountType, "income")
          )
        )
        .limit(1);

      if (!equityAccount || equityAccount.length === 0) {
        const [created] = await db.insert(accounts).values({
          userId: req.userId,
          name: "Opening Balance Equity",
          accountType: "income",
          accountCategory: "other_income",
          balance: "0",
          description: "System account for opening balances",
        }).returning();
        equityAccount = [created];
      }

      // Create the opening balance transaction
      const [transaction] = await db.insert(transactions).values({
        userId: req.userId,
        date: data.date,
        description: `Opening Balance - ${account.name}`,
        totalAmount: data.amount,
        status: 'posted',
        category: account.accountCategory,
      }).returning();

      // Create transaction entries (double-entry bookkeeping)
      const amount = data.amount;

      if (account.accountType === 'asset' || account.accountType === 'expense') {
        // Debit the asset/expense account
        await db.insert(transactionEntries).values({
          transactionId: transaction.id,
          accountId: account.id,
          entryType: 'debit',
          amount: amount,
        });

        // Credit the equity account
        await db.insert(transactionEntries).values({
          transactionId: transaction.id,
          accountId: equityAccount[0].id,
          entryType: 'credit',
          amount: amount,
        });

        // Update account balance
        await db.update(accounts)
          .set({ balance: String(parseFloat(account.balance) + parseFloat(amount)) })
          .where(eq(accounts.id, account.id));

      } else {
        // For liability/income accounts, credit them
        await db.insert(transactionEntries).values({
          transactionId: transaction.id,
          accountId: account.id,
          entryType: 'credit',
          amount: amount,
        });

        // Debit the equity account
        await db.insert(transactionEntries).values({
          transactionId: transaction.id,
          accountId: equityAccount[0].id,
          entryType: 'debit',
          amount: amount,
        });

        // Update account balance (negative for liabilities)
        await db.update(accounts)
          .set({ balance: String(parseFloat(account.balance) - parseFloat(amount)) })
          .where(eq(accounts.id, account.id));
      }

      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Audio Upload Route =============

  app.post("/api/upload/audio", authenticate, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
      await fs.mkdir(uploadsDir, { recursive: true });

      const filename = `${Date.now()}-${req.userId}.webm`;
      const filepath = path.join(uploadsDir, filename);

      await fs.writeFile(filepath, req.file.buffer);

      const url = `/uploads/audio/${filename}`;
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve uploaded audio files
  app.use('/uploads/audio', express.static(path.join(process.cwd(), 'uploads', 'audio')));

  // ============= Recurring Income Routes =============

  app.get("/api/recurring-income", authenticate, async (req: any, res) => {
    try {
      const income = await storage.getRecurringIncomeByUserId(req.userId);
      res.json(income);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recurring-income/active", authenticate, async (req: any, res) => {
    try {
      const income = await storage.getActiveRecurringIncomeByUserId(req.userId);
      res.json(income);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recurring-income/upcoming", authenticate, async (req: any, res) => {
    try {
      const daysAhead = parseInt(req.query.daysAhead as string) || 7;
      const income = await storage.getUpcomingRecurringIncome(req.userId, daysAhead);
      res.json(income);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recurring-income", authenticate, async (req: any, res) => {
    try {
      const income = await storage.createRecurringIncome({
        ...req.body,
        userId: req.userId,
      });
      res.status(201).json(income);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/recurring-income/:id", authenticate, async (req: any, res) => {
    try {
      const income = await storage.getRecurringIncomeById(req.params.id);
      if (!income || income.userId !== req.userId) {
        return res.status(404).json({ error: "Recurring income not found" });
      }
      const updated = await storage.updateRecurringIncome(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/recurring-income/:id", authenticate, async (req: any, res) => {
    try {
      const income = await storage.getRecurringIncomeById(req.params.id);
      if (!income || income.userId !== req.userId) {
        return res.status(404).json({ error: "Recurring income not found" });
      }
      await storage.deleteRecurringIncome(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Quick Deals Routes =============

  // Auto-categorization helper
  function autoCategorize(description: string, type: 'income' | 'expense'): string {
    const desc = description.toLowerCase();

    if (type === 'expense') {
      // Food & Dining
      if (desc.match(/coffee|starbucks|cafe|restaurant|lunch|dinner|breakfast|food|pizza|burger|sushi|taco|mcdonald|subway|chipotle|domino/)) return 'food';

      // Transportation
      if (desc.match(/uber|lyft|taxi|gas|fuel|parking|metro|subway|bus|train|transit|car|vehicle/)) return 'transportation';

      // Shopping
      if (desc.match(/amazon|walmart|target|ebay|shopping|store|mall|clothes|shirt|shoes|dress/)) return 'shopping';

      // Entertainment
      if (desc.match(/movie|netflix|spotify|game|concert|theatre|theater|ticket|entertainment|subscription/)) return 'entertainment';

      // Housing
      if (desc.match(/rent|mortgage|landlord|lease|housing/)) return 'housing';

      // Healthcare
      if (desc.match(/doctor|hospital|pharmacy|medicine|prescription|dental|medical|health|clinic/)) return 'healthcare';

      // Utilities
      if (desc.match(/electric|water|gas|internet|phone|utility|bill|wifi|cable/)) return 'utilities';

      // Personal Care
      if (desc.match(/gym|haircut|salon|spa|beauty|grooming|fitness/)) return 'personal_care';

      // Education
      if (desc.match(/book|course|tuition|school|college|university|education|learning|class/)) return 'education';

      return 'other_expense';
    } else {
      // Income categorization
      if (desc.match(/salary|paycheck|wage|employer|job|work/)) return 'salary';
      if (desc.match(/freelance|gig|contract|consulting/)) return 'freelance';
      if (desc.match(/bonus|award|prize/)) return 'bonus';
      if (desc.match(/gift|present/)) return 'gift';
      if (desc.match(/refund|return|reimbursement/)) return 'refund';
      if (desc.match(/investment|dividend|interest|stock|crypto/)) return 'investment';

      return 'other_income';
    }
  }

  // Budget item detection for Quick Deals
  app.post("/api/quick-deals/detect-budget-items", authenticate, async (req: any, res) => {
    try {
      const { description, category, amount } = req.body;

      // Get active budgets for this user
      const activeBudgets = await storage.getActiveBudgetsByUserId(req.userId);

      const matchingItems: any[] = [];

      for (const budget of activeBudgets) {
        const items = await storage.getBudgetItemsByBudgetId(budget.id);

        // Find items that match by name (fuzzy) or exact category
        for (const item of items) {
          if (item.purchased) continue; // Skip already purchased items

          const itemNameLower = item.itemName.toLowerCase();
          const descLower = description.toLowerCase();

          // Check if description contains item name or vice versa
          const nameMatch = itemNameLower.includes(descLower) || descLower.includes(itemNameLower);
          const categoryMatch = item.category === category;

          if (nameMatch && categoryMatch) {
            const totalQuantity = parseFloat(item.quantity || '1');
            const purchased = parseFloat(item.quantityPurchased || '0');
            const remaining = totalQuantity - purchased;

            matchingItems.push({
              budgetItemId: item.id,
              budgetId: budget.id,
              budgetName: `${budget.category} (${budget.period})`,
              itemName: item.itemName,
              category: item.category,
              estimatedPrice: item.estimatedPrice,
              quantity: item.quantity,
              unit: item.unit,
              quantityPurchased: purchased,
              quantityRemaining: remaining,
            });
          }
        }
      }

      res.json(matchingItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Link Quick Deal to budget item
  app.post("/api/quick-deals/link-to-budget", authenticate, async (req: any, res) => {
    try {
      const { transactionId, budgetItemId, actualPrice, quantityPurchased } = req.body;

      // Get the budget item
      const item = await storage.getBudgetItemById(budgetItemId);
      if (!item) {
        return res.status(404).json({ error: "Budget item not found" });
      }

      // Verify the item belongs to user's budget
      const budget = await storage.getBudgetById(item.budgetId);
      if (!budget || budget.userId !== req.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Calculate new quantities
      const totalQuantity = parseFloat(item.quantity || '1');
      const alreadyPurchased = parseFloat(item.quantityPurchased || '0');
      const newPurchased = alreadyPurchased + parseFloat(quantityPurchased);
      const fullyPurchased = newPurchased >= totalQuantity;

      // Update the budget item
      await storage.updateBudgetItem(budgetItemId, {
        actualPrice: actualPrice,
        purchased: fullyPurchased,
        purchaseDate: fullyPurchased ? new Date() : null,
        quantityPurchased: newPurchased.toString(),
      });

      // Update transaction to link to budget
      await storage.updateTransaction(transactionId, {
        notes: `Linked to budget: ${budget.category} - ${item.itemName}`,
      });

      res.json({ 
        success: true,
        fullyPurchased,
        quantityPurchased: newPurchased,
        quantityRemaining: totalQuantity - newPurchased
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  app.post("/api/quick-deals", authenticate, async (req: any, res) => {
    try {
      const quickDealSchema = z.object({
        type: z.enum(['income', 'expense']),
        description: z.string().min(1).max(500),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        category: z.string().optional(),
        locationName: z.string().max(200).optional().nullable(),
        latitude: z.string().regex(/^-?\d+(\.\d+)?$/).optional().nullable(),
        longitude: z.string().regex(/^-?\d+(\.\d+)?$/).optional().nullable(),
        reason: z.string().max(1000).optional().nullable(),
        reasonAudioUrl: z.string().max(500).optional().nullable(),
        contentmentLevel: z.number().min(1).max(5).optional(),
        depositAccountId: z.string().optional(),
      });

      const validatedData = quickDealSchema.parse(req.body);

      // Auto-categorize if no category provided
      const category = validatedData.category || autoCategorize(validatedData.description, validatedData.type);

      // Get monthly account for expenses
      let sourceAccountId = validatedData.depositAccountId;
      if (validatedData.type === 'expense') {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyAccount = await storage.getQuickDealMonthlyAccount(req.userId, currentMonth);
        if (!monthlyAccount) {
          return res.status(400).json({ 
            error: "Please set up your Quick Deals account for this month first",
            needsSetup: true 
          });
        }
        sourceAccountId = monthlyAccount.accountId;
      }

      const transaction = await storage.createQuickDeal(req.userId, {
        type: validatedData.type,
        description: validatedData.description,
        amount: validatedData.amount,
        category,
        locationName: validatedData.locationName || null,
        latitude: validatedData.latitude || null,
        longitude: validatedData.longitude || null,
        reason: validatedData.reason || null,
        reasonAudioUrl: validatedData.reasonAudioUrl || null,
        contentmentLevel: validatedData.contentmentLevel || null,
        depositAccountId: sourceAccountId,
      });

      res.status(201).json(transaction);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Budget Routes =============

  app.get("/api/budgets", authenticate, async (req: any, res) => {
    try {
      const budgets = await storage.getBudgetsByUserId(req.userId);
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/budgets/active", authenticate, async (req: any, res) => {
    try {
      const budgets = await storage.getActiveBudgetsByUserId(req.userId);
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/budgets/:id/spending", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }
      const spending = await storage.getBudgetSpending(
        req.userId,
        req.params.id,
        budget.startDate,
        budget.endDate
      );
      res.json(spending);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/budgets/:id", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/budgets", authenticate, async (req: any, res) => {
    try {
      const data = insertBudgetSchema.parse({ ...req.body, userId: req.userId });
      const budget = await storage.createBudget(data);
      res.status(201).json(budget);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/budgets/:id/can-edit", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }
      const hasPurchased = await storage.checkBudgetHasPurchasedItems(req.params.id);
      res.json({ canEdit: !hasPurchased, hasPurchasedItems: hasPurchased });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/budgets/:id", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      // Check if budget has purchased items
      const hasPurchased = await storage.checkBudgetHasPurchasedItems(req.params.id);
      if (hasPurchased) {
        return res.status(400).json({ 
          error: "Cannot edit budget with purchased items. Please create a new budget instead." 
        });
      }

      const updated = await storage.updateBudget(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/budgets/:id", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      // Get all budget items before deleting
      const budgetItems = await storage.getBudgetItemsByBudgetId(req.params.id);

      // Move budget items to master items list
      for (const item of budgetItems) {
        // Check if item already exists in master list
        const existingItem = await storage.getItemByName(req.userId, item.itemName);

        if (existingItem) {
          // Update existing item with new purchase data if this item was purchased
          if (item.purchased && item.actualPrice) {
            await storage.updateItemFromBudgetItem(existingItem.id, item);
          }
        } else {
          // Create new item in master list
          await storage.createItemFromBudgetItem(req.userId, item);
        }
      }

      // Now delete the budget (cascades to budget items and categories)
      await storage.deleteBudget(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Budget with Items Routes =============

  // Create budget with categories and items
  app.post("/api/budgets/create-with-items", authenticate, async (req: any, res) => {
    try {
      const schema = z.object({
        budget: z.object({
          title: z.string().min(1),
          category: z.string(),
          allocatedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
          period: z.enum(['monthly', 'quarterly', 'yearly', 'weekly']),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
        categories: z.array(z.object({
          category: z.string(),
          allocatedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        })),
        items: z.array(z.object({
          category: z.string(),
          itemName: z.string(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          estimatedPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
          notes: z.string().optional().nullable(),
        })),
        categoryItems: z.array(z.object({
          category: z.string(),
          itemName: z.string(),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
          locationName: z.string().optional(),
          notes: z.string().optional(),
        })).optional(),
      });

      const validatedData = schema.parse(req.body);

      const result = await storage.createBudgetWithItems(
        req.userId,
        { ...validatedData.budget, userId: req.userId } as any,
        validatedData.categories,
        validatedData.items as any
      );

      // Save category items if provided
      if (validatedData.categoryItems && validatedData.categoryItems.length > 0) {
        for (const catItem of validatedData.categoryItems) {
          await db.insert(budgetCategoryItems).values({
            budgetId: result.budget.id,
            category: catItem.category,
            itemName: catItem.itemName,
            amount: catItem.amount,
            locationName: catItem.locationName || null,
            notes: catItem.notes || null,
          });
        }
      }

      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Get budget items
  app.get("/api/budgets/:id/items", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      const items = await storage.getBudgetItemsByBudgetId(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update budget item
  app.put("/api/budgets/:id/items/:itemId", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      const item = await storage.getBudgetItemById(req.params.itemId);
      if (!item || item.budgetId !== req.params.id) {
        return res.status(404).json({ error: "Budget item not found" });
      }

      const updated = await storage.updateBudgetItem(req.params.itemId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mark budget item as purchased
  app.post("/api/budgets/:id/items/:itemId/purchase", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      const item = await storage.getBudgetItemById(req.params.itemId);
      if (!item || item.budgetId !== req.params.id) {
        return res.status(404).json({ error: "Budget item not found" });
      }

      const schema = z.object({
        actualPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
        purchaseDate: z.string().optional(),
        accountId: z.string().optional(),
        location: z.object({
          lat: z.string(),
          lon: z.string(),
          name: z.string(),
        }).optional(),
      });

      const validatedData = schema.parse(req.body);
      const purchaseDate = validatedData.purchaseDate 
        ? new Date(validatedData.purchaseDate)
        : new Date();

      const updated = await storage.markBudgetItemPurchased(
        req.params.itemId,
        validatedData.actualPrice,
        purchaseDate,
        validatedData.location
      );

      // Create double-entry transaction if account specified
      if (validatedData.accountId) {
        // Verify payment account exists and has sufficient balance
        const paymentAccount = await storage.getAccountById(validatedData.accountId);
        if (!paymentAccount) {
          return res.status(404).json({ error: "Payment account not found" });
        }

        if (paymentAccount.userId !== req.userId) {
          return res.status(403).json({ error: "Payment account does not belong to you" });
        }

        // Check sufficient balance for asset accounts
        if (paymentAccount.accountType === 'asset') {
          const accountBalance = parseFloat(paymentAccount.balance);
          const purchaseAmount = parseFloat(validatedData.actualPrice);

          if (accountBalance < purchaseAmount) {
            return res.status(400).json({ 
              error: `Insufficient balance in ${paymentAccount.name}. Available: $${accountBalance.toFixed(2)}, Required: $${purchaseAmount.toFixed(2)}` 
            });
          }
        }

        // Find or create expense account for the budget category
        let expenseAccount = await storage.getAccountsByUserId(req.userId).then(accounts =>
          accounts.find(a => 
            a.accountType === 'expense' && 
            a.name.toLowerCase() === budget.category.toLowerCase()
          )
        );

        if (!expenseAccount) {
          expenseAccount = await storage.createAccount({
            userId: req.userId,
            name: budget.category,
            accountType: 'expense',
            accountCategory: 'other_expense',
            balance: '0',
            description: `Auto-created for budget category: ${budget.category}`,
          });
        }

        // Create transaction for the purchase
        await storage.createTransactionWithEntries(
          req.userId,
          {
            date: purchaseDate.toISOString().split('T')[0],
            description: `${budget.category}: ${item.itemName}`,
            totalAmount: validatedData.actualPrice,
            notes: item.notes || undefined,
          },
          [
            { accountId: expenseAccount.id, entryType: 'debit', amount: validatedData.actualPrice },
            { accountId: validatedData.accountId, entryType: 'credit', amount: validatedData.actualPrice },
          ]
        );
      }

      // Check budget thresholds and send notifications
      const spending = await storage.getBudgetSpending(req.userId, req.params.id, budget.startDate, budget.endDate);
      if (spending) {
        const { checkAndNotifyBudgetThresholds } = await import("./notifications");
        await checkAndNotifyBudgetThresholds(
          req.userId,
          req.params.id,
          spending.percentage,
          budget.category,
          spending.spent,
          parseFloat(budget.allocatedAmount)
        );
      }

      res.json(updated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Budget Template Routes =============

  // Get user's templates
  app.get("/api/budget-templates", authenticate, async (req: any, res) => {
    try {
      const templates = await storage.getBudgetTemplatesByUserId(req.userId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create template
  app.post("/api/budget-templates", authenticate, async (req: any, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(255),
        categories: z.array(z.string()),
        items: z.array(z.object({
          category: z.string(),
          itemName: z.string(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          averagePrice: z.string().optional(),
          bestLocation: z.string().optional(),
        })).optional(),
      });

      const validatedData = schema.parse(req.body);

      const template = await storage.createBudgetTemplate(
        req.userId,
        validatedData.name,
        validatedData.categories
      );

      // Add template items if provided
      if (validatedData.items && validatedData.items.length > 0) {
        for (const item of validatedData.items) {
          await storage.createBudgetTemplateItem({
            templateId: template.id,
            ...item,
          });
        }
      }

      const fullTemplate = await storage.getBudgetTemplateById(template.id);
      res.status(201).json(fullTemplate);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Get template items
  app.get("/api/budget-templates/:id/items", authenticate, async (req: any, res) => {
    try {
      const template = await storage.getBudgetTemplateById(req.params.id);
      if (!template || template.userId !== req.userId) {
        return res.status(404).json({ error: "Template not found" });
      }

      const items = await storage.getBudgetTemplateItems(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create budget from template
  app.post("/api/budget-templates/:id/use", authenticate, async (req: any, res) => {
    try {
      const template = await storage.getBudgetTemplateById(req.params.id);
      if (!template || template.userId !== req.userId) {
        return res.status(404).json({ error: "Template not found" });
      }

      const schema = z.object({
        allocatedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        period: z.enum(['monthly', 'quarterly', 'yearly']),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      });

      const validatedData = schema.parse(req.body);

      // Increment template usage count
      await storage.incrementTemplateUsageCount(req.params.id);

      // Get template items to create budget items
      const templateItems = await storage.getBudgetTemplateItems(req.params.id);

      // Convert template items to budget items
      const budgetItems = templateItems.map(item => ({
        category: item.category,
        itemName: item.itemName,
        quantity: item.quantity || null,
        unit: item.unit || null,
        estimatedPrice: item.averagePrice || '0',
      })) as any;

      // Create budget categories from template
      const categories = template.categories?.map(cat => ({
        category: cat,
        allocatedAmount: validatedData.allocatedAmount,
      })) || [];

      // Create the budget with items
      const result = await storage.createBudgetWithItems(
        req.userId,
        {
          title: template.name || 'Budget from Template',
          userId: req.userId,
          category: (template.categories?.[0] || 'other_expense') as any,
          allocatedAmount: validatedData.allocatedAmount,
          period: validatedData.period,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
        },
        categories,
        budgetItems
      );

      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Delete template
  app.delete("/api/budget-templates/:id", authenticate, async (req: any, res) => {
    try {
      const template = await storage.getBudgetTemplateById(req.params.id);
      if (!template || template.userId !== req.userId) {
        return res.status(404).json({ error: "Template not found" });
      }

      await storage.deleteBudgetTemplate(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Master Item List Routes =============

  // Get master item list
  app.get("/api/items", authenticate, async (req: any, res) => {
    try {
      const items = await storage.getItemsByUserId(req.userId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search items
  app.get("/api/items/search", authenticate, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim() === '') {
        return res.status(400).json({ error: "Search query is required" });
      }

      const items = await storage.searchItems(req.userId, query);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new item
  app.post("/api/items", authenticate, async (req: any, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(255),
        category: z.string().min(1).max(100),
        aliases: z.array(z.string()).optional(),
        averagePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        bestPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        bestLocation: z.string().max(255).optional(),
      });

      const validatedData = schema.parse(req.body);

      const item = await storage.createItem({
        userId: req.userId,
        ...validatedData,
      });

      res.status(201).json(item);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Get item price history
  app.get("/api/items/:id/price-history", authenticate, async (req: any, res) => {
    try {
      const item = await storage.getItemById(req.params.id);
      if (!item || item.userId !== req.userId) {
        return res.status(404).json({ error: "Item not found" });
      }

      const history = await storage.getItemPriceHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= Goal Routes =============

  app.get("/api/goals", authenticate, async (req: any, res) => {
    try {
      const goals = await storage.getGoalsByUserId(req.userId);
      res.json(goals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goals/active", authenticate, async (req: any, res) => {
    try {
      const goals = await storage.getActiveGoalsByUserId(req.userId);
      res.json(goals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goals/:id", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create goal
  app.post("/api/goals", authenticate, async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const goalData = insertGoalSchema.parse({
        ...req.body,
        userId: req.user.id,
        currentAmount: req.body.currentAmount || "0",
        status: req.body.status || "active",
      });

      const [newGoal] = await db
        .insert(goals)
        .values(goalData)
        .returning();

      res.json(newGoal);
    } catch (error: any) {
      console.error("Error creating goal:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      res.status(500).send("Failed to create goal");
    }
  });

  app.put("/api/goals/:id", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const updated = await storage.updateGoal(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/goals/:id", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      await storage.deleteGoal(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // New goal operations
  app.post("/api/goals/:id/pause", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const updated = await storage.pauseGoal(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/goals/:id/resume", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const updated = await storage.resumeGoal(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/goals/:id/cancel", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const updated = await storage.cancelGoal(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/goals/:id/contribute", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const { amount, sourceAccountId, notes } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid contribution amount" });
      }

      // Validate source account if provided
      if (sourceAccountId) {
        const sourceAccount = await storage.getAccountById(sourceAccountId);
        if (!sourceAccount) {
          return res.status(404).json({ error: "Source account not found" });
        }
        if (sourceAccount.userId !== req.userId) {
          return res.status(403).json({ error: "Source account does not belong to you" });
        }
      } else if (!goal.sourceAccountId) {
        return res.status(400).json({ error: "No source account specified. Please select an account to contribute from." });
      }

      const result = await storage.addGoalContribution(
        req.params.id,
        parseFloat(amount),
        sourceAccountId,
        notes
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/goals/:id/boost-week", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const updated = await storage.startBoostWeek(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/goals/:id/clone", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const { multiplier } = req.body;
      const cloned = await storage.cloneGoal(req.params.id, multiplier || 1);
      res.status(201).json(cloned);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/goals/:id/contributions", authenticate, async (req: any, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      const contributions = await storage.getGoalContributions(req.params.id);
      res.json(contributions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check for due goal contributions
  app.get("/api/goals/check-due-contributions", authenticate, async (req: any, res) => {
    try {
      const goals = await storage.getActiveGoalsByUserId(req.userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueContributions = [];
      const overdueContributions = [];

      for (const goal of goals) {
        if (!goal.nextScheduledContribution || goal.contributionMode === "completely_flexible") {
          continue;
        }

        const nextDate = new Date(goal.nextScheduledContribution);
        nextDate.setHours(0, 0, 0, 0);

        if (nextDate.getTime() === today.getTime()) {
          dueContributions.push({
            goal,
            dueDate: goal.nextScheduledContribution,
            scheduledAmount: goal.scheduledAmount
          });
        } else if (nextDate < today) {
          const daysOverdue = Math.floor((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
          overdueContributions.push({
            goal,
            dueDate: goal.nextScheduledContribution,
            scheduledAmount: goal.scheduledAmount,
            daysOverdue
          });
        }
      }

      res.json({
        dueToday: dueContributions,
        overdue: overdueContributions,
        total: dueContributions.length + overdueContributions.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get upcoming goal contributions (next 7 days)
  app.get("/api/goals/upcoming-contributions", authenticate, async (req: any, res) => {
    try {
      const daysAhead = parseInt(req.query.days as string) || 7;
      const goals = await storage.getActiveGoalsByUserId(req.userId);
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const upcomingContributions = [];

      for (const goal of goals) {
        if (!goal.nextScheduledContribution || goal.contributionMode === "completely_flexible") {
          continue;
        }

        const nextDate = new Date(goal.nextScheduledContribution);

        if (nextDate >= today && nextDate <= futureDate) {
          const daysUntil = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          upcomingContributions.push({
            goal,
            dueDate: goal.nextScheduledContribution,
            scheduledAmount: goal.scheduledAmount,
            daysUntil
          });


  // ============= Quick Deal Monthly Account Routes =============

  app.get("/api/quick-deals/needs-setup", authenticate, async (req: any, res) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const existing = await storage.getQuickDealMonthlyAccount(req.userId, currentMonth);
      res.json({ needsSetup: !existing, currentMonth });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/quick-deals/monthly-account", authenticate, async (req: any, res) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const account = await storage.getQuickDealMonthlyAccount(req.userId, currentMonth);
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/quick-deals/monthly-account", authenticate, async (req: any, res) => {
    try {
      const schema = z.object({
        accountId: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      });
      const data = schema.parse(req.body);

      const account = await storage.setQuickDealMonthlyAccount(req.userId, data.accountId, data.month);
      res.json(account);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

        }
      }

      // Sort by date
      upcomingContributions.sort((a, b) => a.daysUntil - b.daysUntil);

      res.json(upcomingContributions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send reminders for due/overdue contributions
  app.post("/api/goals/send-contribution-reminders", authenticate, async (req: any, res) => {
    try {
      const { createGoalContributionReminder } = await import("./notifications");
      const goals = await storage.getActiveGoalsByUserId(req.userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reminders = [];

      for (const goal of goals) {
        if (!goal.nextScheduledContribution || goal.contributionMode === "completely_flexible") {
          continue;
        }

        const nextDate = new Date(goal.nextScheduledContribution);
        nextDate.setHours(0, 0, 0, 0);

        const isOverdue = nextDate < today;
        const isDueToday = nextDate.getTime() === today.getTime();

        if (isDueToday || isOverdue) {
          const reminder = await createGoalContributionReminder(
            req.userId,
            goal.id,
            goal.name,
            goal.nextScheduledContribution,
            goal.scheduledAmount,
            isOverdue
          );
          reminders.push(reminder);
        }
      }

      res.json({ reminders, count: reminders.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Windfall allocation endpoint
  app.post("/api/windfall-allocate", authenticate, async (req: any, res) => {
    try {
      const { totalAmount, checkingPercent, goalPercent, funPercent, goalId, description } = req.body;

      // Validate totalAmount
      const amount = parseFloat(totalAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Validate and parse percentages
      const checking = parseFloat(checkingPercent) || 0;
      const goal = parseFloat(goalPercent) || 0;
      const fun = parseFloat(funPercent) || 0;

      if (checking < 0 || goal < 0 || fun < 0) {
        return res.status(400).json({ error: "Percentages cannot be negative" });
      }

      const total = checking + goal + fun;
      if (Math.abs(total - 100) > 1) {
        return res.status(400).json({ error: "Percentages must sum to approximately 100%" });
      }

      const checkingAmount = (amount * checking / 100);
      const goalAmount = (amount * goal / 100);
      const funAmount = (amount * fun / 100);

      // If goal allocation exists, contribute to goal
      if (goalAmount > 0 && goalId) {
        const parsedGoalId = String(goalId);
        const goalRecord = await storage.getGoalById(parsedGoalId);
        if (!goalRecord || goalRecord.userId !== req.userId) {
          return res.status(404).json({ error: "Goal not found" });
        }
        await storage.addGoalContribution(parsedGoalId, goalAmount);
      }

      // Create transaction record for tracking
      // Note: In a full implementation, this would create proper double-entry transactions
      // For now, we just return success

      res.json({ 
        success: true,
        allocated: {
          checking: checkingAmount,
          goal: goalAmount,
          fun: funAmount
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Analytics Routes =============

  app.get("/api/analytics/net-worth", authenticate, async (req: any, res) => {
    try {
      const netWorth = await storage.getNetWorth(req.userId);
      res.json({ netWorth });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/net-worth-history", authenticate, async (req: any, res) => {
    try {
      const months = req.query.months ? parseInt(req.query.months as string) : 12;
      const history = await getNetWorthHistory(req.userId, months);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/assets", authenticate, async (req: any, res) => {
    try {
      const total = await storage.getTotalAssets(req.userId);
      res.json({ total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/liabilities", authenticate, async (req: any, res) => {
    try {
      const total = await storage.getTotalLiabilities(req.userId);
      res.json({ total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/category-spending", authenticate, async (req: any, res) => {
    try {
      const { category, startDate, endDate } = req.query;
      const spending = await storage.getCategorySpending(
        req.userId,
        category as string | undefined,
        startDate as string,
        endDate as string
      );
      // If category was specified, return total; otherwise return array
      res.json(category ? { total: spending } : spending);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });



  // ============= Debt Routes =============

  app.get("/api/debts", authenticate, async (req: any, res) => {
    try {
      const debts = await storage.getDebtsByUserId(req.userId);
      res.json(debts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/debts/active", authenticate, async (req: any, res) => {
    try {
      const debts = await storage.getActiveDebtsByUserId(req.userId);
      res.json(debts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/debts/:id", authenticate, async (req: any, res) => {
    try {
      const debt = await storage.getDebtById(req.params.id);
      if (!debt || debt.userId !== req.userId) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.json(debt);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/debts", authenticate, async (req: any, res) => {
    try {
      const debtData = { ...req.body, userId: req.userId };
      const debt = await storage.createDebt(debtData);

      // Auto-create or update liability account for "I owe" debts
      if (debt.type === 'i_owe') {
        const userAccounts = await storage.getAccountsByUserId(req.userId);
        let liabilityAccount = userAccounts.find(
          acc => acc.accountType === 'liability' && acc.name === debt.name
        );

        if (!liabilityAccount) {
          // Create new liability account
          await storage.createAccount({
            userId: req.userId,
            name: debt.name,
            accountType: 'liability',
            accountCategory: 'loan',
            balance: `-${debt.currentBalance}`, // Negative for liability
            description: `Auto-created for debt: ${debt.name}`,
          });
        } else {
          // Update existing account balance
          await storage.updateAccount(liabilityAccount.id, {
            balance: `-${debt.currentBalance}`,
          });
        }
      }

      res.status(201).json(debt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/debts/:id", authenticate, async (req: any, res) => {
    try {
      const debt = await storage.getDebtById(req.params.id);
      if (!debt || debt.userId !== req.userId) {
        return res.status(404).json({ error: "Debt not found" });
      }
      const updated = await storage.updateDebt(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/debts/:id", authenticate, async (req: any, res) => {
    try {
      const debt = await storage.getDebtById(req.params.id);
      if (!debt || debt.userId !== req.userId) {
        return res.status(404).json({ error: "Debt not found" });
      }
      await storage.deleteDebt(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/debts/:id/payment", authenticate, async (req: any, res) => {
    try {
      const debt = await storage.getDebtById(req.params.id);
      if (!debt || debt.userId !== req.userId) {
        return res.status(404).json({ error: "Debt not found" });
      }

      const { amount, paymentDate, accountId, isExtraPayment, notes } = req.body;
      const paymentAmount = parseFloat(amount);
      const currentBalance = parseFloat(debt.currentBalance);
      const interestRate = debt.interestRate ? parseFloat(debt.interestRate) / 100 / 12 : 0;

      // Calculate interest and principal
      const interestPaid = currentBalance * interestRate;
      const principalPaid = paymentAmount - interestPaid;
      const newBalance = Math.max(0, currentBalance - principalPaid);

      // Check if debt is fully paid off
      const isFullyPaid = newBalance <= 0.01;

      // Create payment record
      const payment = await storage.createDebtPayment({
        debtId: req.params.id,
        amount: amount,
        principalPaid: principalPaid.toFixed(2),
        interestPaid: interestPaid.toFixed(2),
        paymentDate,
        accountId,
        isExtraPayment: isExtraPayment || false,
        notes,
      });

      // Update debt balance and status
      await storage.updateDebt(req.params.id, {
        currentBalance: newBalance.toFixed(2),
        isActive: !isFullyPaid,
        payoffDate: isFullyPaid ? paymentDate : null,
        updatedAt: new Date(),
      });

      // Create double-entry transaction if account specified
      if (accountId) {
        // Verify source account exists and has sufficient balance
        const sourceAccount = await storage.getAccountById(accountId);
        if (!sourceAccount) {
          return res.status(404).json({ error: "Payment source account not found" });
        }

        if (sourceAccount.userId !== req.userId) {
          return res.status(403).json({ error: "Payment source account does not belong to you" });
        }

        // Check sufficient balance for asset accounts
        if (sourceAccount.accountType === 'asset') {
          const accountBalance = parseFloat(sourceAccount.balance);

          if (accountBalance < paymentAmount) {
            return res.status(400).json({ 
              error: `Insufficient balance in ${sourceAccount.name}. Available: $${accountBalance.toFixed(2)}, Required: $${paymentAmount.toFixed(2)}` 
            });
          }
        }

        let debtAccount = await storage.getAccountsByUserId(req.userId).then(accounts =>
          accounts.find(a => a.name === debt.name && a.accountType === 'liability')
        );

        // Create liability account if it doesn't exist
        if (!debtAccount) {
          debtAccount = await storage.createAccount({
            userId: req.userId,
            name: debt.name,
            accountType: 'liability',
            accountCategory: 'loan',
            balance: `-${currentBalance.toFixed(2)}`,  // Set to current debt balance before payment
            description: `Auto-created for debt: ${debt.name}`,
          });
        }

        // Create transaction - this will update the account balance automatically
        await storage.createTransactionWithEntries(
          req.userId,
          {
            date: paymentDate,
            description: `Debt payment: ${debt.name}${isFullyPaid ? ' (FINAL)' : ''}`,
            totalAmount: amount,
            notes: notes || `Principal: $${principalPaid.toFixed(2)}, Interest: $${interestPaid.toFixed(2)}${isFullyPaid ? ' - DEBT PAID OFF!' : ''}`,
          },
          [
            { accountId: debtAccount.id, entryType: 'debit', amount: amount },
            { accountId: accountId, entryType: 'credit', amount: amount },
          ]
        );

        // Archive the account if debt is fully paid
        if (isFullyPaid) {
          await storage.updateAccount(debtAccount.id, {
            isActive: 0,
          });
        }
      }

      res.json({ ...payment, isFullyPaid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Debt Projection Routes =============

  // Import debt calculator at the top of routes.ts (will add separately)
  const debtCalc = await import("./debt-calculator");

  // Get projection for a specific debt
  app.get("/api/debts/:id/projection", authenticate, async (req: any, res) => {
    try {
      const debt = await storage.getDebtById(req.params.id);
      if (!debt || debt.userId !== req.userId) {
        return res.status(404).json({ error: "Debt not found" });
      }

      const principal = parseFloat(debt.principalAmount);
      const interestRate = debt.interestRate ? parseFloat(debt.interestRate) / 100 / 12 : 0;
      const periods = debt.totalPeriods || 12;
      const startDate = debt.startDate;

      // Build input based on repayment method
      const input = {
        principal,
        interestRate,
        periods,
        startDate,
        monthlyIncome: debt.monthlyIncome ? parseFloat(debt.monthlyIncome) : undefined,
        monthlyLivingCosts: debt.monthlyLivingCosts ? parseFloat(debt.monthlyLivingCosts) : undefined,
        maxAffordablePayment: debt.maxAffordablePayment ? parseFloat(debt.maxAffordablePayment) : undefined,
      };

      let projection;

      switch (debt.repaymentMethod) {
        case 'bullet':
          projection = debtCalc.calculateBullet(input);
          break;

        case 'amortization':
          projection = debtCalc.calculateAmortization(input);
          break;

        case 'reborrowing_cascade':
          projection = debtCalc.calculateReborrowingCascade({
            ...input,
            reborrowPercentage: debt.reborrowPercentage ? parseFloat(debt.reborrowPercentage) : 80,
            reborrowMaxCycles: debt.reborrowMaxCycles || 10,
          });
          break;

        case 'interest_only_balloon':
          projection = debtCalc.calculateInterestOnlyBalloon(input);
          break;

        case 'equal_principal':
          projection = debtCalc.calculateEqualPrincipal(input);
          break;

        case 'graduated':
          projection = debtCalc.calculateGraduated({
            ...input,
            graduatedBasePayment: debt.graduatedBasePayment ? parseFloat(debt.graduatedBasePayment) : 0,
            graduatedStepPeriods: debt.graduatedStepPeriods || 3,
            graduatedStepPercentage: debt.graduatedStepPercentage ? parseFloat(debt.graduatedStepPercentage) : 25,
            graduatedAllowNegativeAmort: debt.graduatedAllowNegativeAmort || false,
          });
          break;

        case 'settlement':
          projection = debtCalc.calculateSettlement({
            ...input,
            settlementCashAvailable: debt.settlementCashAvailable ? parseFloat(debt.settlementCashAvailable) : 0,
            settlementAcceptedPercentage: debt.settlementAcceptedPercentage ? parseFloat(debt.settlementAcceptedPercentage) : 70,
            settlementMinCashBuffer: debt.settlementMinCashBuffer ? parseFloat(debt.settlementMinCashBuffer) : 0,
          });
          break;

        case 'forbearance':
          projection = debtCalc.calculateForbearance({
            ...input,
            forbearanceHolidayPeriods: debt.forbearanceHolidayPeriods || 0,
            forbearanceRepayPeriods: debt.forbearanceRepayPeriods || 0,
          });
          break;

        default:
          // Default to amortization
          projection = debtCalc.calculateAmortization(input);
      }

      res.json(projection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Multi-debt comparison (Snowball vs Avalanche)
  app.post("/api/debts/compare", authenticate, async (req: any, res) => {
    try {
      const { debtIds, surplus } = req.body;

      if (!debtIds || !Array.isArray(debtIds) || debtIds.length === 0) {
        return res.status(400).json({ error: "debtIds array is required" });
      }

      const debts = await Promise.all(
        debtIds.map(id => storage.getDebtById(id))
      );

      // Filter out null/undefined and verify all debts belong to user
      const validDebts = debts.filter((d): d is NonNullable<typeof d> => !!d && d.userId === req.userId);

      if (validDebts.length === 0) {
        return res.status(404).json({ error: "No valid debts found" });
      }

      // Convert to comparison format
      const loans = validDebts.map(d => ({
        id: d.id,
        principal: parseFloat(d.currentBalance),
        rate: d.interestRate ? parseFloat(d.interestRate) / 100 / 12 : 0,
        minPayment: d.paymentAmount ? parseFloat(d.paymentAmount) : 0,
      }));

      const startDate = validDebts[0].startDate;
      const surplusAmount = parseFloat(surplus) || 0;

      const comparison = debtCalc.calculateSnowballVsAvalanche(loans, surplusAmount, startDate);

      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get debt health score
  app.get("/api/debts/health-score", authenticate, async (req: any, res) => {
    try {
      const { calculateDebtHealthScore } = await import("./debt-analytics");
      const healthScore = await calculateDebtHealthScore(req.userId);

      if (!healthScore) {
        return res.json({ message: "No active debts to analyze" });
      }

      res.json(healthScore);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Compare all 9 repayment methods for a new debt
  app.post("/api/debts/compare-all-methods", authenticate, async (req: any, res) => {
    try {
      const {
        principal,
        interestRate,
        rateFrequency, // 'week' or 'month'
        length,
        lengthUnit, // 'weeks' or 'months'
        monthlyIncome,
        monthlyLivingCosts,
        cashSpare,
      } = req.body;

      // Normalize everything to monthly periods
      let monthlyRate = parseFloat(interestRate || 0) / 100;
      let periods = parseInt(length);

      if (rateFrequency === 'week') {
        monthlyRate = monthlyRate * 4.33; // Convert weekly to monthly
      }

      if (lengthUnit === 'weeks') {
        periods = Math.ceil(periods / 4.33); // Convert weeks to months
      }

      const normalizedInput = {
        principal: parseFloat(principal),
        interestRate: monthlyRate,
        periods,
        startDate: new Date().toISOString().split('T')[0],
        monthlyIncome: parseFloat(monthlyIncome),
        monthlyLivingCosts: parseFloat(monthlyLivingCosts),
        settlementCashAvailable: parseFloat(cashSpare || 0),
      };

      const disposableIncome = normalizedInput.monthlyIncome - normalizedInput.monthlyLivingCosts;

      // Calculate all 9 methods
      const methods = [
        {
          method: 'amortization',
          title: 'Amortizing (Classic)',
          icon: 'target',
          projection: debtCalc.calculateAmortization(normalizedInput),
        },
        {
          method: 'bullet',
          title: 'Bullet (Pay at End)',
          icon: 'money',
          projection: debtCalc.calculateBullet(normalizedInput),
        },
        {
          method: 'equal_principal',
          title: 'Equal Principal (Declining Interest)',
          icon: 'calendar',
          projection: debtCalc.calculateEqualPrincipal(normalizedInput),
        },
        {
          method: 'interest_only_balloon',
          title: 'Interest-Only + Balloon',
          icon: 'money',
          projection: debtCalc.calculateInterestOnlyBalloon(normalizedInput),
        },
        {
          method: 'graduated',
          title: 'Graduated (Step-Up)',
          icon: 'target',
          projection: debtCalc.calculateGraduated({
            ...normalizedInput,
            graduatedBasePayment: disposableIncome * 0.5,
            graduatedStepPeriods: 3,
            graduatedStepPercentage: 25,
          }),
        },
        {
          method: 'reborrowing_cascade',
          title: 'Re-Borrowing Cascade',
          icon: 'calendar',
          projection: debtCalc.calculateReborrowingCascade({
            ...normalizedInput,
            reborrowPercentage: 80,
            reborrowMaxCycles: 10,
          }),
        },
        {
          method: 'settlement',
          title: 'Negotiated Settlement',
          icon: 'money',
          projection: debtCalc.calculateSettlement({
            ...normalizedInput,
            settlementAcceptedPercentage: 70,
            settlementMinCashBuffer: normalizedInput.monthlyLivingCosts,
          }),
        },
        {
          method: 'forbearance',
          title: 'Forbearance (Payment Holiday)',
          icon: 'calendar',
          projection: debtCalc.calculateForbearance({
            ...normalizedInput,
            forbearanceHolidayPeriods: Math.min(3, Math.floor(periods / 4)),
            forbearanceRepayPeriods: 3,
          }),
        },
      ];

      // Get user's existing active debts to determine if snowball/avalanche should be shown
      const activeDebts = await storage.getActiveDebtsByUserId(req.userId);

      // Add snowball/avalanche only if user has 2+ debts OR wants to see them anyway
      if (activeDebts.length >= 1) {
        // Include as comparison for multi-debt scenarios
        const sampleLoans = [
          {
            id: 'new',
            principal: normalizedInput.principal,
            rate: normalizedInput.interestRate,
            minPayment: normalizedInput.principal * 0.05,
          },
          ...(activeDebts.map(d => ({
            id: d.id,
            principal: parseFloat(d.currentBalance),
            rate: d.interestRate ? parseFloat(d.interestRate) / 100 : 0,
            minPayment: d.paymentAmount ? parseFloat(d.paymentAmount) : 0,
          }))),
        ];

        const comparison = debtCalc.calculateSnowballVsAvalanche(
          sampleLoans,
          disposableIncome * 0.2,
          normalizedInput.startDate
        );

        methods.push(
          {
            method: 'snowball',
            title: 'Snowball (Smallest First)',
            icon: 'target',
            projection: comparison.snowball,
          },
          {
            method: 'avalanche',
            title: 'Avalanche (Highest Rate First)',
            icon: 'target',
            projection: comparison.avalanche,
          }
        );
      }

      // Apply smart hiding rules
      const methodsWithMeta = methods.map(m => {
        const highestPayment = Math.max(...m.projection.payments);
        const isFeasible = highestPayment <= disposableIncome;

        let hidden = false;
        let hideReason = '';

        // Settlement: hide if cash < 60% of principal
        if (m.method === 'settlement') {
          const required = normalizedInput.principal * 0.6;
          if (normalizedInput.settlementCashAvailable < required) {
            hidden = true;
            hideReason = `Requires at least ${formatCurrency(required)} cash (60% of principal)`;
          }
        }

        // Snowball/Avalanche: hide if only 1 debt (already handled by not adding them)
        if ((m.method === 'snowball' || m.method === 'avalanche') && activeDebts.length === 0) {
          hidden = true;
          hideReason = 'Only available when you have multiple debts';
        }

        // Any method: hide if highest payment > disposable income
        if (!isFeasible && m.method !== 'settlement') {
          hidden = true;
          hideReason = `Highest payment (${formatCurrency(highestPayment)}) exceeds disposable income (${formatCurrency(disposableIncome)})`;
        }

        return {
          method: m.method,
          methodTitle: m.title,
          methodIcon: m.icon,
          projection: m.projection,
          highestPayment,
          hidden,
          hideReason,
        };
      });

      res.json({
        methods: methodsWithMeta,
        normalizedInput,
      });
    } catch (error: any) {
      console.error("Error comparing debt methods:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Risk Analysis for New Debt
  app.post("/api/debts/analyze-risk", authenticate, async (req: any, res) => {
    try {
      const {
        principal,
        interestRate,
        periods,
        repaymentMethod,
        reasons,
        monthlyIncome,
        monthlyLivingCosts
      } = req.body;

      // Fetch user's current financial status
      const userAccounts = await storage.getAccountsByUserId(req.userId);
      const totalAssets = userAccounts
        .filter(a => ['checking', 'savings', 'investment'].includes(a.accountCategory))
        .reduce((sum, a) => sum + parseFloat(a.balance), 0);

      const totalLiabilities = userAccounts
        .filter(a => ['credit_card', 'loan', 'mortgage'].includes(a.accountCategory))
        .reduce((sum, a) => sum + Math.abs(parseFloat(a.balance)), 0);

      const disposableIncome = (monthlyIncome || 0) - (monthlyLivingCosts || 0);

      // Calculate projection for the chosen method
      const normalizedInput = {
        principal: parseFloat(principal || 0),
        interestRate: parseFloat(interestRate || 0) / 100 / 12,
        periods: parseInt(periods || 12),
        startDate: new Date().toISOString().split('T')[0],
        monthlyIncome: parseFloat(monthlyIncome || 0),
        monthlyLivingCosts: parseFloat(monthlyLivingCosts || 0)
      };

      let projection;
      switch (repaymentMethod) {
        case 'bullet':
          projection = debtCalc.calculateBullet(normalizedInput);
          break;
        case 'equal_principal':
          projection = debtCalc.calculateEqualPrincipal(normalizedInput);
          break;
        case 'graduated':
          projection = debtCalc.calculateGraduated({
            ...normalizedInput,
            graduatedBasePayment: 0,
            graduatedStepPeriods: 3,
            graduatedStepPercentage: 25,
            graduatedAllowNegativeAmort: false
          });
          break;
        case 'interest_only_balloon':
          projection = debtCalc.calculateInterestOnlyBalloon(normalizedInput);
          break;
        case 'settlement':
          projection = debtCalc.calculateSettlement({
            ...normalizedInput,
            settlementCashAvailable: 0,
            settlementAcceptedPercentage: 70,
            settlementMinCashBuffer: monthlyLivingCosts || 0
          });
          break;
        case 'forbearance':
          projection = debtCalc.calculateForbearance({
            ...normalizedInput,
            forbearanceHolidayPeriods: 3,
            forbearanceRepayPeriods: 3
          });
          break;
        default:
          projection = debtCalc.calculateAmortization(normalizedInput);
      }

      // Calculate risk factors
      const monthlyPayment = projection.payments && projection.payments[1] ? projection.payments[1] : 0;
      const totalInterest = projection.totalInterest || 0;
      const debtToIncome = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;
      const paymentToDisposable = disposableIncome > 0 ? (monthlyPayment / disposableIncome) * 100 : 0;

      // Determine risk level with better thresholds
      let riskLevel = 'low';
      const warnings: string[] = [];
      const positives: string[] = [];

      // Payment to disposable income check (most important)
      if (paymentToDisposable > 60) {
        riskLevel = 'high';
        warnings.push(`Payment eats ${Math.round(paymentToDisposable)}% of spare cash - very tight`);
      } else if (paymentToDisposable > 40) {
        riskLevel = 'medium';
        warnings.push(`Payment uses ${Math.round(paymentToDisposable)}% of disposable income`);
      } else if (paymentToDisposable > 0 && paymentToDisposable <= 30) {
        positives.push(`Payment is only ${Math.round(paymentToDisposable)}% of spare cash - comfortable`);
      }

      // Debt to income check
      if (debtToIncome > 30) {
        riskLevel = 'high';
        warnings.push('Debt-to-income exceeds safe 30% threshold');
      } else if (debtToIncome > 20) {
        if (riskLevel !== 'high') riskLevel = 'medium';
        warnings.push('Debt-to-income is above 20% - monitor closely');
      }

      // Emergency buffer check
      const bufferWeeks = disposableIncome > 0 ? (disposableIncome / (monthlyPayment || 1)) : 0;
      if (bufferWeeks < 2 && monthlyPayment > 0) {
        riskLevel = 'high';
        warnings.push(`Buffer drops to ${bufferWeeks.toFixed(1)} weeks after payment`);
      }

      // Interest cost check
      if (totalInterest > principal * 0.3) {
        if (riskLevel !== 'high') riskLevel = 'medium';
        warnings.push('Interest cost is over 30% of principal');
      } else if (totalInterest < principal * 0.1) {
        positives.push('Low total interest - good deal');
      }

      // Term length check
      if (periods <= 12) {
        positives.push('Short term minimizes interest');
      }

      // Check projection warnings
      if (projection.warnings && projection.warnings.length > 0) {
        projection.warnings.forEach((w: any) => {
          if (w.type === 'critical') {
            riskLevel = 'high';
            warnings.push(w.message);
          } else if (w.type === 'warning' && riskLevel !== 'high') {
            riskLevel = 'medium';
            warnings.push(w.message);
          }
        });
      }

      // Generate smart recommendation
      let recommendation = '';

      if (riskLevel === 'high') {
        if (paymentToDisposable > 60) {
          const safePeriods = Math.ceil(periods * (paymentToDisposable / 40));
          recommendation = `Try extending to ${safePeriods} periods to bring payment ≤ 40% of spare cash`;
        } else if (bufferWeeks < 2) {
          recommendation = 'Build emergency savings before taking this loan, or reduce the amount';
        } else {
          recommendation = 'Consider reducing loan amount or extending term to improve affordability';
        }
      } else if (riskLevel === 'medium') {
        if (debtToIncome > 20) {
          recommendation = 'Avoid taking on more debt while repaying this one';
        } else {
          recommendation = 'Manageable if income stays steady - keep emergency savings';
        }
      } else {
        recommendation = 'Looks good! Stick to the plan and avoid lifestyle inflation';
      }

      res.json({
        analysis: {
          riskLevel,
          riskScore: riskLevel === 'high' ? 75 : riskLevel === 'medium' ? 50 : 25,
          recommendation,
          warnings: warnings.length > 0 ? warnings : undefined,
          positives: positives.length > 0 ? positives : undefined,
          metrics: {
            monthlyPayment,
            totalInterest,
            debtToIncome: debtToIncome.toFixed(1),
            paymentToDisposable: paymentToDisposable.toFixed(1),
            disposableIncome,
            bufferWeeks: bufferWeeks.toFixed(1)
          },
          emoji: riskLevel === 'high' ? '🛑' : riskLevel === 'medium' ? '⚠️' : '✅',
          headline: riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Room for Caution' : 'Looks Affordable'
        },
        projection,
        financialStatus: {
          totalAssets: totalAssets.toFixed(2),
          totalLiabilities: totalLiabilities.toFixed(2),
          netWorth: (totalAssets - totalLiabilities).toFixed(2),
          currentDebtLoad: totalLiabilities.toFixed(2)
        }
      });
    } catch (error: any) {
      console.error('Risk analysis error:', error);
      res.status(500).json({ error: error.message });
    }
  });


  // ============= Export Routes =============

  app.get("/api/export/json", authenticate, async (req: any, res) => {
    try {
      const [accounts, transactions, budgets, goals, debts] = await Promise.all([
        storage.getAccountsByUserId(req.userId),
        storage.getTransactionsByUserId(req.userId),
        storage.getBudgetsByUserId(req.userId),
        storage.getGoalsByUserId(req.userId),
        storage.getDebtsByUserId(req.userId),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        accounts,
        transactions,
        budgets,
        goals,
        debts,
      };

      res.json(exportData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/export/csv", authenticate, async (req: any, res) => {
    try {
      const transactions = await storage.getTransactionsByUserId(req.userId);

      // CSV header
      let csv = 'Date,Description,Amount,Category,Notes\n';

      // Add rows
      transactions.forEach(t => {
        const date = t.date;
        const description = `"${(t.description || '').replace(/"/g, '""')}"`;
        const amount = t.totalAmount;
        const category = `"${(t.category || '').replace(/"/g, '""')}"`;
        const notes = `"${(t.notes || '').replace(/"/g, '""')}"`;

        csv += `${date},${description},${amount},${category},${notes}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/export/pdf", authenticate, async (req: any, res) => {
    try {
      const [balanceSheet, ratios, transactions] = await Promise.all([
        getBalanceSheet(req.userId),
        getFinancialRatios(req.userId),
        storage.getTransactionsByUserId(req.userId)
      ]);

      // Simple text-based report (can be enhanced with a PDF library later)
      let report = `FINANCIAL REPORT\n`;
      report += `Generated: ${new Date().toLocaleString()}\n`;
      report += `\n${'='.repeat(60)}\n\n`;

      report += `FINANCIAL SUMMARY\n`;
      report += `-`.repeat(60) + '\n';
      report += `Net Worth: $${balanceSheet.netWorth.toFixed(2)}\n`;
      report += `Total Assets: $${balanceSheet.assets.toFixed(2)}\n`;
      report += `Total Liabilities: $${balanceSheet.liabilities.toFixed(2)}\n`;
      report += `\n`;

      report += `FINANCIAL HEALTH\n`;
      report += `-`.repeat(60) + '\n';
      report += `Savings Rate: ${ratios.savingsRate.toFixed(1)}%\n`;
      report += `Debt-to-Income Ratio: ${ratios.debtToIncomeRatio.toFixed(1)}%\n`;
      report += `Monthly Income: $${ratios.monthlyIncome.toFixed(2)}\n`;
      report += `Monthly Expenses: $${ratios.monthlyExpenses.toFixed(2)}\n`;
      report += `\n`;

      report += `RECENT TRANSACTIONS (Last 20)\n`;
      report += `-`.repeat(60) + '\n';
      transactions.slice(0, 20).forEach(t => {
        report += `${t.date} | $${parseFloat(t.totalAmount).toFixed(2).padStart(10)} | ${t.description}\n`;
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="financial-report-${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= Savings Recommendations Routes =============

  app.get("/api/recommendations", authenticate, async (req: any, res) => {
    try {
      const recommendations = await storage.getSavingsRecommendationsByUserId(req.userId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recommendations", authenticate, async (req: any, res) => {
    try {
      const recommendation = await storage.createSavingsRecommendation(req.userId, req.body);
      res.status(201).json(recommendation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Analytics and reporting routes
  app.get("/api/analytics/balance-sheet", authenticate, async (req: any, res) => {
    try {
      const balanceSheet = await getBalanceSheet(req.userId);
      res.json(balanceSheet);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/cash-flow", authenticate, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const cashFlow = await getCashFlow(
        req.userId,
        new Date(startDate as string || new Date().setMonth(new Date().getMonth() - 1)),
        new Date(endDate as string || new Date())
      );
      res.json(cashFlow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/financial-ratios", authenticate, async (req: any, res) => {
    try {
      const ratios = await getFinancialRatios(req.userId);
      res.json(ratios);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/health-score", authenticate, async (req: any, res) => {
    try {
      const score = await calculateFinancialHealthScore(req.userId);
      res.json(score);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/spending-patterns", authenticate, async (req: any, res) => {
    try {
      const months = parseInt(req.query.months as string) || 3;
      const patterns = await getSpendingPatterns(req.userId, months);
      res.json(patterns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/spending-days-comparison", authenticate, async (req: any, res) => {
    try {
      const { getSpendingDaysComparison } = await import("./analytics");
      const comparison = await getSpendingDaysComparison(req.userId);
      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/balance-history", authenticate, async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const history = await getBalanceHistory(req.userId, days);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Recommendations and Notifications
  app.get("/api/ai/recommendations", authenticate, async (req: any, res) => {
    try {
      const recommendations = await generateAIRecommendations(req.userId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notifications", authenticate, async (req: any, res) => {
    try {
      // Generate smart notifications based on budgets, goals, and spending patterns
      const notifications: any[] = [];

      // Check budgets at 75% and 100% thresholds
      const budgets = await storage.getActiveBudgetsByUserId(req.userId);
      for (const budget of budgets) {
        const spending = await storage.getBudgetSpending(req.userId, budget.id, budget.startDate, budget.endDate);
        if (spending) {
          const percentage = spending.percentage;
          const allocated = parseFloat(budget.allocatedAmount);
          const spent = spending.spent;
          const remaining = spending.remaining;

          // Calculate days remaining
          const today = new Date();
          const endDate = new Date(budget.endDate);
          const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

          // 100% threshold - over budget
          if (percentage >= 100) {
            notifications.push({
              type: 'budget_exceeded',
              title: `Budget Exceeded: ${budget.category.replace(/_/g, ' ')}`,
              message: `You've spent $${spent.toFixed(2)} of $${allocated.toFixed(2)} (${percentage.toFixed(0)}%). Over by $${Math.abs(remaining).toFixed(2)}.`,
              severity: 'critical',
              budgetId: budget.id,
              category: budget.category,
              percentUsed: Math.round(percentage)
            });
          }
          // 75% threshold - warning
          else if (percentage >= 75) {
            notifications.push({
              type: 'budget_warning',
              title: `Budget Alert: ${budget.category.replace(/_/g, ' ')}`,
              message: `You've used ${percentage.toFixed(0)}% of your budget. $${remaining.toFixed(2)} left with ${daysLeft} days to go.`,
              severity: 'high',
              budgetId: budget.id,
              category: budget.category,
              percentUsed: Math.round(percentage)
            });
          }
        }
      }

      // Check goals progress
      const goals = await storage.getActiveGoalsByUserId(req.userId);
      for (const goal of goals) {
        const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
        if (progress >= 90 && progress < 100) {
          notifications.push({
            type: 'goal_progress',
            title: `Goal Almost Achieved: ${goal.name}`,
            message: `You're ${progress.toFixed(0)}% of the way to your goal!`,
            severity: 'low'
          });
        }
      }

      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // CSV Import removed - manual entry only

  // Enhanced NLP merchant categorization route
  app.post("/api/ai/categorize", authenticate, async (req: any, res) => {
    try {
      const transactions = req.body.transactions || [];

      // Merchant-to-category mapping
      const merchantRules: { [key: string]: string } = {
        // Food & Dining
        'starbucks': 'food',
        'mcdonalds': 'food',
        'chipotle': 'food',
        'subway': 'food',
        'dominos': 'food',
        'pizza hut': 'food',
        'taco bell': 'food',
        'wendys': 'food',
        'burger king': 'food',
        'restaurant': 'food',
        'cafe': 'food',
        'coffee': 'food',
        'bakery': 'food',
        'grocery': 'food',
        'safeway': 'food',
        'kroger': 'food',
        'trader joe': 'food',
        'whole foods': 'food',
        'walmart': 'food',
        'target': 'food',
        'costco': 'food',

        // Transportation
        'uber': 'transportation',
        'lyft': 'transportation',
        'gas': 'transportation',
        'shell': 'transportation',
        'chevron': 'transportation',
        'exxon': 'transportation',
        'bp': 'transportation',
        'parking': 'transportation',
        'transit': 'transportation',
        'metro': 'transportation',

        // Housing
        'rent': 'housing',
        'mortgage': 'housing',
        'property': 'housing',

        // Utilities
        'electric': 'utilities',
        'power': 'utilities',
        'water': 'utilities',
        'internet': 'utilities',
        'comcast': 'utilities',
        'verizon': 'utilities',
        'att': 'utilities',
        'spectrum': 'utilities',

        // Healthcare
        'doctor': 'healthcare',
        'medical': 'healthcare',
        'pharmacy': 'healthcare',
        'cvs': 'healthcare',
        'walgreens': 'healthcare',
        'hospital': 'healthcare',
        'clinic': 'healthcare',

        // Entertainment
        'netflix': 'entertainment',
        'spotify': 'entertainment',
        'hulu': 'entertainment',
        'disney': 'entertainment',
        'amazon prime': 'entertainment',
        'theater': 'entertainment',
        'cinema': 'entertainment',
        'gym': 'entertainment',
        'fitness': 'entertainment',
      };

      const categorized = transactions.map((txn: any) => {
        const desc = txn.description?.toLowerCase() || '';
        let category = 'other_expense';

        // Check merchant rules first
        for (const [merchant, cat] of Object.entries(merchantRules)) {
          if (desc.includes(merchant)) {
            category = cat;
            break;
          }
        }

        return { ...txn, category, autoCategorized: true };
      });

      res.json(categorized);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gemini AI routes
  app.post("/api/ai/predict-expenses", authenticate, async (req: any, res) => {
    try {
      const predictions = await predictExpenses(req.userId, req.body);
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ai/insights", authenticate, async (req: any, res) => {
    try {
      const ratios = await getFinancialRatios(req.userId);
      const patterns = await getSpendingPatterns(req.userId, 3);
      const insights = await generateFinancialInsights(req.userId, { ratios, patterns });
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= Streaks & Gamification Routes =============

  // Get user streaks
  app.get("/api/streaks", authenticate, async (req: any, res) => {
    try {
      const streak = await storage.getUserStreak(req.userId);
      if (!streak) {
        return res.json({
          currentStreak: 0,
          longestStreak: 0,
          totalDaysInBudget: 0,
          lastBudgetCheckDate: null
        });
      }
      res.json(streak);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update streak (check today's budget status)
  app.post("/api/streaks/check", authenticate, async (req: any, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const budgets = await storage.getActiveBudgetsByUserId(req.userId);

      let isInBudgetToday = true;
      for (const budget of budgets) {
        const spending = await storage.getBudgetSpending(req.userId, budget.id, budget.startDate, budget.endDate);
        if (spending && spending.percentage > 100) {
          isInBudgetToday = false;
          break;
        }
      }

      const streak = await storage.updateUserStreak(req.userId, isInBudgetToday);
      res.json(streak);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= Learning Center Routes =============

  // Get all lessons
  app.get("/api/lessons", async (req, res) => {
    try {
      const lessons = await storage.getAllLessons();
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get lessons by category
  app.get("/api/lessons/category/:category", async (req, res) => {
    try {
      const lessons = await storage.getLessonsByCategory(req.params.category);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get lesson by slug
  app.get("/api/lessons/slug/:slug", async (req, res) => {
    try {
      const lesson = await storage.getLessonBySlug(req.params.slug);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get lesson by ID
  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getLessonById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get quiz questions for a lesson
  app.get("/api/lessons/:id/quiz", async (req, res) => {
    try {
      const questions = await storage.getQuizQuestionsByLesson(req.params.id);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit quiz answers
  app.post("/api/lessons/:id/quiz", authenticate, async (req: any, res) => {
    try {
      const { answers } = req.body;
      const lessonId = req.params.id;

      // Get quiz questions
      const questions = await storage.getQuizQuestionsByLesson(lessonId);

      if (questions.length === 0) {
        return res.status(404).json({ error: "No quiz found for this lesson" });
      }

      // Calculate score - answers is array of {questionId, selectedAnswer}
      let correctAnswers = 0;
      const answerMap = new Map();

      // Build map of questionId -> selectedAnswer
      answers.forEach((ans: any) => {
        answerMap.set(ans.questionId, ans.selectedAnswer);
      });

      // Check each question
      questions.forEach((q) => {
        const userAnswer = answerMap.get(q.id);
        const correctAnswer = parseInt(q.correctAnswer);

        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / questions.length) * 100);

      // Save quiz result
      const result = await storage.createQuizResult({
        userId: req.userId,
        lessonId,
        score,
        totalQuestions: questions.length,
        correctAnswers,
        answers: JSON.stringify(answers),
      });

      // Update lesson progress
      await storage.createOrUpdateLessonProgress({
        userId: req.userId,
        lessonId,
        status: 'completed',
        score,
        completedAt: new Date(),
      });

      res.json({ result, score, correctAnswers, totalQuestions: questions.length });
    } catch (error: any) {
      console.error("Quiz submission error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's progress for a specific lesson
  app.get("/api/lessons/:id/progress", authenticate, async (req: any, res) => {
    try {
      const progress = await storage.getUserLessonProgress(req.userId, req.params.id);
      res.json(progress || { status: 'not_started' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update lesson progress
  app.post("/api/lessons/:id/progress", authenticate, async (req: any, res) => {
    try {
      const { status } = req.body;
      const progress = await storage.createOrUpdateLessonProgress({
        userId: req.userId,
        lessonId: req.params.id,
        status,
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
      });
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all user progress
  app.get("/api/user/progress", authenticate, async (req: any, res) => {
    try {
      const progress = await storage.getAllUserProgress(req.userId);
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's quiz results
  app.get("/api/user/quiz-results", authenticate, async (req: any, res) => {
    try {
      const results = await storage.getAllUserQuizResults(req.userId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Achievements endpoints
  app.get("/api/achievements", authenticate, async (req: any, res) => {
    try {
      const { calculateAchievements } = await import("./achievements");
      const userAchievements = await calculateAchievements(req.userId);
      res.json(userAchievements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= PHASE 2 ROUTES =============

  // Push notifications
  app.get("/api/notifications", authenticate, async (req: any, res) => {
    try {
      const notifications = await db.query.budgetNotifications.findMany({
        where: eq(budgetNotifications.userId, req.userId),
        orderBy: desc(budgetNotifications.createdAt),
        limit: 50,
      });
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/:id/read", authenticate, async (req: any, res) => {
    try {
      await db.update(budgetNotifications)
        .set({ isRead: true })
        .where(and(
          eq(budgetNotifications.id, req.params.id),
          eq(budgetNotifications.userId, req.userId)
        ));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/notifications/:id", authenticate, async (req: any, res) => {
    try {
      await db.delete(budgetNotifications)
        .where(and(
          eq(budgetNotifications.id, req.params.id),
          eq(budgetNotifications.userId, req.userId)
        ));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/notifications/clear-all", authenticate, async (req: any, res) => {
    try {
      await db.delete(budgetNotifications)
        .where(eq(budgetNotifications.userId, req.userId));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/subscribe", authenticate, async (req: any, res) => {
    try {
      const { endpoint, keys } = req.body;
      const subscription = await db.insert(notificationSubscriptions).values({
        userId: req.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }).returning();
      res.json(subscription[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Price anomaly detection
  app.post("/api/items/check-anomalies", authenticate, async (req: any, res) => {
    try {
      const { checkAllItemsForAnomalies } = await import("./price-anomaly");
      const { items, region } = req.body;
      const anomalies = await checkAllItemsForAnomalies(req.userId, items, region);
      res.json(anomalies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pantry inventory
  app.get("/api/pantry", authenticate, async (req: any, res) => {
    try {
      const items = await db.query.pantryInventory.findMany({
        where: eq(pantryInventory.userId, req.userId),
      });
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pantry/add", authenticate, async (req: any, res) => {
    try {
      const { addToPantry } = await import("./pantry");
      const result = await addToPantry(req.userId, req.body.items);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pantry/check-shopping-list", authenticate, async (req: any, res) => {
    try {
      const { checkPantryBeforeShopping } = await import("./pantry");
      const result = await checkPantryBeforeShopping(req.userId, req.body.shoppingList);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Overdraft prediction
  app.get("/api/overdraft-prediction", authenticate, async (req: any, res) => {
    try {
      const { predictOverdraft } = await import("./overdraft-prediction");
      const prediction = await predictOverdraft(req.userId);
      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Streaks
  app.get("/api/streaks", authenticate, async (req: any, res) => {
    try {
      const streak = await db.query.userStreaks.findFirst({
        where: eq(userStreaks.userId, req.userId),
      });
      res.json(streak || { currentStreak: 0, longestStreak: 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/streaks/update", authenticate, async (req: any, res) => {
    try {
      const { updateStreak } = await import("./achievements");
      const newStreak = await updateStreak(req.userId);
      res.json({ currentStreak: newStreak });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });



  // ============= AI Routes =============

  app.post("/api/ai/review-budget", authenticate, async (req: any, res) => {
    try {
      const { categories, totalAmount } = req.body;

      // Simple AI review logic (can be enhanced with Gemini later)
      let score = 100;
      const insights: any[] = [];
      const recommendations: string[] = [];

      // Check for overspending in any category
      for (const cat of categories) {
        const amount = parseFloat(cat.amount || "0");
        if (amount > totalAmount * 0.5) {
          score -= 20;
          insights.push({
            type: "warning",
            title: `High allocation to ${cat.category}`,
            description: `${cat.category} takes up ${((amount / totalAmount) * 100).toFixed(0)}% of budget`
          });
          recommendations.push(`Consider reducing ${cat.category} spending`);
        }
      }

      // Check for good practices
      if (categories.length >= 3) {
        insights.push({
          type: "positive",
          title: "Well diversified budget",
          description: "Good job spreading costs across multiple categories"
        });
      }

      const verdict = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "needs_improvement" : "risky";

      res.json({
        overallScore: score,
        verdict,
        insights,
        recommendations,
        estimatedSavings: score < 80 ? totalAmount * 0.1 : 0
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/ai/overspend-suggestions", authenticate, async (req: any, res) => {
    try {
      const { budgetId, categoryId, overspentAmount } = req.body;

      // Simple suggestions (can be enhanced with Gemini)
      const alternatives = [
        "Look for lower-cost alternatives for your recent purchases",
        "Consider waiting for sales or discounts",
        "Remove non-essential items from your shopping list",
        "Split purchases across multiple shopping trips"
      ];

      res.json({
        alternatives,
        savings: overspentAmount * 0.3
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Budget Completion Route =============

  app.post("/api/budgets/:id/complete", authenticate, async (req: any, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget || budget.userId !== req.userId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      const { totalActual, savings } = req.body;

      // Get user accounts to create transaction
      const userAccounts = await storage.getAccountsByUserId(req.userId);

      // Find checking account (primary cash account)
      let checkingAccount = userAccounts.find(
        acc => acc.accountType === 'asset' && acc.accountCategory === 'checking' && acc.isActive === 1
      );

      if (!checkingAccount) {
        checkingAccount = userAccounts.find(
          acc => acc.accountType === 'asset' && acc.isActive === 1
        );
      }

      if (!checkingAccount) {
        return res.status(400).json({ error: 'No active asset account found. Please create a checking account first.' });
      }

      // Find or create expense account for this category
      const accountCategory = budget.category as any;
      let expenseAccount = userAccounts.find(
        acc => acc.accountType === 'expense' && acc.accountCategory === accountCategory && acc.isActive === 1
      );

      if (!expenseAccount) {
        // Create expense account for this category
        const categoryNames: { [key: string]: string } = {
          'food': 'Food & Dining',
          'transportation': 'Transportation',
          'housing': 'Housing',
          'healthcare': 'Healthcare',
          'utilities': 'Utilities',
          'entertainment': 'Entertainment',
          'personal_care': 'Personal Care',
          'education': 'Education',
          'other_expense': 'Other Expenses',
        };

        const accountName = categoryNames[budget.category] || budget.category;
        const createdAccount = await storage.createAccount({
          userId: req.userId,
          name: accountName,
          accountType: 'expense',
          accountCategory: accountCategory,
          balance: '0',
          description: `Auto-created for ${budget.category} budget`,
        });
        expenseAccount = createdAccount;
      }

      // Mark budget as completed
      await storage.updateBudget(req.params.id, {
        isActive: 0,
        completedAt: new Date()
      });

      // Create transaction for the actual spending
      const now = new Date();
      const transaction = await storage.createTransactionWithEntries(
        req.userId,
        {
          date: now.toISOString().split('T')[0],
          description: `Budget Completed: ${budget.category}`,
          totalAmount: totalActual.toString(),
          notes: `Saved ${savings >= 0 ? '+' : ''}$${Math.abs(savings).toFixed(2)} vs budget`,
        },
        [
          { accountId: expenseAccount.id, entryType: 'debit', amount: totalActual.toString() },
          { accountId: checkingAccount.id, entryType: 'credit', amount: totalActual.toString() }
        ]
      );

      res.json({ budget, transaction });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============= Export Routes =============

  app.get("/api/export/transactions", authenticate, async (req: any, res) => {
    try {
      const { format, startDate, endDate } = req.query;
      const transactions = await storage.getTransactionsByDateRange(
        req.userId,
        startDate as string || '1970-01-01',
        endDate as string || new Date().toISOString().split('T')[0]
      );

      if (format === 'csv') {
        const csv = [
          'Date,Description,Amount,Category,Notes',
          ...transactions.map(t => 
            `${t.date},"${t.description}",${t.totalAmount},"${t.category || ''}","${t.notes || ''}"`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        // Simple text-based "PDF" (can be enhanced with proper PDF library)
        const content = `
TRANSACTION REPORT
Generated: ${new Date().toLocaleString()}

${transactions.map(t => `
Date: ${t.date}
Description: ${t.description}
Amount: $${t.totalAmount}
Category: ${t.category || 'N/A'}
Notes: ${t.notes || 'N/A'}
${'='.repeat(50)}
`).join('\n')}

Total Transactions: ${transactions.length}
        `;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.txt"`);
        res.send(content);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/export/budgets", authenticate, async (req: any, res) => {
    try {
      const { format } = req.query;
      const budgets = await storage.getBudgetsByUserId(req.userId);

      if (format === 'csv') {
        const csv = [
          'Category,Allocated Amount,Period,Start Date,End Date,Status',
          ...budgets.map(b => 
            `"${b.category}",${b.allocatedAmount},"${b.period}",${b.startDate},${b.endDate},${b.isActive ? 'Active' : 'Inactive'}`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="budgets-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        const content = `
BUDGET REPORT
Generated: ${new Date().toLocaleString()}

${budgets.map(b => `
Category: ${b.category}
Allocated: $${b.allocatedAmount}
Period: ${b.period}
Date Range: ${b.startDate} to ${b.endDate}
Status: ${b.isActive ? 'Active' : 'Inactive'}
${'='.repeat(50)}
`).join('\n')}

Total Budgets: ${budgets.length}
        `;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="budgets-${new Date().toISOString().split('T')[0]}.txt"`);
        res.send(content);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/export/dashboard", authenticate, async (req: any, res) => {
    try {
      const { format } = req.query;

      // Get dashboard data
      const accounts = await storage.getAccountsByUserId(req.userId);
      const netWorth = await storage.getNetWorth(req.userId);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const transactions = await storage.getTransactionsByDateRange(req.userId, monthStart, monthEnd);

      const content = `
FINANCIAL DASHBOARD REPORT
Generated: ${new Date().toLocaleString()}

NET WORTH: $${netWorth}

ACCOUNTS:
${accounts.map(a => `  ${a.name}: $${a.balance} (${a.accountType})`).join('\n')}

THIS MONTH'S TRANSACTIONS: ${transactions.length}

Total Assets: ${accounts.filter(a => a.accountType === 'asset').reduce((sum, a) => sum + parseFloat(a.balance), 0).toFixed(2)}
Total Liabilities: ${Math.abs(accounts.filter(a => a.accountType === 'liability').reduce((sum, a) => sum + parseFloat(a.balance), 0)).toFixed(2)}
      `;

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== NLP CATEGORY SUGGESTION ENDPOINTS =====

  app.post("/api/ai/suggest-category", authenticate, async (req: any, res) => {
    try {
      const { description, transactionType } = req.body;

      if (!description || !transactionType) {
        return res.status(400).json({ error: "Missing description or transactionType" });
      }

      const suggestion = await suggestCategory(req.userId, description, transactionType);
      res.json(suggestion);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/record-category-choice", authenticate, async (req: any, res) => {
    try {
      const { description, transactionType, suggestedCategory, userSelectedCategory } = req.body;

      await recordCategoryChoice(
        req.userId,
        description,
        transactionType,
        suggestedCategory,
        userSelectedCategory
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= PHASE 3 ROUTES =============

  // Template versioning - DISABLED: Schema mismatch, fields don't exist
  // app.get("/api/templates/:id/versions", authenticate, async (req: any, res) => {
  //   try {
  //     const versions = await db.query.budgetTemplates.findMany({
  //       where: or(
  //         and(
  //           eq(budgetTemplates.id, parseInt(req.params.id)),
  //           eq(budgetTemplates.userId, req.userId)
  //         ),
  //         and(
  //           eq(budgetTemplates.parentTemplateId, parseInt(req.params.id)),
  //           eq(budgetTemplates.userId, req.userId)
  //         )
  //       ),
  //       orderBy: desc(budgetTemplates.version),
  //     });
  //     res.json(versions);
  //   } catch (error: any) {
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  // app.post("/api/templates/:id/create-version", authenticate, async (req: any, res) => {
  //   try {
  //     const originalTemplate = await db.query.budgetTemplates.findFirst({
  //       where: and(
  //         eq(budgetTemplates.id, parseInt(req.params.id)),
  //         eq(budgetTemplates.userId, req.userId)
  //       ),
  //     });

  //     if (!originalTemplate) {
  //       return res.status(404).json({ error: "Template not found" });
  //     }

  //     const newVersion = await db.insert(budgetTemplates).values({
  //       userId: req.userId,
  //       name: req.body.name || originalTemplate.name,
  //       categories: originalTemplate.categories,
  //       version: (originalTemplate.version || 1) + 1,
  //       parentTemplateId: originalTemplate.parentTemplateId || originalTemplate.id,
  //     }).returning();

  //     // Copy template items
  //     const items = await db.query.budgetTemplateItems.findMany({
  //       where: eq(budgetTemplateItems.templateId, req.params.id.toString()),
  //     });

  //     for (const item of items) {
  //       await db.insert(budgetTemplateItems).values({
  //         templateId: newVersion[0].id.toString(),
  //         category: item.category,
  //         itemName: item.itemName,
  //         quantity: item.quantity,
  //         unit: item.unit,
  //         averagePrice: item.averagePrice,
  //         bestLocation: item.bestLocation,
  //       });
  //     }

  //     res.json(newVersion[0]);
  //   } catch (error: any) {
  //     res.status(500).json({ error: error.message });
  //     }
  // });

  // Budget rule presets
  app.get("/api/rule-presets", authenticate, async (req: any, res) => {
    try {
      const presets = await db.query.budgetRulePresets.findMany({
        where: eq(budgetRulePresets.userId, req.userId),
      });
      res.json(presets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rule-presets", authenticate, async (req: any, res) => {
    try {
      const preset = await db.insert(budgetRulePresets).values({
        userId: req.userId,
        name: req.body.name,
        description: req.body.description,
        ruleType: req.body.ruleType,
        ruleConfig: JSON.stringify(req.body.ruleConfig),
      }).returning();
      res.json(preset[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DISABLED: Schema mismatch - budgets.id is varchar not number, budget.totalIncome doesn't exist, budgetItems.allocatedAmount doesn't exist
  // app.post("/api/budgets/:id/apply-preset", authenticate, async (req: any, res) => {
  //   try {
  //     const preset = await db.query.budgetRulePresets.findFirst({
  //       where: and(
  //         eq(budgetRulePresets.id, req.body.presetId),
  //         eq(budgetRulePresets.userId, req.userId)
  //       ),
  //     });

  //     if (!preset) {
  //       return res.status(404).json({ error: "Preset not found" });
  //     }

  //     const budget = await db.query.budgets.findFirst({
  //       where: and(
  //         eq(budgets.id, req.params.id),
  //         eq(budgets.userId, req.userId)
  //       ),
  //     });

  //     if (!budget) {
  //       return res.status(404).json({ error: "Budget not found" });
  //     }

  //     const config = JSON.parse(preset.ruleConfig);

  //     // Apply rule configuration to budget items
  //     const items = await db.query.budgetItems.findMany({
  //       where: eq(budgetItems.budgetId, req.params.id),
  //     });

  //     for (const item of items) {
  //       if (config[item.category]) {
  //         // NOTE: budget.totalIncome and budgetItems.allocatedAmount don't exist in schema
  //         // await db.update(budgetItems)
  //         //   .set({
  //         //     allocatedAmount: (budget.totalIncome * config[item.category] / 100).toFixed(2),
  //         //   })
  //         //   .where(eq(budgetItems.id, item.id));
  //       }
  //     }

  //     res.json({ success: true });
  //   } catch (error: any) {
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  // Savings auto-sweep
  app.get("/api/auto-sweep", authenticate, async (req: any, res) => {
    try {
      const sweeps = await db.query.savingsAutoSweep.findMany({
        where: eq(savingsAutoSweep.userId, req.userId),
      });
      res.json(sweeps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auto-sweep", authenticate, async (req: any, res) => {
    try {
      const sweep = await db.insert(savingsAutoSweep).values({
        userId: req.userId,
        sourceCategory: req.body.sourceCategory,
        targetGoalId: req.body.targetGoalId,
        threshold: req.body.threshold,
        isActive: 1,
      }).returning();
      res.json(sweep[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/auto-sweep/:id", authenticate, async (req: any, res) => {
    try {
      await db.delete(savingsAutoSweep)
        .where(and(
          eq(savingsAutoSweep.id, req.params.id),
          eq(savingsAutoSweep.userId, req.userId)
        ));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute auto-sweep processing for all active rules
  app.post("/api/auto-sweep/process", authenticate, async (req: any, res) => {
    try {
      const sweeps = await db.query.savingsAutoSweep.findMany({
        where: and(
          eq(savingsAutoSweep.userId, req.userId),
          eq(savingsAutoSweep.isActive, 1)
        ),
        with: {
          targetGoal: true,
        },
      });

      const results = [];

      for (const sweep of sweeps) {
        if (!sweep.targetGoal) {
          console.warn(`Sweep ${sweep.id} has no target goal, skipping`);
          continue;
        }

        // Find all budgets for this category
        const categoryBudgets = await db.query.budgets.findMany({
          where: and(
            eq(budgets.userId, req.userId),
            eq(budgets.category, sweep.sourceCategory as any),
            eq(budgets.isActive, 1)
          ),
        });

        let totalAllocated = 0;
        let totalSpent = 0;

        // Calculate total allocated and spent across all budgets in this category
        for (const budget of categoryBudgets) {
          totalAllocated += parseFloat(budget.allocatedAmount);

          // Get actual spending from transactions
          const spending = await storage.getBudgetSpending(
            req.userId,
            budget.id,
            budget.startDate,
            budget.endDate
          );

          if (spending) {
            totalSpent += spending.spent;
          }
        }

        const surplus = totalAllocated - totalSpent;
        const thresholdAmount = parseFloat(sweep.threshold);

        // Only sweep if surplus exceeds threshold
        if (surplus > thresholdAmount) {
          try {
            // Use existing addGoalContribution function which handles double-entry accounting
            await storage.addGoalContribution(
              sweep.targetGoal.id,
              surplus,
              sweep.targetGoal.sourceAccountId || undefined,
              `Auto-sweep from ${sweep.sourceCategory} budget`
            );

            // Update last swept timestamp
            await db.update(savingsAutoSweep)
              .set({ lastSweptAt: new Date() })
              .where(eq(savingsAutoSweep.id, sweep.id));

            results.push({
              category: sweep.sourceCategory,
              amount: surplus,
              goalName: sweep.targetGoal.name,
              success: true,
            });
          } catch (error: any) {
            results.push({
              category: sweep.sourceCategory,
              amount: surplus,
              goalName: sweep.targetGoal.name,
              success: false,
              error: error.message,
            });
          }
        } else {
          results.push({
            category: sweep.sourceCategory,
            surplus,
            threshold: thresholdAmount,
            skipped: true,
            reason: `Surplus ($${surplus.toFixed(2)}) below threshold ($${thresholdAmount.toFixed(2)})`,
          });
        }
      }

      res.json({
        processed: results.length,
        results,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DISABLED: Schema mismatch - budgetItems doesn't have userId, allocatedAmount, or actualAmount fields
  // app.post("/api/auto-sweep/process", authenticate, async (req: any, res) => {
  //   try {
  //     const sweeps = await db.query.savingsAutoSweep.findMany({
  //       where: and(
  //         eq(savingsAutoSweep.userId, req.userId),
  //         eq(savingsAutoSweep.isActive, 1)
  //       ),
  //     });

  //     const results = [];
  //     for (const sweep of sweeps) {
  //       // Get current budget items for the category
  //       const categoryItems = await db.query.budgetItems.findMany({
  //         where: eq(budgetItems.category, sweep.sourceCategory),
  //       });

  //       let totalUnused = 0;
  //       // NOTE: budgetItems doesn't have allocatedAmount or actualAmount fields
  //       // for (const item of categoryItems) {
  //       //   const unused = parseFloat(item.allocatedAmount) - parseFloat(item.actualAmount);
  //       //   if (unused > 0) totalUnused += unused;
  //       // }

  //       if (totalUnused > parseFloat(sweep.threshold)) {
  //         // Transfer to goal
  //         const goal = await db.query.goals.findFirst({
  //           where: eq(goals.id, sweep.targetGoalId),
  //         });

  //         if (goal) {
  //           const newCurrentAmount = parseFloat(goal.currentAmount) + totalUnused;
  //           await db.update(goals)
  //             .set({ currentAmount: newCurrentAmount.toFixed(2) })
  //             .where(eq(goals.id, sweep.targetGoalId));

  //           await db.update(savingsAutoSweep)
  //             .set({ lastSweptAt: new Date() })
  //             .where(eq(savingsAutoSweep.id, sweep.id));

  //           results.push({
  //             category: sweep.sourceCategory,
  //             amount: totalUnused,
  //             goalName: goal.name,
  //           });
  //         }
  //       }
  //     }

  //     res.json({ sweeps: results });
  //   } catch (error: any) {
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  // AI suggestion tracking (for SUBTRACT feature)
  app.post("/api/ai/track-suggestion-action", authenticate, async (req: any, res) => {
    try {
      const { action, suggestionId } = req.body;
      // Track in user preferences for analytics
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, req.userId),
      });

      if (prefs) {
        const aiStats = JSON.parse(prefs.aiSuggestionStats || "{}");
        aiStats[suggestionId] = { action, timestamp: new Date() };

        await db.update(userPreferences)
          .set({ 
            aiSuggestionStats: JSON.stringify(aiStats),
            aiSuggestionEngagement: (parseFloat(prefs.aiSuggestionEngagement || "0") + (action === 'apply' ? 1 : 0)).toString(),
          })
          .where(eq(userPreferences.userId, req.userId));
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ai/should-show-suggestions", authenticate, async (req: any, res) => {
    try {
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, req.userId),
      });

      const engagement = parseFloat(prefs?.aiSuggestionEngagement || "0");
      const stats = JSON.parse(prefs?.aiSuggestionStats || "{}");
      const totalShown = Object.keys(stats).length;

      // Show if engagement rate > 30% or if less than 10 suggestions shown
      const shouldShow = totalShown < 10 || (engagement / totalShown) > 0.3;

      res.json({ shouldShow, engagementRate: totalShown > 0 ? engagement / totalShown : 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/insights-feedback", authenticate, async (req: any, res) => {
    try {
      const { insightId, helpful, followedRecommendations } = req.body;

      const { recordUserFeedback } = await import('./ai-memory');
      await recordUserFeedback(req.userId, insightId, {
        helpful,
        followedRecommendations: followedRecommendations || []
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}