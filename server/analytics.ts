
import { generateInsights } from './ai-insights';

async function calculateAIHealthScore(
  userId: string, 
  ratios: any, 
  userBudgets: any[], 
  userTransactions: any[]
): Promise<any | null> {
  // Only use AI if we have API key configured
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Gather behavioral patterns
    const last90Days = userTransactions.filter(t => {
      const transDate = new Date(t.date);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return transDate >= ninetyDaysAgo;
    });

    // Calculate trend (improving vs declining)
    const last30Days = last90Days.filter(t => {
      const transDate = new Date(t.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return transDate >= thirtyDaysAgo;
    });

    const previous30Days = last90Days.filter(t => {
      const transDate = new Date(t.date);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return transDate >= sixtyDaysAgo && transDate < thirtyDaysAgo;
    });

    const last30Spending = last30Days
      .filter(t => parseFloat(t.totalAmount) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
    
    const prev30Spending = previous30Days
      .filter(t => parseFloat(t.totalAmount) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);

    const spendingTrend = prev30Spending > 0 
      ? ((last30Spending - prev30Spending) / prev30Spending) * 100 
      : 0;

    // Build AI prompt for scoring
    const isGemini = process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY;
    const isGroq = process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY;
    
    if (isGemini) {
      // Use Gemini API via existing helper
      const { generateFinancialInsights } = await import('./gemini-ai');
      // Gemini implementation would go here - for now fall through to OpenAI/Groq
    }
    
    const apiUrl = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const prompt = `You are a financial health analyst. Calculate a personalized financial health score (0-100) based on this user's data and habits.

USER FINANCIAL DATA:
- Monthly Income: $${ratios.monthlyIncome.toFixed(2)}
- Monthly Expenses: $${ratios.monthlyExpenses.toFixed(2)}
- Savings Rate: ${ratios.savingsRate.toFixed(1)}%
- Net Worth: $${ratios.netWorth.toFixed(2)}
- Debt-to-Income Ratio: ${ratios.debtToIncomeRatio.toFixed(1)}%
- Active Budgets: ${userBudgets.length}
- Transactions (last 90 days): ${last90Days.length}
- Spending Trend: ${spendingTrend >= 0 ? '+' : ''}${spendingTrend.toFixed(1)}% vs previous month

SCORING INSTRUCTIONS:
1. Consider the user's current stage (starting out, building, established)
2. Reward positive trends even if absolute numbers are low
3. Penalize declining trends even if absolute numbers look good
4. Be more lenient with new users (few transactions)
5. Weight factors dynamically based on what matters most for THIS user

Return ONLY a JSON object with this structure:
{
  "score": <number 0-100>,
  "grade": "<Excellent|Good|Fair|Needs Improvement>",
  "reasoning": "<2-3 sentence explanation of the score>",
  "keyStrengths": ["<strength 1>", "<strength 2>"],
  "keyWeaknesses": ["<weakness 1>", "<weakness 2>"]
}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst. Return only valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI scoring API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        apiUrl,
        hasApiKey: !!apiKey
      });
      return null;
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Parse JSON response (handle markdown code blocks if present)
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/```\n?/g, '');
    }
    
    const aiResult = JSON.parse(content);
    const score = Math.round(aiResult.score);

    // Calculate component scores for backward compatibility
    const savingsScore = Math.max(0, Math.min(100, ratios.savingsRate * 5));
    const budgetScore = userBudgets.length > 0 ? 75 : 50;
    const debtScore = Math.max(0, 100 - ratios.debtToIncomeRatio);
    const netWorthScore = ratios.netWorth > 0 ? Math.min(100, (ratios.netWorth / 10000) * 100) : 0;
    
    const monthsOfExpenses = ratios.monthlyExpenses > 0 ? ratios.netWorth / ratios.monthlyExpenses : 0;
    const balanceSheet = await getBalanceSheet(userId);

    // Generate AI insights
    const insights = await generateInsights({
      savingsScore,
      savingsRate: ratios.savingsRate,
      budgetScore,
      budgetCount: userBudgets.length,
      debtScore,
      debtRatio: ratios.debtToIncomeRatio,
      emergencyScore: netWorthScore,
      emergencyMonths: monthsOfExpenses,
      monthlyIncome: ratios.monthlyIncome,
      monthlyExpenses: ratios.monthlyExpenses,
      netWorth: ratios.netWorth,
      totalDebt: balanceSheet.liabilities,
      grade: aiResult.grade,
      score,
    }, userId);

    return {
      score,
      grade: aiResult.grade,
      explanation: aiResult.reasoning,
      factors: [
        {
          name: 'Savings Rate',
          score: savingsScore,
          weight: 0.3,
          currentValue: `${ratios.savingsRate.toFixed(1)}%`,
          explanation: insights.factorInsights[0].explanation,
          suggestion: insights.factorInsights[0].suggestion,
        },
        {
          name: 'Budget Planning',
          score: budgetScore,
          weight: 0.25,
          currentValue: `${userBudgets.length} active ${userBudgets.length === 1 ? 'budget' : 'budgets'}`,
          explanation: insights.factorInsights[1].explanation,
          suggestion: insights.factorInsights[1].suggestion,
        },
        {
          name: 'Debt Management',
          score: debtScore,
          weight: 0.25,
          currentValue: ratios.debtToIncomeRatio > 0 ? `${ratios.debtToIncomeRatio.toFixed(1)}% debt-to-income` : 'No debt',
          explanation: insights.factorInsights[2].explanation,
          suggestion: insights.factorInsights[2].suggestion,
        },
        {
          name: 'Emergency Fund',
          score: netWorthScore,
          weight: 0.2,
          currentValue: `${monthsOfExpenses.toFixed(1)} months covered`,
          explanation: insights.factorInsights[3].explanation,
          suggestion: insights.factorInsights[3].suggestion,
        },
      ],
      aiPowered: true,
      strengths: aiResult.keyStrengths,
      weaknesses: aiResult.keyWeaknesses,
      recommendations: insights.top3Recommendations,
    };

  } catch (error) {
    console.error('AI health score calculation failed:', error);
    return null; // Fall back to formula
  }
}


import { db } from "./db";
import { accounts, transactions, budgets, goals } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { generateInsights } from "./ai-insights";

export async function getBalanceSheet(userId: string, asOfDate: Date = new Date()) {
  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, userId),
  });

  const assets = userAccounts
    .filter(a => ['checking', 'savings', 'investment'].includes(a.accountCategory))
    .reduce((sum, a) => sum + parseFloat(a.balance), 0);

  const liabilities = userAccounts
    .filter(a => a.accountCategory === 'credit_card' || a.accountCategory === 'loan' || a.accountCategory === 'mortgage')
    .reduce((sum, a) => sum + Math.abs(parseFloat(a.balance)), 0);

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
    accounts: userAccounts,
  };
}

export async function getNetWorthHistory(userId: string, months: number = 12) {
  // Get all user accounts and transactions
  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, userId),
  });

  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
  });

  // Generate monthly data points
  const history: Array<{ month: string; netWorth: number; date: string }> = [];
  const now = new Date();

  // Calculate current net worth
  const currentAssets = userAccounts
    .filter(a => ['checking', 'savings', 'investment'].includes(a.accountCategory))
    .reduce((sum, a) => sum + parseFloat(a.balance), 0);
  
  const currentLiabilities = userAccounts
    .filter(a => a.accountCategory === 'credit_card' || a.accountCategory === 'loan' || a.accountCategory === 'mortgage')
    .reduce((sum, a) => sum + Math.abs(parseFloat(a.balance)), 0);

  // Calculate current net worth
  const currentNetWorth = currentAssets - currentLiabilities;

  // For each of the last N months, calculate net worth at end of month
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    const endOfMonthStr = endOfMonth.toISOString().split('T')[0];
    
    // Calculate net worth at end of month by subtracting future transactions
    let netWorth = currentNetWorth;
    
    // Sum all transactions AFTER the target month (to subtract from current net worth)
    const futureTransactions = allTransactions.filter(t => t.date > endOfMonthStr);
    const futureSum = futureTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    
    // Historical net worth = current net worth - future transactions
    netWorth -= futureSum;
    
    history.unshift({
      month: endOfMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      netWorth: Math.round(netWorth * 100) / 100,
      date: endOfMonthStr,
    });
  }

  return history;
}

export async function getCashFlow(userId: string, startDate: Date, endDate: Date) {
  const userTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, startDate.toISOString().split('T')[0]),
      lte(transactions.date, endDate.toISOString().split('T')[0])
    ),
  });

  const income = userTransactions
    .filter(t => parseFloat(t.totalAmount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);

  const expenses = userTransactions
    .filter(t => parseFloat(t.totalAmount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);

  return {
    income,
    expenses,
    netCashFlow: income - expenses,
    details: userTransactions,
  };
}

export async function getFinancialRatios(userId: string) {
  const balanceSheet = await getBalanceSheet(userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const cashFlow = await getCashFlow(userId, startOfMonth, now);

  const debtToIncomeRatio = cashFlow.income > 0 
    ? (balanceSheet.liabilities / cashFlow.income) * 100 
    : 0;

  const savingsRate = cashFlow.income > 0
    ? ((cashFlow.income - cashFlow.expenses) / cashFlow.income) * 100
    : 0;

  return {
    debtToIncomeRatio,
    savingsRate,
    netWorth: balanceSheet.netWorth,
    monthlyIncome: cashFlow.income,
    monthlyExpenses: cashFlow.expenses,
  };
}

export async function calculateFinancialHealthScore(userId: string) {
  const ratios = await getFinancialRatios(userId);
  const userBudgets = await db.query.budgets.findMany({
    where: eq(budgets.userId, userId),
  });
  
  const userTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
  });

  // Check if user has meaningful data - last 30 days of non-zero cash flow
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTransactions = userTransactions.filter(t => 
    new Date(t.date) >= thirtyDaysAgo && parseFloat(t.totalAmount) !== 0
  );
  
  // If no recent transactions and no income/expenses, return null (new user)
  if (recentTransactions.length === 0 && ratios.monthlyIncome === 0 && ratios.monthlyExpenses === 0) {
    return null;
  }

  // Try AI-powered scoring first
  const aiScore = await calculateAIHealthScore(userId, ratios, userBudgets, userTransactions);
  if (aiScore !== null) {
    return aiScore;
  }

  // Fallback to formula-based scoring
  let score = 0;

  // Savings Rate component (30%)
  const savingsScore = Math.max(0, Math.min(100, ratios.savingsRate * 5));
  const savingsPercent = Math.round(ratios.savingsRate * 10) / 10;
  score += savingsScore * 0.3;

  // Budget Planning component (25%)
  const budgetScore = userBudgets.length > 0 ? 75 : 50;
  const budgetCount = userBudgets.length;
  score += budgetScore * 0.25;

  // Debt Management component (25%)
  const debtScore = Math.max(0, 100 - ratios.debtToIncomeRatio);
  const debtRatio = Math.round(ratios.debtToIncomeRatio * 10) / 10;
  score += debtScore * 0.25;

  // Net Worth / Emergency Fund component (20%)
  const netWorthScore = ratios.netWorth > 0 ? Math.min(100, (ratios.netWorth / 10000) * 100) : 0;
  const netWorthValue = Math.round(ratios.netWorth);
  const monthsOfExpenses = ratios.monthlyExpenses > 0 ? ratios.netWorth / ratios.monthlyExpenses : 0;
  score += netWorthScore * 0.2;

  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Improvement';
  
  // Get balance sheet for total debt
  const balanceSheet = await getBalanceSheet(userId);
  
  // Generate AI-powered insights
  const insights = await generateInsights({
    savingsScore,
    savingsRate: ratios.savingsRate,
    budgetScore,
    budgetCount,
    debtScore,
    debtRatio: ratios.debtToIncomeRatio,
    emergencyScore: netWorthScore,
    emergencyMonths: monthsOfExpenses,
    monthlyIncome: ratios.monthlyIncome,
    monthlyExpenses: ratios.monthlyExpenses,
    netWorth: ratios.netWorth,
    totalDebt: balanceSheet.liabilities,
    grade,
  }, userId);
  
  // Build factors array with AI insights
  const factors = [
    {
      name: 'Savings Rate',
      score: savingsScore,
      weight: 0.3,
      currentValue: `${savingsPercent}%`,
      explanation: insights.factorInsights[0].explanation,
      suggestion: insights.factorInsights[0].suggestion,
    },
    {
      name: 'Budget Planning',
      score: budgetScore,
      weight: 0.25,
      currentValue: `${budgetCount} active ${budgetCount === 1 ? 'budget' : 'budgets'}`,
      explanation: insights.factorInsights[1].explanation,
      suggestion: insights.factorInsights[1].suggestion,
    },
    {
      name: 'Debt Management',
      score: debtScore,
      weight: 0.25,
      currentValue: ratios.debtToIncomeRatio > 0 ? `${debtRatio}% debt-to-income` : 'No debt',
      explanation: insights.factorInsights[2].explanation,
      suggestion: insights.factorInsights[2].suggestion,
    },
    {
      name: 'Emergency Fund',
      score: netWorthScore,
      weight: 0.2,
      currentValue: monthsOfExpenses >= 1 ? `${Math.round(monthsOfExpenses * 10) / 10} months covered` : `$${netWorthValue}`,
      explanation: insights.factorInsights[3].explanation,
      suggestion: insights.factorInsights[3].suggestion,
    },
  ];
  
  return {
    score: Math.round(score),
    factors,
    grade,
    explanation: insights.overallSummary,
    recommendations: insights.top3Recommendations,
  };
}

export async function getBalanceHistory(userId: string, days: number = 30) {
  // Get all user accounts
  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, userId),
  });

  // Calculate current total balance (assets - liabilities)
  const currentAssets = userAccounts
    .filter(a => ['checking', 'savings', 'investment', 'cash'].includes(a.accountCategory))
    .reduce((sum, a) => sum + parseFloat(a.balance), 0);
  
  const currentLiabilities = userAccounts
    .filter(a => ['credit_card', 'loan', 'mortgage'].includes(a.accountCategory))
    .reduce((sum, a) => sum + Math.abs(parseFloat(a.balance)), 0);

  const currentTotalBalance = currentAssets - currentLiabilities;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Get all transactions for the user
  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
  });

  // Calculate initial balance by subtracting future transactions from current balance
  let initialBalance = currentTotalBalance;
  
  allTransactions.forEach(t => {
    if (t.date >= startDateStr) {
      // Subtract transactions that happened during our date range
      initialBalance -= parseFloat(t.totalAmount);
    }
  });

  // Generate daily balance data points
  const history: Array<{ date: string; balance: number }> = [];
  
  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    // Calculate balance for this day
    let dayBalance = initialBalance;
    
    // Add all transactions up to this date
    allTransactions.forEach(t => {
      if (t.date >= startDateStr && t.date <= currentDateStr) {
        dayBalance += parseFloat(t.totalAmount);
      }
    });
    
    history.push({
      date: currentDateStr,
      balance: Math.round(dayBalance * 100) / 100,
    });
  }

  return history;
}

export async function getSpendingPatterns(userId: string, months: number = 3) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const userTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, startDate.toISOString().split('T')[0])
    ),
  });

  const patterns: Record<string, Record<string, { total: number; count: number }>> = {};

  userTransactions.forEach(t => {
    const month = t.date.substring(0, 7); // YYYY-MM
    const amount = parseFloat(t.totalAmount);
    
    if (amount < 0) { // expenses only
      const category = t.description.toLowerCase().includes('food') ? 'food' :
                      t.description.toLowerCase().includes('gas') ? 'transportation' :
                      t.description.toLowerCase().includes('restaurant') ? 'food' :
                      'other';
      
      if (!patterns[category]) patterns[category] = {};
      if (!patterns[category][month]) patterns[category][month] = { total: 0, count: 0 };
      
      patterns[category][month].total += Math.abs(amount);
      patterns[category][month].count += 1;
    }
  });

  return Object.entries(patterns).flatMap(([category, months]) =>
    Object.entries(months).map(([month, data]) => ({
      category,
      month,
      total: data.total,
      count: data.count,
    }))
  );
}

export async function getSpendingDaysComparison(userId: string) {
  // Get all transactions ordered by date descending
  const userTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: (transactions, { desc }) => [desc(transactions.date)],
  });

  // Group transactions by date and calculate net cash flow per day
  const dailyNetCashFlow: Record<string, number> = {};
  
  userTransactions.forEach(t => {
    const date = t.date;
    const amount = parseFloat(t.totalAmount);
    
    if (!dailyNetCashFlow[date]) {
      dailyNetCashFlow[date] = 0;
    }
    dailyNetCashFlow[date] += amount;
  });

  // Get days with actual transactions (non-zero net cash flow)
  const spendingDays = Object.entries(dailyNetCashFlow)
    .filter(([_, netFlow]) => netFlow !== 0)
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
    .map(([date, netFlow]) => ({ date, netFlow }));

  // Need at least 4 spending days to compare
  if (spendingDays.length < 4) {
    return {
      hasEnoughData: false,
      isBetter: null,
      mostRecentDay: null,
      previous3DaysAvg: null,
      difference: null,
    };
  }

  // Most recent spending day
  const mostRecentDay = spendingDays[0];
  
  // Previous 3 spending days
  const previous3Days = spendingDays.slice(1, 4);
  const previous3DaysAvg = previous3Days.reduce((sum, day) => sum + day.netFlow, 0) / 3;

  // Better means higher net cash flow (more income or less expenses)
  const isBetter = mostRecentDay.netFlow > previous3DaysAvg;
  const difference = mostRecentDay.netFlow - previous3DaysAvg;

  return {
    hasEnoughData: true,
    isBetter,
    mostRecentDay: {
      date: mostRecentDay.date,
      netFlow: mostRecentDay.netFlow,
    },
    previous3DaysAvg,
    difference,
  };
}
