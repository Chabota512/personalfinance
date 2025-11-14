
import { db } from "./db";
import { transactions, recurringIncome, cashFlowForecasts, budgets } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

interface OverdraftPrediction {
  willOverdraft: boolean;
  daysUntilOverdraft: number;
  predictedBalance: number;
  suggestions: Array<{
    type: 'transfer' | 'defer' | 'reduce';
    description: string;
    amount?: number;
  }>;
}

export async function predictOverdraft(userId: string): Promise<OverdraftPrediction> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Get current balance
  const recentTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: desc(transactions.date),
    limit: 100,
  });

  let currentBalance = 0;
  recentTransactions.forEach(t => {
    currentBalance += parseFloat(t.totalAmount);
  });

  // Get upcoming bills (next 3 days)
  const upcomingExpenses = await db.query.cashFlowForecasts.findMany({
    where: and(
      eq(cashFlowForecasts.userId, userId),
      gte(cashFlowForecasts.date, now.toISOString().split('T')[0]),
      lte(cashFlowForecasts.date, threeDaysFromNow.toISOString().split('T')[0]),
      eq(cashFlowForecasts.type, 'expense')
    ),
  });

  // Get upcoming income
  const upcomingIncome = await db.query.cashFlowForecasts.findMany({
    where: and(
      eq(cashFlowForecasts.userId, userId),
      gte(cashFlowForecasts.date, now.toISOString().split('T')[0]),
      lte(cashFlowForecasts.date, threeDaysFromNow.toISOString().split('T')[0]),
      eq(cashFlowForecasts.type, 'income')
    ),
  });

  const totalUpcomingExpenses = upcomingExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalUpcomingIncome = upcomingIncome.reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const predictedBalance = currentBalance + totalUpcomingIncome - totalUpcomingExpenses;
  const willOverdraft = predictedBalance < 0;

  const suggestions = [];
  if (willOverdraft) {
    const shortfall = Math.abs(predictedBalance);
    
    suggestions.push({
      type: 'transfer' as const,
      description: `Transfer ${formatCurrency(shortfall)} from savings to checking`,
      amount: shortfall,
    });

    suggestions.push({
      type: 'defer' as const,
      description: 'Defer non-essential purchases until next payday',
    });

    suggestions.push({
      type: 'reduce' as const,
      description: 'Reduce discretionary spending by 50% for 3 days',
      amount: shortfall / 2,
    });
  }

  return {
    willOverdraft,
    daysUntilOverdraft: willOverdraft ? 3 : 0,
    predictedBalance,
    suggestions,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
