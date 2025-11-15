
import { db } from "./db";
import { accounts, budgets, goals } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createSimpleTransaction } from "./storage";

export async function seedSampleData(userId: string, createdAccounts?: any[]) {
  // Check if user already has data (only if accounts not provided)
  if (!createdAccounts) {
    const existingAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
    
    if (existingAccounts.length > 0) {
      console.log("User already has data, skipping sample data seed");
      return;
    }
  }

  console.log("Seeding sample data for user:", userId);

  // Use provided accounts or create new ones
  let checkingAccount, savingsAccount, creditCard, salaryIncome, groceriesExpense, transportExpense, entertainmentExpense;

  if (createdAccounts && createdAccounts.length >= 4) {
    checkingAccount = createdAccounts[1]; // Checking Account
    savingsAccount = createdAccounts[2]; // Savings Account
    creditCard = createdAccounts[3]; // Credit Card
    
    // Create income and expense accounts
    [salaryIncome] = await db.insert(accounts).values({
      userId,
      name: "Salary Income",
      accountType: "income",
      accountCategory: "salary",
      balance: "0",
    }).returning();

    [groceriesExpense] = await db.insert(accounts).values({
      userId,
      name: "Groceries",
      accountType: "expense",
      accountCategory: "food",
      balance: "0",
    }).returning();

    [transportExpense] = await db.insert(accounts).values({
      userId,
      name: "Transportation",
      accountType: "expense",
      accountCategory: "transportation",
      balance: "0",
    }).returning();

    [entertainmentExpense] = await db.insert(accounts).values({
      userId,
      name: "Entertainment",
      accountType: "expense",
      accountCategory: "entertainment",
      balance: "0",
    }).returning();
  } else {
    // Create all accounts from scratch
    [checkingAccount] = await db.insert(accounts).values({
      userId,
      name: "Sample Checking Account",
      accountType: "asset",
      accountCategory: "checking",
      balance: "2500.00",
      description: "Your main checking account",
    }).returning();

    [savingsAccount] = await db.insert(accounts).values({
      userId,
      name: "Sample Savings Account",
      accountType: "asset",
      accountCategory: "savings",
      balance: "5000.00",
      description: "Emergency fund and savings",
    }).returning();

    [creditCard] = await db.insert(accounts).values({
      userId,
      name: "Sample Credit Card",
      accountType: "liability",
      accountCategory: "credit_card",
      balance: "-450.00",
      description: "Credit card balance",
    }).returning();

    [salaryIncome] = await db.insert(accounts).values({
      userId,
      name: "Salary Income",
      accountType: "income",
      accountCategory: "salary",
      balance: "0",
    }).returning();

    [groceriesExpense] = await db.insert(accounts).values({
      userId,
      name: "Groceries",
      accountType: "expense",
      accountCategory: "food",
      balance: "0",
    }).returning();

    [transportExpense] = await db.insert(accounts).values({
      userId,
      name: "Transportation",
      accountType: "expense",
      accountCategory: "transportation",
      balance: "0",
    }).returning();

    [entertainmentExpense] = await db.insert(accounts).values({
      userId,
      name: "Entertainment",
      accountType: "expense",
      accountCategory: "entertainment",
      balance: "0",
    }).returning();
  }

  // Create sample transactions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Salary deposit - income transaction
  await createSimpleTransaction(userId, {
    accountId: checkingAccount.id,
    transactionType: 'income',
    date: thirtyDaysAgo.toISOString().split('T')[0],
    description: "Monthly Salary",
    totalAmount: "3000.00",
    notes: "Sample monthly income",
  });

  // Grocery purchase - expense transaction
  await createSimpleTransaction(userId, {
    accountId: checkingAccount.id,
    transactionType: 'expense',
    date: fifteenDaysAgo.toISOString().split('T')[0],
    description: "Weekly Groceries",
    totalAmount: "125.50",
    category: "food",
  });

  // Transportation - expense transaction
  await createSimpleTransaction(userId, {
    accountId: creditCard.id,
    transactionType: 'expense',
    date: sevenDaysAgo.toISOString().split('T')[0],
    description: "Gas Station",
    totalAmount: "45.00",
    category: "transportation",
  });

  // Entertainment - expense transaction
  await createSimpleTransaction(userId, {
    accountId: checkingAccount.id,
    transactionType: 'expense',
    date: threeDaysAgo.toISOString().split('T')[0],
    description: "Movie Tickets",
    totalAmount: "28.00",
    category: "entertainment",
  });

  // Create sample budgets
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  await db.insert(budgets).values([
    {
      userId,
      title: "Monthly Food Budget",
      category: "food",
      allocatedAmount: "400.00",
      period: "monthly",
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    },
    {
      userId,
      title: "Monthly Transportation Budget",
      category: "transportation",
      allocatedAmount: "200.00",
      period: "monthly",
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    },
    {
      userId,
      title: "Monthly Entertainment Budget",
      category: "entertainment",
      allocatedAmount: "150.00",
      period: "monthly",
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    },
  ]);

  // Create sample goals
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  await db.insert(goals).values([
    {
      userId,
      name: "Emergency Fund",
      targetAmount: "10000.00",
      currentAmount: "5000.00",
      deadline: sixMonthsFromNow.toISOString().split('T')[0],
      status: "active",
      description: "Build a 6-month emergency fund",
    },
    {
      userId,
      name: "Vacation Fund",
      targetAmount: "2000.00",
      currentAmount: "450.00",
      deadline: oneYearFromNow.toISOString().split('T')[0],
      status: "active",
      description: "Save for summer vacation",
    },
  ]);

  console.log("Sample data seeded successfully!");
}
