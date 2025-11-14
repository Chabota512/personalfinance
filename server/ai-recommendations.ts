import { db } from "./db";
import { transactions, budgets, goals, savingsRecommendations, categoryOverrides } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getSpendingPatterns, getFinancialRatios } from "./analytics";
import { generateFinancialInsights } from "./gemini-ai";
import { getCategoryOverride, createOrUpdateCategoryOverride } from "./storage";

// Helper function to detect time-based patterns
function detectTimePatterns(transactions: any[]) {
  const patterns: any[] = [];
  const byHour: Record<number, any[]> = {};
  const byDayOfWeek: Record<number, any[]> = {};
  const byCategory: Record<string, any[]> = {};

  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const category = tx.category || 'uncategorized';

    if (!byHour[hour]) byHour[hour] = [];
    if (!byDayOfWeek[dayOfWeek]) byDayOfWeek[dayOfWeek] = [];
    if (!byCategory[category]) byCategory[category] = [];

    byHour[hour].push(tx);
    byDayOfWeek[dayOfWeek].push(tx);
    byCategory[category].push(tx);
  });

  // Detect time-of-day patterns
  Object.entries(byHour).forEach(([hour, txs]) => {
    if (txs.length >= 3) {
      const avgAmount = txs.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0) / txs.length;
      const category = txs[0].category;
      patterns.push({
        type: 'time-of-day',
        description: `You often spend on ${category} around ${hour}:00`,
        frequency: txs.length,
        avgAmount,
      });
    }
  });

  // Detect day-of-week patterns
  Object.entries(byDayOfWeek).forEach(([day, txs]) => {
    if (txs.length >= 4) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const avgAmount = txs.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0) / txs.length;
      patterns.push({
        type: 'day-of-week',
        description: `You typically spend more on ${days[parseInt(day)]}s`,
        frequency: txs.length,
        avgAmount,
      });
    }
  });

  return patterns;
}

// Helper function to detect recurring expenses
function detectRecurringExpenses(transactions: any[]) {
  const recurring: any[] = [];
  const byDescription: Record<string, any[]> = {};

  transactions.forEach(tx => {
    const desc = tx.description?.toLowerCase() || '';
    if (!byDescription[desc]) byDescription[desc] = [];
    byDescription[desc].push(tx);
  });

  Object.entries(byDescription).forEach(([desc, txs]) => {
    if (txs.length >= 2 && desc) {
      const amounts = txs.map(tx => Math.abs(parseFloat(tx.amount)));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;

      // If amounts are similar (low variance), it's likely a recurring expense
      if (variance < avgAmount * 0.3) {
        recurring.push({
          description: desc,
          frequency: txs.length,
          avgAmount,
          category: txs[0].category,
        });
      }
    }
  });

  return recurring;
}

// Helper function to detect bad spending habits (Financial Blackholes)
function detectBadHabits(transactions: any[]) {
  const habits: any[] = [];
  
  // Late night spending (11pm - 3am) - Blackhole #1
  const lateNightSpending = transactions.filter(t => {
    const hour = new Date(t.date).getHours();
    return hour >= 23 || hour <= 3;
  });
  
  if (lateNightSpending.length >= 3) {
    const total = lateNightSpending.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
    const monthlyImpact = (total / 90) * 30;
    habits.push({
      type: 'late_night_spending',
      title: '🌙 Financial Blackhole: Late Night Shopping',
      description: `You've made ${lateNightSpending.length} purchases late at night (11pm-3am) totaling $${total.toFixed(2)}. This costs you ~$${monthlyImpact.toFixed(2)}/month. Try "sleep on it" rule for late-night purchases.`,
      count: lateNightSpending.length,
      amount: total,
      monthlyImpact,
    });
  }
  
  // Impulse buying (multiple small transactions same day) - Blackhole #2
  const byDay: Record<string, any[]> = {};
  transactions.forEach(t => {
    const day = t.date;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  });
  
  const impulseDays = Object.entries(byDay).filter(([_, txs]) => txs.length >= 5);
  if (impulseDays.length >= 2) {
    const impulseTotal = impulseDays.reduce((sum, [_, txs]) => 
      sum + txs.reduce((s, t) => s + Math.abs(parseFloat(t.totalAmount)), 0), 0
    );
    const monthlyImpact = (impulseTotal / 90) * 30;
    habits.push({
      type: 'impulse_buying',
      title: '⚡ Financial Blackhole: Impulse Buying Sprees',
      description: `You made 5+ purchases in a single day on ${impulseDays.length} occasions, totaling $${impulseTotal.toFixed(2)}. Monthly impact: ~$${monthlyImpact.toFixed(2)}. Try the 24-hour rule before non-essential purchases.`,
      count: impulseDays.length,
      amount: impulseTotal,
      monthlyImpact,
    });
  }
  
  // Weekend overspending - Blackhole #3
  const weekendSpending = transactions.filter(t => {
    const day = new Date(t.date).getDay();
    return day === 0 || day === 6;
  });
  const weekdaySpending = transactions.filter(t => {
    const day = new Date(t.date).getDay();
    return day >= 1 && day <= 5;
  });
  
  if (weekendSpending.length > 0 && weekdaySpending.length > 0) {
    const weekendTotal = weekendSpending.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
    const weekdayTotal = weekdaySpending.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
    const weekendAvg = weekendTotal / (weekendSpending.length / 2);
    const weekdayAvg = weekdayTotal / (weekdaySpending.length / 5);
    
    if (weekendAvg > weekdayAvg * 1.5) {
      const excessSpending = weekendTotal - (weekdayAvg * (weekendSpending.length / 2));
      const monthlyImpact = (excessSpending / 90) * 30;
      habits.push({
        type: 'weekend_overspending',
        title: '🎉 Financial Blackhole: Weekend Overspending',
        description: `Your weekend spending is ${((weekendAvg / weekdayAvg - 1) * 100).toFixed(0)}% higher than weekdays, costing an extra $${excessSpending.toFixed(2)} over 90 days (~$${monthlyImpact.toFixed(2)}/month). Plan free/low-cost weekend activities in advance.`,
        weekendAvg,
        weekdayAvg,
        monthlyImpact,
      });
    }
  }
  
  // Subscription creep - Blackhole #4
  const recurringExpenses = detectRecurringExpenses(transactions);
  const subscriptionLike = recurringExpenses.filter(r => 
    r.avgAmount >= 5 && r.avgAmount <= 50 && r.frequency >= 3
  );
  if (subscriptionLike.length >= 3) {
    const subscriptionTotal = subscriptionLike.reduce((sum, s) => sum + s.avgAmount, 0);
    habits.push({
      type: 'subscription_creep',
      title: '📺 Financial Blackhole: Subscription Creep',
      description: `You have ${subscriptionLike.length} recurring subscriptions costing ~$${subscriptionTotal.toFixed(2)}/month. Review and cancel unused ones to save $${(subscriptionTotal * 0.3).toFixed(2)}+/month.`,
      count: subscriptionLike.length,
      monthlyImpact: subscriptionTotal,
    });
  }
  
  // Delivery fee addiction - Blackhole #5
  const deliveryTransactions = transactions.filter(t => 
    (t.description?.toLowerCase().includes('delivery') ||
     t.description?.toLowerCase().includes('doordash') ||
     t.description?.toLowerCase().includes('ubereats') ||
     t.description?.toLowerCase().includes('grubhub'))
  );
  if (deliveryTransactions.length >= 5) {
    const deliveryTotal = deliveryTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
    const monthlyImpact = (deliveryTotal / 90) * 30;
    const estimatedFees = deliveryTotal * 0.25; // Assume 25% is fees/tips
    habits.push({
      type: 'delivery_addiction',
      title: '🚗 Financial Blackhole: Delivery Fee Drain',
      description: `${deliveryTransactions.length} delivery orders totaling $${deliveryTotal.toFixed(2)} (~$${monthlyImpact.toFixed(2)}/month). Estimated $${estimatedFees.toFixed(2)} in fees alone. Meal prep or pickup could save ~$${(monthlyImpact * 0.4).toFixed(2)}/month.`,
      count: deliveryTransactions.length,
      amount: deliveryTotal,
      monthlyImpact,
    });
  }
  
  return habits;
}

// Predictive insights based on trends
function generatePredictiveInsights(transactions: any[], patterns: any) {
  const insights: any[] = [];
  
  // Trend analysis - spending trajectory
  if (transactions.length >= 30) {
    const last30Days = transactions.slice(0, 30);
    const previous30Days = transactions.slice(30, 60);
    
    const last30Total = last30Days.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
    const prev30Total = previous30Days.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
    
    if (last30Total > prev30Total * 1.2) {
      const trend = ((last30Total - prev30Total) / prev30Total) * 100;
      const projectedMonthly = last30Total;
      insights.push({
        type: 'spending_trend_up',
        title: '📈 Spending Trend Alert',
        description: `Your spending is up ${trend.toFixed(0)}% vs last month. If this continues, you'll spend $${projectedMonthly.toFixed(2)} this month vs $${prev30Total.toFixed(2)} last month.`,
        severity: 'warning',
      });
    } else if (last30Total < prev30Total * 0.8) {
      const trend = ((prev30Total - last30Total) / prev30Total) * 100;
      insights.push({
        type: 'spending_trend_down',
        title: '📉 Great Progress!',
        description: `Your spending is down ${trend.toFixed(0)}% vs last month! You're saving an extra $${(prev30Total - last30Total).toFixed(2)}/month. Keep it up!`,
        severity: 'positive',
      });
    }
  }
  
  return insights;
}

export async function generateAIRecommendations(userId: string) {
  const recommendations: Array<{
    title: string;
    description: string;
    suggestedAmount: number | null;
    confidence: string;
    category: string;
    isActive: number;
  }> = [];

  // Get recent transactions (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

  const userTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, ninetyDaysAgoStr)
    ),
    orderBy: desc(transactions.date),
  });

  const patterns = await Promise.all([
    getSpendingPatterns(userId, 3),
    getFinancialRatios(userId),
  ]);

  const categorySpending = patterns[0].reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = 0;
    acc[p.category] += p.total;
    return acc;
  }, {} as Record<string, number>);
  
  // Detect bad spending habits
  const badHabits = detectBadHabits(userTransactions);
  badHabits.forEach(habit => {
    recommendations.push({
      title: habit.title,
      description: habit.description,
      suggestedAmount: habit.amount || null,
      confidence: '85',
      category: 'bad_habit',
      isActive: 1,
    });
  });

  // Add recommendations based on spending patterns and financial ratios (similar to original generateRecommendations logic)
  // High spending categories
  const highSpendingCategories = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  for (const [category, amount] of highSpendingCategories) {
    if (amount > 500) {
      recommendations.push({
        title: `Reduce ${category} spending`,
        description: `You've spent $${amount.toFixed(2)} on ${category} in the last 3 months. Consider reducing by 10-15%.`,
        suggestedAmount: parseFloat((amount * 0.15).toFixed(2)),
        confidence: '75',
        category: 'expense_reduction',
        isActive: 1,
      });
    }
  }

  // Savings rate recommendations
  if (patterns[1].savingsRate < 20) {
    recommendations.push({
      title: 'Increase your savings rate',
      description: `Your current savings rate is ${patterns[1].savingsRate.toFixed(1)}%. Aim for at least 20% to build wealth faster.`,
      suggestedAmount: parseFloat((patterns[1].monthlyIncome * 0.2 - (patterns[1].monthlyIncome * patterns[1].savingsRate / 100)).toFixed(2)),
      confidence: '85',
      category: 'savings_increase',
      isActive: 1,
    });
  }

  // Emergency fund recommendation
  if (patterns[1].netWorth < patterns[1].monthlyExpenses * 6) {
    recommendations.push({
      title: 'Build emergency fund',
      description: 'Aim for 6 months of expenses in liquid savings for financial security.',
      suggestedAmount: parseFloat((patterns[1].monthlyExpenses * 6 - patterns[1].netWorth).toFixed(2)),
      confidence: '90',
      category: 'emergency_fund',
      isActive: 1,
    });
  }

  // Debt reduction if applicable
  if (patterns[1].debtToIncomeRatio > 30) {
    recommendations.push({
      title: 'Focus on debt reduction',
      description: `Your debt-to-income ratio is ${patterns[1].debtToIncomeRatio.toFixed(1)}%. Focus on paying down high-interest debt.`,
      suggestedAmount: parseFloat((patterns[1].monthlyIncome * 0.15).toFixed(2)),
      confidence: '80',
      category: 'debt_reduction',
      isActive: 1,
    });
  }

  // Detect patterns in transaction history
  const timePatterns = detectTimePatterns(userTransactions);
  const recurringExpenses = detectRecurringExpenses(userTransactions);
  const predictiveInsights = generatePredictiveInsights(userTransactions, { timePatterns, recurringExpenses });

  // Add predictive insights first (high priority)
  predictiveInsights.forEach(insight => {
    recommendations.push({
      title: insight.title,
      description: insight.description,
      suggestedAmount: null,
      confidence: '90',
      category: 'predictive',
      isActive: 1,
    });
  });

  // Add pattern-based insights
  timePatterns.slice(0, 2).forEach((pattern, index) => {
    recommendations.push({
      title: `Spending Pattern Detected`,
      description: `${pattern.description}. Average: $${pattern.avgAmount.toFixed(2)} (${pattern.frequency} times)`,
      suggestedAmount: null,
      confidence: '85',
      category: 'habit_detection',
      isActive: 1,
    });
  });

  // Add recurring expense insights
  recurringExpenses.slice(0, 2).forEach(expense => {
    recommendations.push({
      title: `Recurring Expense`,
      description: `"${expense.description}" appears ${expense.frequency} times at ~$${expense.avgAmount.toFixed(2)}. Consider setting up a budget category.`,
      suggestedAmount: expense.avgAmount,
      confidence: '90',
      category: 'recurring',
      isActive: 1,
    });
  });

  // Try to get AI-powered insights with enhanced context
  try {
    const patterns = {
      timePatterns: timePatterns.slice(0, 3),
      recurringExpenses: recurringExpenses.slice(0, 3),
    };

    const aiInsights = await generateFinancialInsights(userId, patterns as any);

    if (aiInsights.insights && aiInsights.insights.length > 0) {
      aiInsights.insights.forEach((insight: string, index: number) => {
        recommendations.push({
          title: `AI Insight`,
          description: insight,
          suggestedAmount: null,
          confidence: '75',
          category: 'ai_insight',
          isActive: 1,
        });
      });
    }
  } catch (error) {
    console.error('Error generating AI insights:', error);
  }

  // Store recommendations in database (limit to top 5)
  for (const rec of recommendations.slice(0, 5)) {
    try {
      await db.insert(savingsRecommendations).values({
        ...rec,
        userId,
        suggestedAmount: rec.suggestedAmount?.toString() || null,
      });
    } catch (error) {
      console.error('Error storing recommendation:', error);
    }
  }

  return recommendations;
}

export async function analyzeSpendingAnomaly(userId: string) {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [lastMonthTransactions, previousMonthTransactions] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        gte(transactions.date, lastMonth.toISOString().split('T')[0]),
        lte(transactions.date, now.toISOString().split('T')[0])
      ),
    }),
    db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        gte(transactions.date, twoMonthsAgo.toISOString().split('T')[0]),
        lte(transactions.date, lastMonth.toISOString().split('T')[0])
      ),
    }),
  ]);

  const lastMonthTotal = lastMonthTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
  const previousMonthTotal = previousMonthTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.totalAmount)), 0);

  const percentageChange = previousMonthTotal > 0
    ? ((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
    : 0;

  return {
    hasAnomaly: Math.abs(percentageChange) > 20,
    percentageChange,
    lastMonthTotal,
    previousMonthTotal,
    message: percentageChange > 20
      ? `Your spending increased by ${percentageChange.toFixed(1)}% last month`
      : percentageChange < -20
      ? `Great! Your spending decreased by ${Math.abs(percentageChange).toFixed(1)}% last month`
      : 'Your spending is relatively stable',
  };
}


// ===== NLP CATEGORY SUGGESTION WITH LEARNING =====

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  'food': ['restaurant', 'cafe', 'coffee', 'starbucks', 'food', 'grocery', 'kroger', 'safeway', 'trader', 'whole foods', 'walmart', 'pizza', 'burger', 'taco', 'sushi', 'lunch', 'dinner', 'breakfast', 'mcdonald', 'subway', 'chipotle', 'domino'],
  'transportation': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'shell', 'chevron', 'exxon', 'bp', 'parking', 'metro', 'transit', 'bus', 'train'],
  'shopping': ['amazon', 'store', 'shop', 'mall', 'target', 'clothes', 'clothing', 'shoes', 'dress', 'shirt'],
  'entertainment': ['movie', 'netflix', 'spotify', 'hulu', 'disney', 'game', 'concert', 'theater', 'theatre', 'ticket'],
  'housing': ['rent', 'mortgage', 'landlord', 'property', 'lease'],
  'healthcare': ['doctor', 'hospital', 'pharmacy', 'cvs', 'walgreens', 'medical', 'medicine', 'prescription', 'dental', 'clinic'],
  'utilities': ['electric', 'electricity', 'water', 'gas', 'internet', 'phone', 'utility', 'bill', 'comcast', 'verizon', 'att', 'spectrum'],
  'personal_care': ['gym', 'fitness', 'haircut', 'salon', 'spa', 'beauty', 'grooming'],
  'education': ['book', 'course', 'tuition', 'school', 'college', 'university', 'class', 'learning'],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  'salary': ['salary', 'paycheck', 'wage', 'employer', 'pay', 'income'],
  'business': ['freelance', 'gig', 'contract', 'consulting', 'business'],
  'investment_income': ['dividend', 'interest', 'investment', 'stock', 'capital gain'],
  'other_income': ['bonus', 'gift', 'refund', 'award', 'prize', 'return'],
};

export async function suggestCategory(
  userId: string,
  description: string,
  transactionType: 'income' | 'expense'
): Promise<{ category: string; confidence: number; source: 'learned' | 'keyword' | 'default' }> {
  const normalized = description.toLowerCase().trim();

  // First, check if user has overridden this before (highest priority)
  const override = await getCategoryOverride(userId, description, transactionType);
  if (override) {
    return {
      category: override.userSelectedCategory,
      confidence: Math.min(95, 70 + (override.overrideCount * 5)), // Higher confidence with more uses
      source: 'learned'
    };
  }

  // Second, use keyword matching
  const keywords = transactionType === 'expense' ? EXPENSE_KEYWORDS : INCOME_KEYWORDS;
  let bestMatch = { category: '', score: 0 };

  for (const [category, categoryKeywords] of Object.entries(keywords)) {
    let score = 0;
    for (const keyword of categoryKeywords) {
      if (normalized.includes(keyword)) {
        // Longer keywords get higher scores (more specific)
        score += keyword.length;
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { category, score };
    }
  }

  if (bestMatch.score > 0) {
    const confidence = Math.min(85, 50 + bestMatch.score * 2);
    return {
      category: bestMatch.category,
      confidence,
      source: 'keyword'
    };
  }

  // Default fallback
  return {
    category: transactionType === 'expense' ? 'other_expense' : 'other_income',
    confidence: 30,
    source: 'default'
  };
}

export async function recordCategoryChoice(
  userId: string,
  description: string,
  transactionType: 'income' | 'expense',
  suggestedCategory: string,
  userSelectedCategory: string
) {
  // Only record if user chose something different from suggestion
  if (suggestedCategory !== userSelectedCategory) {
    await createOrUpdateCategoryOverride(
      userId,
      description,
      transactionType,
      suggestedCategory,
      userSelectedCategory
    );
  }
}
