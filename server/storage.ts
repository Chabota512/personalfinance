import { db } from "./db";
import {
  users, accounts, transactions, transactionEntries, budgets, goals, goalContributions,
  savingsRecommendations, lessons, userLessonProgress, quizQuestions, quizResults,
  budgetItems, budgetTemplates, budgetTemplateItems, items, itemPriceHistory,
  budgetCategories, debts, debtPayments, recurringIncome, categoryOverrides, userStreaks,
  userPreferences, quickDealMonthlyAccounts,
  type InsertUser, type InsertAccount, type InsertTransaction,
  type InsertTransactionEntry, type InsertBudget, type InsertGoal, type InsertGoalContribution,
  type InsertLesson, type InsertUserLessonProgress, type InsertQuizQuestion, type InsertQuizResult,
  type InsertBudgetItem, type InsertBudgetTemplate, type InsertBudgetTemplateItem,
  type InsertItem, type InsertItemPriceHistory, type InsertBudgetCategory, type InsertCategoryOverride,
  type InsertUserStreak, type InsertUserPreferences
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, or, ilike } from "drizzle-orm";
import { calculateNextScheduledDate } from "@shared/goal-utils";

// User operations
export async function createUser(data: InsertUser) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function getUserById(id: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByUsername(username: string) {
  return await db.query.users.findFirst({
    where: eq(users.username, username),
  });
}

export async function getUserByEmail(email: string) {
  return await db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function updateUser(id: string, data: Partial<InsertUser>) {
  const [user] = await db.update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

// User preferences operations
export async function getUserPreferences(userId: string) {
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });
  return prefs;
}

export async function upsertUserPreferences(userId: string, data: Partial<InsertUserPreferences>) {
  // Check if preferences already exist
  const existing = await getUserPreferences(userId);
  
  if (existing) {
    // Update existing preferences
    const [updated] = await db.update(userPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updated;
  } else {
    // Create new preferences
    const [created] = await db.insert(userPreferences)
      .values({ userId, ...data })
      .returning();
    return created;
  }
}

// Account operations
export async function createAccount(data: InsertAccount) {
  const [account] = await db.insert(accounts).values(data).returning();
  return account;
}

export async function getAccountById(id: string) {
  return await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
}

export async function getAccountsByUserId(userId: string) {
  return await db.query.accounts.findMany({
    where: eq(accounts.userId, userId),
    orderBy: [desc(accounts.createdAt)],
  });
}

export async function updateAccount(id: string, data: Partial<InsertAccount>) {
  const [account] = await db.update(accounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(accounts.id, id))
    .returning();
  return account;
}

export async function updateAccountBalance(id: string, balance: string) {
  const [account] = await db.update(accounts)
    .set({ balance, updatedAt: new Date() })
    .where(eq(accounts.id, id))
    .returning();
  return account;
}

export async function deleteAccount(id: string) {
  await db.delete(accounts).where(eq(accounts.id, id));
}

// Transaction operations
export async function createTransaction(data: InsertTransaction) {
  return db.insert(transactions).values(data).returning();
}

export async function getTransactionsByUserId(userId: string) {
  return await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: [desc(transactions.date)],
  });
}

export async function getTransactionById(id: string) {
  return await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });
}

export async function getTransactionsByDateRange(userId: string, startDate: string, endDate: string) {
  return await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ),
    orderBy: [desc(transactions.date)],
  });
}

export async function updateTransaction(id: string, data: Partial<InsertTransaction>) {
  const [txn] = await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
  return txn;
}

export async function deleteTransaction(id: string) {
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function createTransactionWithEntries(
  userId: string,
  txData: { date: string; description: string; totalAmount: string; notes?: string | null; category?: string | null; locationName?: string | null; latitude?: string | null; longitude?: string | null; voiceNoteUrl?: string | null; reasonAudioUrl?: string | null; contentmentLevel?: number | null },
  entries: Array<{ accountId: string; entryType: 'debit' | 'credit'; amount: string }>
) {
  // SECURITY: Enforce double-entry accounting invariants
  if (!entries || entries.length < 2) {
    throw new Error('Transaction must have at least 2 entries for double-entry bookkeeping');
  }

  // Validate all accounts exist and belong to userId
  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    const account = await getAccountById(entry.accountId);
    if (!account) {
      throw new Error(`Account ${entry.accountId} not found`);
    }
    if (account.userId !== userId) {
      throw new Error(`Unauthorized: Account ${entry.accountId} does not belong to user`);
    }

    const amount = parseFloat(entry.amount);
    if (entry.entryType === 'debit') {
      totalDebits += amount;
    } else {
      totalCredits += amount;
    }
  }

  // ACCOUNTING: Enforce balanced entries (debits must equal credits)
  // Round to cents and require exact balance
  const debitsRounded = Math.round(totalDebits * 100);
  const creditsRounded = Math.round(totalCredits * 100);
  if (debitsRounded !== creditsRounded) {
    throw new Error(`Transaction not balanced: debits=${(debitsRounded/100).toFixed(2)}, credits=${(creditsRounded/100).toFixed(2)}`);
  }

  // Wrap in database transaction for atomicity
  return await db.transaction(async (tx) => {
    // Create transaction
    const [transaction] = await tx.insert(transactions)
      .values({ ...txData, userId })
      .returning();

    // Maintain in-memory balance map to handle multiple entries per account
    const balanceMap = new Map<string, { balance: number; accountType: string }>();

    // Create entries and update account balances
    for (const entry of entries) {
      await tx.insert(transactionEntries).values({
        transactionId: transaction.id,
        accountId: entry.accountId,
        entryType: entry.entryType,
        amount: entry.amount
      });

      // Get account info (use transaction handle or cache)
      let accountInfo = balanceMap.get(entry.accountId);
      if (!accountInfo) {
        const account = await tx.query.accounts.findFirst({
          where: eq(accounts.id, entry.accountId)
        });
        if (!account) {
          throw new Error(`Account ${entry.accountId} not found during transaction`);
        }
        accountInfo = {
          balance: parseFloat(account.balance),
          accountType: account.accountType
        };
        balanceMap.set(entry.accountId, accountInfo);
      }

      const entryAmount = parseFloat(entry.amount);
      let currentBalance = accountInfo.balance;

      // Asset and Expense accounts increase with debits, decrease with credits
      if ((accountInfo.accountType === 'asset' || accountInfo.accountType === 'expense') && entry.entryType === 'debit') {
        currentBalance += entryAmount;
      } else if ((accountInfo.accountType === 'asset' || accountInfo.accountType === 'expense') && entry.entryType === 'credit') {
        currentBalance -= entryAmount;
      }
      // Liability accounts (stored as negative): debit decreases absolute value (less negative), credit increases absolute value (more negative)
      else if (accountInfo.accountType === 'liability' && entry.entryType === 'debit') {
        currentBalance += entryAmount;  // Paying off debt: -1000 + 100 = -900
      } else if (accountInfo.accountType === 'liability' && entry.entryType === 'credit') {
        currentBalance -= entryAmount;  // Borrowing more: -1000 - 100 = -1100
      }
      // Income accounts (stored as positive): credit increases, debit decreases
      else if (accountInfo.accountType === 'income' && entry.entryType === 'credit') {
        currentBalance += entryAmount;  // Earning income: 1000 + 100 = 1100
      } else if (accountInfo.accountType === 'income' && entry.entryType === 'debit') {
        currentBalance -= entryAmount;  // Reducing income: 1000 - 100 = 900
      }

      // Update in-memory balance
      accountInfo.balance = currentBalance;
    }

    // Commit all balance updates
    for (const [accountId, accountInfo] of Array.from(balanceMap.entries())) {
      await tx.update(accounts)
        .set({ balance: accountInfo.balance.toFixed(2) })
        .where(eq(accounts.id, accountId));
    }

    return transaction;
  });
}

export async function createQuickDeal(
  userId: string,
  data: {
    type: 'income' | 'expense';
    description: string;
    amount: string;
    category: string;
    locationName?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    reason?: string | null;
    reasonAudioUrl?: string | null;
    contentmentLevel?: number | null;
    depositAccountId?: string | null;
    sourceAccountId?: string | null;
  }
) {
  const amount = parseFloat(data.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount');
  }

  // Category mapping for both expenses and income
  const categoryToAccountCategory: { [key: string]: string } = {
    // Expense categories
    'food': 'food',
    'transport': 'transportation',
    'transportation': 'transportation',
    'shopping': 'other_expense',
    'entertainment': 'entertainment',
    'housing': 'housing',
    'healthcare': 'healthcare',
    'personal_care': 'personal_care',
    'education': 'education',
    'utilities': 'utilities',
    'insurance': 'insurance',
    'other_expense': 'other_expense',
    // Income categories
    'salary': 'salary',
    'business': 'business',
    'investment_income': 'investment_income',
    'other_income': 'other_income',
  };

  const accountCategory = categoryToAccountCategory[data.category.toLowerCase()] ||
    (data.type === 'income' ? 'other_income' : 'other_expense');

  const userAccounts = await getAccountsByUserId(userId);

  // Determine the source account for the transaction
  let sourceAccount;
  
  if (data.type === 'income' && data.depositAccountId) {
    // For income, use the specified deposit account
    sourceAccount = userAccounts.find(acc => acc.id === data.depositAccountId);
    if (!sourceAccount) {
      throw new Error('Specified deposit account not found');
    }
  } else if (data.type === 'expense' && data.sourceAccountId) {
    // For expense, use the specified source account (could be monthly default or temporary override)
    sourceAccount = userAccounts.find(acc => acc.id === data.sourceAccountId);
    if (!sourceAccount) {
      throw new Error('Specified source account not found');
    }
  } else {
    // Fallback: Find checking account (primary cash account)
    sourceAccount = userAccounts.find(
      acc => acc.accountType === 'asset' && acc.accountCategory === 'checking' && acc.isActive === 1
    );

    if (!sourceAccount) {
      sourceAccount = userAccounts.find(
        acc => acc.accountType === 'asset' && acc.isActive === 1
      );
    }

    if (!sourceAccount) {
      throw new Error('No active asset account found. Please create a checking account first.');
    }
  }

  const checkingAccount = sourceAccount;

  // Find or create the appropriate income/expense account
  const accountType = data.type === 'income' ? 'income' : 'expense';
  let targetAccount = userAccounts.find(
    acc => acc.accountType === accountType && acc.accountCategory === accountCategory && acc.isActive === 1
  );

  if (!targetAccount) {
    const categoryNames: { [key: string]: string } = {
      // Expense categories
      'food': 'Food & Dining',
      'transportation': 'Transportation',
      'entertainment': 'Entertainment',
      'housing': 'Housing',
      'healthcare': 'Healthcare',
      'personal_care': 'Personal Care',
      'education': 'Education',
      'utilities': 'Utilities',
      'insurance': 'Insurance',
      'other_expense': 'Other Expenses',
      // Income categories
      'salary': 'Salary Income',
      'business': 'Business Income',
      'investment_income': 'Investment Income',
      'other_income': 'Other Income',
    };

    targetAccount = await createAccount({
      userId,
      name: categoryNames[accountCategory] || (data.type === 'income' ? 'Other Income' : 'Other Expenses'),
      accountType: accountType as any,
      accountCategory: accountCategory as any,
      balance: '0',
      description: `Auto-created for quick deal: ${data.category}`,
    });
  }

  const today = new Date().toISOString().split('T')[0];

  // Create double-entry bookkeeping entries based on transaction type
  // For expenses: Debit expense account, Credit checking account (cash decreases)
  // For income: Debit checking account (cash increases), Credit income account
  const entries = data.type === 'expense'
    ? [
        {
          accountId: targetAccount.id,
          entryType: 'debit' as const,
          amount: data.amount,
        },
        {
          accountId: checkingAccount.id,
          entryType: 'credit' as const,
          amount: data.amount,
        },
      ]
    : [
        {
          accountId: checkingAccount.id,
          entryType: 'debit' as const,
          amount: data.amount,
        },
        {
          accountId: targetAccount.id,
          entryType: 'credit' as const,
          amount: data.amount,
        },
      ];

  const transaction = await createTransactionWithEntries(
    userId,
    {
      date: today,
      description: data.description,
      totalAmount: data.type === 'expense' ? `-${data.amount}` : data.amount,
      notes: data.reason || null,
      category: data.category,
      locationName: data.locationName || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      voiceNoteUrl: null,
      reasonAudioUrl: data.reasonAudioUrl || null,
      contentmentLevel: data.contentmentLevel || null,
    },
    entries
  );

  return transaction;
}

// Transaction entry operations
export async function createTransactionEntry(data: InsertTransactionEntry) {
  const [entry] = await db.insert(transactionEntries).values(data).returning();
  return entry;
}

export async function getTransactionEntriesByTransactionId(transactionId: string) {
  return await db.query.transactionEntries.findMany({
    where: eq(transactionEntries.transactionId, transactionId),
  });
}

export async function deleteTransactionEntries(transactionId: string) {
  await db.delete(transactionEntries).where(eq(transactionEntries.transactionId, transactionId));
}

// Budget operations
export async function createBudget(data: InsertBudget) {
  const [budget] = await db.insert(budgets).values(data).returning();
  return budget;
}

export async function getBudgetById(id: string) {
  return await db.query.budgets.findFirst({
    where: eq(budgets.id, id),
  });
}

export async function getBudgetsByUserId(userId: string) {
  return await db.query.budgets.findMany({
    where: eq(budgets.userId, userId),
    orderBy: [desc(budgets.createdAt)],
  });
}

export async function getActiveBudgetsByUserId(userId: string) {
  return await db.query.budgets.findMany({
    where: and(
      eq(budgets.userId, userId),
      eq(budgets.isActive, 1)
    ),
    orderBy: [desc(budgets.createdAt)],
  });
}

export async function updateBudget(id: string, data: Partial<InsertBudget>) {
  const [budget] = await db.update(budgets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(budgets.id, id))
    .returning();
  return budget;
}

export async function deleteBudget(id: string) {
  await db.delete(budgets).where(eq(budgets.id, id));
}

export async function getItemByName(userId: string, name: string) {
  return await db.query.items.findFirst({
    where: and(
      eq(items.userId, userId),
      eq(items.name, name)
    ),
  });
}

export async function createItemFromBudgetItem(userId: string, budgetItem: any) {
  const [item] = await db.insert(items)
    .values({
      userId,
      name: budgetItem.itemName,
      category: budgetItem.category,
      averagePrice: budgetItem.purchased ? budgetItem.actualPrice : budgetItem.estimatedPrice,
      bestPrice: budgetItem.purchased ? budgetItem.actualPrice : budgetItem.estimatedPrice,
      bestLocation: budgetItem.locationName || null,
      lastPurchased: budgetItem.purchaseDate || null,
      purchaseCount: budgetItem.purchased ? 1 : 0,
    })
    .returning();

  // Add price history if item was purchased
  if (budgetItem.purchased && budgetItem.actualPrice) {
    await db.insert(itemPriceHistory).values({
      itemId: item.id,
      price: budgetItem.actualPrice,
      locationName: budgetItem.locationName || null,
      locationLat: budgetItem.locationLat || null,
      locationLon: budgetItem.locationLon || null,
      purchaseDate: budgetItem.purchaseDate || new Date(),
      budgetItemId: budgetItem.id,
    });
  }

  return item;
}

export async function updateItemFromBudgetItem(itemId: string, budgetItem: any) {
  // Get current item
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });

  if (!item) return;

  // Calculate new average price
  const currentAvg = parseFloat(item.averagePrice || "0");
  const newPrice = parseFloat(budgetItem.actualPrice);
  const count = item.purchaseCount;
  const newAvg = ((currentAvg * count) + newPrice) / (count + 1);

  // Update best price if this is lower
  const currentBest = parseFloat(item.bestPrice || "999999");
  const bestPrice = Math.min(currentBest, newPrice).toString();
  const bestLocation = newPrice < currentBest ? budgetItem.locationName : item.bestLocation;

  // Update item
  await db.update(items)
    .set({
      averagePrice: newAvg.toFixed(2),
      bestPrice,
      bestLocation,
      lastPurchased: budgetItem.purchaseDate || new Date(),
      purchaseCount: count + 1,
    })
    .where(eq(items.id, itemId));

  // Add price history
  await db.insert(itemPriceHistory).values({
    itemId,
    price: budgetItem.actualPrice,
    locationName: budgetItem.locationName || null,
    locationLat: budgetItem.locationLat || null,
    locationLon: budgetItem.locationLon || null,
    purchaseDate: budgetItem.purchaseDate || new Date(),
    budgetItemId: budgetItem.id,
  });
}

export async function checkBudgetHasPurchasedItems(budgetId: string): Promise<boolean> {
  const items = await db.query.budgetItems.findMany({
    where: and(
      eq(budgetItems.budgetId, budgetId),
      eq(budgetItems.purchased, true)
    ),
  });
  return items.length > 0;
}

// Goal operations
export async function createGoal(data: InsertGoal) {
  const [goal] = await db.insert(goals).values(data).returning();
  return goal;
}

export async function getGoalById(id: string) {
  return await db.query.goals.findFirst({
    where: eq(goals.id, id),
  });
}

export async function getGoalsByUserId(userId: string) {
  return await db.query.goals.findMany({
    where: eq(goals.userId, userId),
    orderBy: [desc(goals.createdAt)],
  });
}

export async function getActiveGoalsByUserId(userId: string) {
  return await db.query.goals.findMany({
    where: and(
      eq(goals.userId, userId),
      eq(goals.status, 'active')
    ),
    orderBy: [desc(goals.createdAt)],
  });
}

export async function updateGoal(id: string, data: Partial<InsertGoal>) {
  const [goal] = await db.update(goals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(goals.id, id))
    .returning();
  return goal;
}

export async function updateGoalProgress(id: string, currentAmount: string) {
  const [goal] = await db.update(goals)
    .set({ currentAmount, updatedAt: new Date() })
    .where(eq(goals.id, id))
    .returning();
  return goal;
}

export async function deleteGoal(id: string) {
  await db.delete(goals).where(eq(goals.id, id));
}

export async function pauseGoal(id: string) {
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");

  const [updated] = await db.update(goals)
    .set({
      status: 'paused',
      pausedAt: new Date(),
      originalDeadline: goal.deadline || null,
      updatedAt: new Date()
    })
    .where(eq(goals.id, id))
    .returning();
  return updated;
}

export async function resumeGoal(id: string) {
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");

  // Calculate new deadline if there was a pause
  let newDeadline = goal.originalDeadline;
  if (goal.pausedAt && goal.originalDeadline) {
    const pausedDays = Math.floor((Date.now() - new Date(goal.pausedAt).getTime()) / (1000 * 60 * 60 * 24));
    const originalDate = new Date(goal.originalDeadline);
    originalDate.setDate(originalDate.getDate() + pausedDays);
    newDeadline = originalDate.toISOString().split('T')[0];
  }

  const [updated] = await db.update(goals)
    .set({
      status: 'active',
      pausedAt: null,
      deadline: newDeadline,
      updatedAt: new Date()
    })
    .where(eq(goals.id, id))
    .returning();
  return updated;
}

export async function cancelGoal(id: string) {
  const [goal] = await db.update(goals)
    .set({
      status: 'cancelled',
      updatedAt: new Date()
    })
    .where(eq(goals.id, id))
    .returning();
  return goal;
}

export async function addGoalContribution(
  id: string,
  amount: number,
  sourceAccountId?: string,
  notes?: string
) {
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");

  // Determine the source account (provided or default from goal)
  const finalSourceAccountId = sourceAccountId || goal.sourceAccountId;
  if (!finalSourceAccountId) {
    throw new Error("No source account specified for contribution");
  }

  // Verify source account exists and has sufficient balance
  const sourceAccount = await getAccountById(finalSourceAccountId);
  if (!sourceAccount) {
    throw new Error("Source account not found");
  }

  // Verify source account belongs to the same user
  if (sourceAccount.userId !== goal.userId) {
    throw new Error("Source account does not belong to goal owner");
  }

  // Check if source account has sufficient balance (for non-income accounts)
  if (sourceAccount.accountType === 'asset') {
    const sourceBalance = parseFloat(sourceAccount.balance);
    if (sourceBalance < amount) {
      throw new Error(`Insufficient balance in ${sourceAccount.name}. Available: ${sourceBalance.toFixed(2)}, Required: ${amount.toFixed(2)}`);
    }
  }

  // Find or create a goal savings account for this goal
  let goalAccount = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, goal.userId),
      eq(accounts.name, `Goal: ${goal.name}`),
      eq(accounts.accountType, 'asset'),
      eq(accounts.accountCategory, 'savings')
    ),
  });

  if (!goalAccount) {
    // Create a dedicated savings account for this goal
    goalAccount = await createAccount({
      userId: goal.userId,
      name: `Goal: ${goal.name}`,
      accountType: 'asset',
      accountCategory: 'savings',
      balance: '0',
      description: `Savings account for ${goal.name} goal`,
    });
  }

  const currentAmount = parseFloat(goal.currentAmount);
  const targetAmount = parseFloat(goal.targetAmount);
  const newAmount = (currentAmount + amount).toFixed(2);

  const today = new Date().toISOString().split('T')[0];

  // Wrap everything in a database transaction for atomicity
  return await db.transaction(async (tx) => {
    // Create the double-entry accounting transaction
    const [accountingTransaction] = await tx.insert(transactions)
      .values({
        userId: goal.userId,
        date: today,
        description: `Contribution to ${goal.name}`,
        totalAmount: amount.toFixed(2),
        notes: notes || `Goal contribution from ${sourceAccount.name}`,
        category: 'savings_transfer',
      })
      .returning();

    // Create transaction entries (double-entry)
    // Entry 1: Debit goal account (increase savings)
    await tx.insert(transactionEntries).values({
      transactionId: accountingTransaction.id,
      accountId: goalAccount.id,
      entryType: 'debit',
      amount: amount.toFixed(2),
    });

    // Entry 2: Credit source account (decrease cash/checking)
    await tx.insert(transactionEntries).values({
      transactionId: accountingTransaction.id,
      accountId: finalSourceAccountId,
      entryType: 'credit',
      amount: amount.toFixed(2),
    });

    // Update account balances
    // Increase goal account balance
    await tx.update(accounts)
      .set({
        balance: (parseFloat(goalAccount.balance) + amount).toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(accounts.id, goalAccount.id));

    // Decrease source account balance
    await tx.update(accounts)
      .set({
        balance: (parseFloat(sourceAccount.balance) - amount).toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(accounts.id, finalSourceAccountId));

    // Create goal contribution record
    const [contribution] = await tx.insert(goalContributions).values({
      goalId: id,
      amount: amount.toFixed(2),
      actualDate: today,
      scheduledDate: goal.nextScheduledContribution || null,
      sourceAccountId: finalSourceAccountId,
      transactionId: accountingTransaction.id,
      notes: notes || null,
    }).returning();

    // Calculate next scheduled contribution date if applicable
    let nextScheduledContribution = goal.nextScheduledContribution;
    if (goal.contributionFrequency && goal.contributionFrequency !== 'flexible') {
      const nextDate = calculateNextScheduledDate(
        goal.contributionFrequency,
        goal.dayOfWeek,
        goal.dayOfMonth,
        new Date()
      );
      nextScheduledContribution = nextDate ? nextDate.toISOString().split('T')[0] : null;
    }

    // Check for milestone achievements
    const milestones = JSON.parse(goal.milestonesReached || '[]');
    const oldProgress = (currentAmount / targetAmount) * 100;
    const newProgress = (parseFloat(newAmount) / targetAmount) * 100;

    const milestoneThresholds = [10, 25, 40, 60, 75, 90];
    const newMilestones: number[] = [];

    for (const threshold of milestoneThresholds) {
      if (oldProgress < threshold && newProgress >= threshold && !milestones.includes(threshold)) {
        newMilestones.push(threshold);
        milestones.push(threshold);
      }
    }

    // Check if goal is completed
    const isCompleted = parseFloat(newAmount) >= targetAmount;

    // Update goal
    const [updated] = await tx.update(goals)
      .set({
        currentAmount: newAmount,
        milestonesReached: JSON.stringify(milestones),
        status: isCompleted ? 'completed' : goal.status,
        nextScheduledContribution,
        updatedAt: new Date()
      })
      .where(eq(goals.id, id))
      .returning();

    return { goal: updated, contribution, newMilestones, isCompleted, transaction: accountingTransaction };
  });
}

export async function startBoostWeek(id: string) {
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");

  const now = new Date();
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}-${now.getFullYear()}`;

  if (goal.lastBoostWeekQuarter === currentQuarter) {
    throw new Error("Boost week already used this quarter");
  }

  const boostWeekEnds = new Date(now);
  boostWeekEnds.setDate(boostWeekEnds.getDate() + 7);

  const [updated] = await db.update(goals)
    .set({
      boostWeekActive: 1,
      boostWeekStarted: now,
      boostWeekEnds,
      lastBoostWeekQuarter: currentQuarter,
      updatedAt: new Date()
    })
    .where(eq(goals.id, id))
    .returning();
  return updated;
}

export async function endBoostWeek(id: string) {
  const [updated] = await db.update(goals)
    .set({
      boostWeekActive: 0,
      updatedAt: new Date()
    })
    .where(eq(goals.id, id))
    .returning();
  return updated;
}

export async function cloneGoal(id: string, multiplier: number = 1) {
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");

  const targetAmount = (parseFloat(goal.targetAmount) * multiplier).toFixed(2);
  const monthlyContribution = goal.monthlyContribution
    ? (parseFloat(goal.monthlyContribution) * multiplier).toFixed(2)
    : null;

  // Calculate new deadline based on original timeline
  let newDeadline = null;
  if (goal.deadline) {
    const now = new Date();
    const originalCreated = new Date(goal.createdAt);
    const originalDeadline = new Date(goal.deadline);
    const monthsToComplete = Math.ceil((originalDeadline.getTime() - originalCreated.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const futureDate = new Date(now);
    futureDate.setMonth(futureDate.getMonth() + monthsToComplete);
    newDeadline = futureDate.toISOString().split('T')[0];
  }

  const [cloned] = await db.insert(goals).values({
    userId: goal.userId,
    name: multiplier === 1 ? `${goal.name} (continued)` : `${goal.name} (${multiplier}x)`,
    targetAmount,
    currentAmount: "0",
    deadline: newDeadline,
    status: 'active',
    description: goal.description,
    why: goal.why,
    category: goal.category,
    monthlyContribution,
    clonedFromId: goal.id,
    progressUnit: goal.progressUnit,
    milestonesReached: "[]"
  }).returning();

  return cloned;
}

// Goal Contributions operations
export async function getGoalContributions(goalId: string) {
  return await db.query.goalContributions.findMany({
    where: eq(goalContributions.goalId, goalId),
    orderBy: [desc(goalContributions.actualDate)],
  });
}

export async function createGoalContribution(data: InsertGoalContribution) {
  const [contribution] = await db.insert(goalContributions).values(data).returning();
  return contribution;
}

// Savings Recommendations operations
export async function getSavingsRecommendationsByUserId(userId: string) {
  return await db.query.savingsRecommendations.findMany({
    where: eq(savingsRecommendations.userId, userId),
    orderBy: [desc(savingsRecommendations.createdAt)],
  });
}

export async function createSavingsRecommendation(userId: string, data: any) {
  const [rec] = await db.insert(savingsRecommendations)
    .values({ userId, ...data })
    .returning();
  return rec;
}

// Analytics and reporting
export async function getAccountBalanceSum(userId: string, accountType: 'asset' | 'liability' | 'income' | 'expense') {
  const result = await db
    .select({ total: sql<string>`sum(${accounts.balance})` })
    .from(accounts)
    .where(and(
      eq(accounts.userId, userId),
      sql`${accounts.accountType} = ${accountType}`,
      eq(accounts.isActive, 1)
    ));
  return result[0]?.total || "0";
}

export async function getTotalAssets(userId: string) {
  return await getAccountBalanceSum(userId, 'asset');
}

export async function getTotalLiabilities(userId: string) {
  return await getAccountBalanceSum(userId, 'liability');
}

export async function getNetWorth(userId: string) {
  const assets = parseFloat(await getTotalAssets(userId));
  const liabilities = parseFloat(await getTotalLiabilities(userId));
  return (assets - liabilities).toFixed(2);
}

export async function getCategorySpending(
  userId: string,
  category: string | undefined,
  startDate: string,
  endDate: string
) {
  // If a specific category is provided, return total for that category
  if (category) {
    const categoryTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ),
    });
    const total = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    return total;
  }

  // Otherwise, return spending grouped by category (account category)
  const entries = await db
    .select({
      accountId: transactionEntries.accountId,
      accountCategory: accounts.accountCategory,
      amount: transactionEntries.amount,
      entryType: transactionEntries.entryType,
    })
    .from(transactionEntries)
    .innerJoin(transactions, eq(transactionEntries.transactionId, transactions.id))
    .innerJoin(accounts, eq(transactionEntries.accountId, accounts.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(accounts.accountType, 'expense'), // Only expense accounts
        eq(transactionEntries.entryType, 'debit'), // Expenses increase with debits
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  // Group by category
  const categoryTotals: Record<string, number> = {};
  entries.forEach(entry => {
    const category = entry.accountCategory;
    const amount = parseFloat(entry.amount);
    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }
    categoryTotals[category] += amount;
  });

  // Convert to array format
  return Object.entries(categoryTotals).map(([category, total]) => ({
    category,
    total
  }));
}

export async function getBudgetSpending(
  userId: string,
  budgetId: string,
  startDate: string,
  endDate: string
) {
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, budgetId), eq(budgets.userId, userId)),
  });

  if (!budget) return null;

  // Get expense accounts matching the budget category
  const expenseAccounts = await db.query.accounts.findMany({
    where: and(
      eq(accounts.userId, userId),
      eq(accounts.accountCategory, budget.category),
      eq(accounts.accountType, 'expense')
    ),
  });

  if (expenseAccounts.length === 0) {
    return {
      budget,
      spent: 0,
      remaining: parseFloat(budget.allocatedAmount),
      percentage: 0,
    };
  }

  const accountIds = expenseAccounts.map(a => a.id);

  // Query transaction entries for these expense accounts within the date range
  const entries = await db
    .select({
      amount: transactionEntries.amount,
      transactionDate: transactions.date,
    })
    .from(transactionEntries)
    .innerJoin(transactions, eq(transactionEntries.transactionId, transactions.id))
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactionEntries.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        eq(transactionEntries.entryType, 'debit'),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  const spent = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const budgetAmount = parseFloat(budget.allocatedAmount);

  return {
    budget,
    spent,
    remaining: budgetAmount - spent,
    percentage: budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0,
  };
}

// ===== DEBT OPERATIONS =====
export async function createDebt(data: any) {
  const [debt] = await db.insert(debts).values(data).returning();
  return debt;
}

export async function getDebtById(id: string) {
  return await db.query.debts.findFirst({
    where: eq(debts.id, id),
    with: {
      payments: true,
    },
  });
}

export async function getDebtsByUserId(userId: string) {
  return await db.query.debts.findMany({
    where: eq(debts.userId, userId),
    orderBy: [desc(debts.createdAt)],
    with: {
      payments: true,
    },
  });
}

export async function getActiveDebtsByUserId(userId: string) {
  return await db.query.debts.findMany({
    where: and(
      eq(debts.userId, userId),
      eq(debts.isActive, true)
    ),
    orderBy: [desc(debts.createdAt)],
    with: {
      payments: true,
    },
  });
}

export async function updateDebt(id: string, data: any) {
  const [debt] = await db.update(debts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(debts.id, id))
    .returning();
  return debt;
}

export async function deleteDebt(id: string) {
  await db.delete(debts).where(eq(debts.id, id));
}

export async function createDebtPayment(data: any) {
  const [payment] = await db.insert(debtPayments).values(data).returning();
  return payment;
}

export async function getDebtPaymentsByDebtId(debtId: string) {
  return await db.query.debtPayments.findMany({
    where: eq(debtPayments.debtId, debtId),
    orderBy: [desc(debtPayments.paymentDate)],
  });
}

// ===== RECURRING INCOME OPERATIONS =====
export async function createRecurringIncome(data: any) {
  const [income] = await db.insert(recurringIncome).values(data).returning();
  return income;
}

export async function getRecurringIncomeById(id: string) {
  return await db.query.recurringIncome.findFirst({
    where: eq(recurringIncome.id, id),
  });
}

export async function getRecurringIncomeByUserId(userId: string) {
  return await db.query.recurringIncome.findMany({
    where: eq(recurringIncome.userId, userId),
    orderBy: [desc(recurringIncome.createdAt)],
  });
}

export async function getActiveRecurringIncomeByUserId(userId: string) {
  return await db.query.recurringIncome.findMany({
    where: and(
      eq(recurringIncome.userId, userId),
      eq(recurringIncome.isActive, true)
    ),
    orderBy: [desc(recurringIncome.createdAt)],
  });
}

export async function updateRecurringIncome(id: string, data: any) {
  const [income] = await db.update(recurringIncome)
    .set(data)
    .where(eq(recurringIncome.id, id))
    .returning();
  return income;
}

export async function deleteRecurringIncome(id: string) {
  await db.delete(recurringIncome).where(eq(recurringIncome.id, id));
}

export async function getUpcomingRecurringIncome(userId: string, daysAhead: number = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const allIncome = await getActiveRecurringIncomeByUserId(userId);
  const upcoming: any[] = [];

  allIncome.forEach(income => {
    const nextDate = calculateNextIncomeDate(income, today);
    if (nextDate && nextDate <= futureDate) {
      upcoming.push({
        ...income,
        nextDate: nextDate.toISOString().split('T')[0],
      });
    }
  });

  return upcoming;
}

function calculateNextIncomeDate(income: any, fromDate: Date): Date | null {
  const frequency = income.frequency;
  const today = fromDate;

  if (frequency === 'weekly' && income.dayOfWeek !== null) {
    const daysUntil = (income.dayOfWeek - today.getDay() + 7) % 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    return nextDate;
  } else if (frequency === 'monthly' && income.dayOfMonth !== null) {
    const nextDate = new Date(today.getFullYear(), today.getMonth(), income.dayOfMonth);
    if (nextDate < today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
  } else if (frequency === 'yearly' && income.monthOfYear !== null && income.dayOfMonth !== null) {
    const nextDate = new Date(today.getFullYear(), income.monthOfYear - 1, income.dayOfMonth);
    if (nextDate < today) {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    return nextDate;
  }

  return null;
}

// ===== LEARNING CENTER OPERATIONS =====

// Lesson operations
export async function createLesson(data: InsertLesson) {
  const [lesson] = await db.insert(lessons).values(data).returning();
  return lesson;
}

export async function getLessonById(id: string) {
  return await db.query.lessons.findFirst({
    where: eq(lessons.id, id),
  });
}

export async function getLessonBySlug(slug: string) {
  return await db.query.lessons.findFirst({
    where: eq(lessons.slug, slug),
  });
}

export async function getAllLessons() {
  return await db.query.lessons.findMany({
    where: eq(lessons.isPublished, 1),
    orderBy: [lessons.orderIndex],
  });
}

export async function getLessonsByCategory(category: string) {
  return await db.query.lessons.findMany({
    where: and(
      eq(lessons.category, category),
      eq(lessons.isPublished, 1)
    ),
    orderBy: [lessons.orderIndex],
  });
}

export async function updateLesson(id: string, data: Partial<InsertLesson>) {
  const [lesson] = await db.update(lessons)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(lessons.id, id))
    .returning();
  return lesson;
}

export async function deleteLesson(id: string) {
  await db.delete(lessons).where(eq(lessons.id, id));
}

// User lesson progress operations
export async function createOrUpdateLessonProgress(data: InsertUserLessonProgress) {
  // Try to find existing progress
  const existing = await db.query.userLessonProgress.findFirst({
    where: and(
      eq(userLessonProgress.userId, data.userId),
      eq(userLessonProgress.lessonId, data.lessonId)
    ),
  });

  if (existing) {
    // Update existing progress
    const [updated] = await db.update(userLessonProgress)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userLessonProgress.id, existing.id))
      .returning();
    return updated;
  } else {
    // Create new progress
    const [created] = await db.insert(userLessonProgress).values(data).returning();
    return created;
  }
}

export async function getUserLessonProgress(userId: string, lessonId: string) {
  return await db.query.userLessonProgress.findFirst({
    where: and(
      eq(userLessonProgress.userId, userId),
      eq(userLessonProgress.lessonId, lessonId)
    ),
  });
}

export async function getAllUserProgress(userId: string) {
  return await db.query.userLessonProgress.findMany({
    where: eq(userLessonProgress.userId, userId),
    with: {
      lesson: true,
    },
  });
}

// Quiz question operations
export async function createQuizQuestion(data: InsertQuizQuestion) {
  const [question] = await db.insert(quizQuestions).values(data).returning();
  return question;
}

export async function getQuizQuestionsByLesson(lessonId: string) {
  return await db.query.quizQuestions.findMany({
    where: eq(quizQuestions.lessonId, lessonId),
    orderBy: [quizQuestions.orderIndex],
  });
}

export async function deleteQuizQuestion(id: string) {
  await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
}

// Quiz result operations
export async function createQuizResult(data: InsertQuizResult) {
  const [result] = await db.insert(quizResults).values(data).returning();
  return result;
}

export async function getUserQuizResults(userId: string, lessonId: string) {
  return await db.query.quizResults.findMany({
    where: and(
      eq(quizResults.userId, userId),
      eq(quizResults.lessonId, lessonId)
    ),
    orderBy: [desc(quizResults.completedAt)],
  });
}

export async function getAllUserQuizResults(userId: string) {
  return await db.query.quizResults.findMany({
    where: eq(quizResults.userId, userId),
    orderBy: [desc(quizResults.completedAt)],
    with: {
      lesson: true,
    },
  });
}

// ===== BUDGET CATEGORY OPERATIONS =====

export async function createBudgetCategory(data: InsertBudgetCategory) {
  const [category] = await db.insert(budgetCategories).values(data).returning();
  return category;
}

export async function getBudgetCategoriesByBudgetId(budgetId: string) {
  return await db.query.budgetCategories.findMany({
    where: eq(budgetCategories.budgetId, budgetId),
  });
}

export async function deleteBudgetCategories(budgetId: string) {
  await db.delete(budgetCategories).where(eq(budgetCategories.budgetId, budgetId));
}

// ===== BUDGET ITEM OPERATIONS =====

export async function createBudgetItem(data: InsertBudgetItem) {
  const [item] = await db.insert(budgetItems).values(data).returning();
  return item;
}

export async function getBudgetItemById(id: string) {
  return await db.query.budgetItems.findFirst({
    where: eq(budgetItems.id, id),
  });
}

export async function getBudgetItemsByBudgetId(budgetId: string) {
  return await db.query.budgetItems.findMany({
    where: eq(budgetItems.budgetId, budgetId),
    orderBy: [budgetItems.category, budgetItems.itemName],
  });
}

export async function updateBudgetItem(id: string, data: Partial<InsertBudgetItem> & { quantityPurchased?: string }) {
  const [item] = await db.update(budgetItems)
    .set(data)
    .where(eq(budgetItems.id, id))
    .returning();
  return item;
}

export async function deleteBudgetItem(id: string) {
  await db.delete(budgetItems).where(eq(budgetItems.id, id));
}

export async function markBudgetItemPurchased(
  id: string,
  actualPrice: string,
  purchaseDate: Date,
  location?: { lat: string; lon: string; name: string }
) {
  const [item] = await db.update(budgetItems)
    .set({
      purchased: true,
      actualPrice,
      purchaseDate,
      locationLat: location?.lat,
      locationLon: location?.lon,
      locationName: location?.name,
    })
    .where(eq(budgetItems.id, id))
    .returning();
  return item;
}

// ===== BUDGET TEMPLATE OPERATIONS =====

export async function createBudgetTemplate(userId: string, name: string, categories: string[]) {
  const [template] = await db.insert(budgetTemplates)
    .values({
      userId,
      name,
      categories,
    })
    .returning();
  return template;
}

export async function getBudgetTemplateById(id: number) {
  return await db.query.budgetTemplates.findFirst({
    where: eq(budgetTemplates.id, id),
    with: {
      templateItems: true,
    },
  });
}

export async function getBudgetTemplatesByUserId(userId: string) {
  return await db.query.budgetTemplates.findMany({
    where: eq(budgetTemplates.userId, userId),
    orderBy: [desc(budgetTemplates.usageCount), desc(budgetTemplates.createdAt)],
    with: {
      templateItems: true,
    },
  });
}

export async function incrementTemplateUsageCount(templateId: number) {
  const [template] = await db.update(budgetTemplates)
    .set({
      usageCount: sql`${budgetTemplates.usageCount} + 1`,
    })
    .where(eq(budgetTemplates.id, templateId))
    .returning();
  return template;
}

export async function deleteBudgetTemplate(id: number) {
  await db.delete(budgetTemplates).where(eq(budgetTemplates.id, id));
}

// ===== BUDGET TEMPLATE ITEM OPERATIONS =====

export async function createBudgetTemplateItem(data: InsertBudgetTemplateItem) {
  const [item] = await db.insert(budgetTemplateItems).values(data).returning();
  return item;
}

export async function getBudgetTemplateItems(templateId: string) {
  return await db.query.budgetTemplateItems.findMany({
    where: eq(budgetTemplateItems.templateId, templateId),
    orderBy: [budgetTemplateItems.category, budgetTemplateItems.itemName],
  });
}

export async function deleteBudgetTemplateItems(templateId: string) {
  await db.delete(budgetTemplateItems).where(eq(budgetTemplateItems.templateId, templateId));
}

// ===== MASTER ITEM LIST OPERATIONS =====

export async function createItem(data: InsertItem) {
  const [item] = await db.insert(items).values(data).returning();
  return item;
}

export async function getItemById(id: string) {
  return await db.query.items.findFirst({
    where: eq(items.id, id),
    with: {
      priceHistory: {
        orderBy: [desc(itemPriceHistory.purchaseDate)],
        limit: 10,
      },
    },
  });
}

export async function getItemsByUserId(userId: string) {
  return await db.query.items.findMany({
    where: eq(items.userId, userId),
    orderBy: [desc(items.purchaseCount), desc(items.lastPurchased)],
  });
}

export async function searchItems(userId: string, query: string) {
  const searchTerm = `%${query}%`;

  return await db.query.items.findMany({
    where: and(
      eq(items.userId, userId),
      or(
        ilike(items.name, searchTerm),
        sql`EXISTS (
          SELECT 1 FROM unnest(${items.aliases}) AS alias
          WHERE alias ILIKE ${searchTerm}
        )`
      )
    ),
    orderBy: [desc(items.purchaseCount), items.name],
  });
}

export async function updateItem(id: string, data: Partial<InsertItem>) {
  const [item] = await db.update(items)
    .set(data)
    .where(eq(items.id, id))
    .returning();
  return item;
}

export async function deleteItem(id: string) {
  await db.delete(items).where(eq(items.id, id));
}

export async function updateItemPrices(itemId: string, newPrice: string, location?: string) {
  const item = await getItemById(itemId);
  if (!item) throw new Error('Item not found');

  const currentBestPrice = item.bestPrice ? parseFloat(item.bestPrice) : Infinity;
  const newPriceNum = parseFloat(newPrice);

  const updates: Partial<InsertItem> = {
    lastPurchased: new Date(),
    purchaseCount: item.purchaseCount + 1,
  };

  if (newPriceNum < currentBestPrice) {
    updates.bestPrice = newPrice;
    updates.bestLocation = location || item.bestLocation;
  }

  // Calculate new average price
  const history = await getItemPriceHistory(itemId);
  const allPrices = [...history.map(h => parseFloat(h.price)), newPriceNum];
  const avgPrice = (allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(2);
  updates.averagePrice = avgPrice;

  return await updateItem(itemId, updates);
}

// ===== ITEM PRICE HISTORY OPERATIONS =====

export async function createItemPriceHistory(data: InsertItemPriceHistory) {
  const [history] = await db.insert(itemPriceHistory).values(data).returning();
  return history;
}

export async function getItemPriceHistory(itemId: string) {
  return await db.query.itemPriceHistory.findMany({
    where: eq(itemPriceHistory.itemId, itemId),
    orderBy: [desc(itemPriceHistory.purchaseDate)],
  });
}

export async function deleteItemPriceHistory(itemId: string) {
  await db.delete(itemPriceHistory).where(eq(itemPriceHistory.itemId, itemId));
}

// ===== ENHANCED BUDGET CREATION =====

export async function createBudgetWithItems(
  userId: string,
  budgetData: InsertBudget,
  categories: Array<{ category: string; allocatedAmount: string }>,
  itemsList: Array<InsertBudgetItem>
) {
  // Create the budget
  const budget = await createBudget({ ...budgetData, userId });

  // Create budget categories
  for (const cat of categories) {
    await createBudgetCategory({
      budgetId: budget.id,
      category: cat.category,
      allocatedAmount: cat.allocatedAmount,
    });
  }

  // Create budget items
  const createdItems = [];
  for (const itemData of itemsList) {
    const item = await createBudgetItem({
      ...itemData,
      budgetId: budget.id,
    });
    createdItems.push(item);
  }

  return {
    budget,
    categories: await getBudgetCategoriesByBudgetId(budget.id),
    items: createdItems,
  };
}

// ===== CATEGORY OVERRIDE OPERATIONS (NLP Learning) =====

// Normalize description for consistent matching
function normalizeDescription(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function getCategoryOverride(
  userId: string,
  description: string,
  transactionType: 'income' | 'expense'
) {
  const normalized = normalizeDescription(description);
  return await db.query.categoryOverrides.findFirst({
    where: and(
      eq(categoryOverrides.userId, userId),
      eq(categoryOverrides.normalizedDescription, normalized),
      eq(categoryOverrides.transactionType, transactionType)
    ),
  });
}

export async function createOrUpdateCategoryOverride(
  userId: string,
  description: string,
  transactionType: 'income' | 'expense',
  suggestedCategory: string,
  userSelectedCategory: string
) {
  const normalized = normalizeDescription(description);

  // Check if override already exists
  const existing = await getCategoryOverride(userId, description, transactionType);

  if (existing) {
    // Update existing override and increment count
    const [updated] = await db
      .update(categoryOverrides)
      .set({
        userSelectedCategory,
        overrideCount: existing.overrideCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(categoryOverrides.id, existing.id))
      .returning();
    return updated;
  } else {
    // Create new override
    const [created] = await db
      .insert(categoryOverrides)
      .values({
        userId,
        originalDescription: description,
        normalizedDescription: normalized,
        transactionType,
        suggestedCategory,
        userSelectedCategory,
        overrideCount: 1,
      })
      .returning();
    return created;
  }
}
// ===== USER STREAKS OPERATIONS =====

export async function getUserStreak(userId: string) {
  return await db.query.userStreaks.findFirst({
    where: eq(userStreaks.userId, userId),
  });
}

export async function updateUserStreak(userId: string, isInBudgetToday: boolean) {
  const today = new Date().toISOString().split('T')[0];
  const existing = await getUserStreak(userId);

  if (!existing) {
    // Create new streak record
    const [created] = await db.insert(userStreaks).values({
      userId,
      currentStreak: isInBudgetToday ? 1 : 0,
      longestStreak: isInBudgetToday ? 1 : 0,
      lastBudgetCheckDate: today,
      totalDaysInBudget: isInBudgetToday ? 1 : 0,
    }).returning();
    return created;
  }

  // Check if we've already checked today
  if (existing.lastBudgetCheckDate === today) {
    return existing;
  }

  // Calculate new values
  let newCurrentStreak = existing.currentStreak;
  let newTotalDays = existing.totalDaysInBudget;

  if (isInBudgetToday) {
    newCurrentStreak = existing.currentStreak + 1;
    newTotalDays = existing.totalDaysInBudget + 1;
  } else {
    newCurrentStreak = 0;
  }

  const newLongestStreak = Math.max(existing.longestStreak, newCurrentStreak);

  const [updated] = await db
    .update(userStreaks)
    .set({
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      totalDaysInBudget: newTotalDays,
      lastBudgetCheckDate: today,
      updatedAt: new Date(),
    })
    .where(eq(userStreaks.userId, userId))
    .returning();

  return updated;
}

// ===== Quick Deal Monthly Account Methods =====

export async function getQuickDealMonthlyAccount(userId: string, month: string) {
  const result = await db.query.quickDealMonthlyAccounts.findFirst({
    where: and(
      eq(quickDealMonthlyAccounts.userId, userId),
      eq(quickDealMonthlyAccounts.month, month)
    )
  });
  return result;
}

export async function setQuickDealMonthlyAccount(userId: string, accountId: string, month: string) {
  // Delete existing if any
  await db.delete(quickDealMonthlyAccounts)
    .where(and(
      eq(quickDealMonthlyAccounts.userId, userId),
      eq(quickDealMonthlyAccounts.month, month)
    ));

  // Insert new
  const [newEntry] = await db.insert(quickDealMonthlyAccounts)
    .values({
      userId,
      accountId,
      month
    })
    .returning();

  return newEntry;
}

// ============= Recurring Income Methods =============

// The rest of the original file content follows here...