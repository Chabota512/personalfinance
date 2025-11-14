import { db } from "./db";
import { achievements, transactions, budgets, goals, userStreaks } from "../shared/schema";
import { eq, and, gte, count, desc } from "drizzle-orm";

export interface Achievement {
  type: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  progress?: number;
  target?: number;
}

export async function updateStreak(userId: string, budgetId?: string) {
  const today = new Date().toISOString().split('T')[0];

  const streak = await db.query.userStreaks.findFirst({
    where: eq(userStreaks.userId, userId),
  });

  if (!streak) {
    // Create first streak
    await db.insert(userStreaks).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
    });
    return 1;
  }

  const lastDate = new Date(streak.lastActivityDate);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day, no update
    return streak.currentStreak;
  } else if (diffDays === 1) {
    // Consecutive day, increment streak
    const newStreak = streak.currentStreak + 1;
    await db.update(userStreaks)
      .set({
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streak.longestStreak),
        lastActivityDate: today,
      })
      .where(eq(userStreaks.id, streak.id));
    return newStreak;
  } else {
    // Streak broken, reset
    await db.update(userStreaks)
      .set({
        currentStreak: 1,
        lastActivityDate: today,
      })
      .where(eq(userStreaks.id, streak.id));
    return 1;
  }
}

export async function calculateAchievements(userId: string): Promise<Achievement[]> {
  const allAchievements: Achievement[] = [];

  // Get user's earned achievements
  const earnedAchievements = await db.query.achievements.findMany({
    where: eq(achievements.userId, userId),
  });

  const earnedTypes = new Set(earnedAchievements.map(a => a.achievementType));

  // First Transaction
  const transactionCount = await db.select({ count: count() })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  allAchievements.push({
    type: 'first_transaction',
    title: 'First Step',
    description: 'Logged your first transaction',
    icon: '🎯',
    earned: transactionCount[0].count > 0,
    earnedAt: earnedTypes.has('first_transaction') 
      ? earnedAchievements.find(a => a.achievementType === 'first_transaction')?.earnedAt 
      : undefined,
  });

  // First Budget
  const budgetCount = await db.select({ count: count() })
    .from(budgets)
    .where(eq(budgets.userId, userId));

  allAchievements.push({
    type: 'first_budget',
    title: 'Budget Master',
    description: 'Created your first budget',
    icon: '💰',
    earned: budgetCount[0].count > 0,
    earnedAt: earnedTypes.has('first_budget') 
      ? earnedAchievements.find(a => a.achievementType === 'first_budget')?.earnedAt 
      : undefined,
  });

  // First Goal
  const goalCount = await db.select({ count: count() })
    .from(goals)
    .where(eq(goals.userId, userId));

  allAchievements.push({
    type: 'first_goal',
    title: 'Goal Getter',
    description: 'Set your first financial goal',
    icon: '🏆',
    earned: goalCount[0].count > 0,
    earnedAt: earnedTypes.has('first_goal') 
      ? earnedAchievements.find(a => a.achievementType === 'first_goal')?.earnedAt 
      : undefined,
  });

  // 7-Day Streak
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentTransactions = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.date, sevenDaysAgo)
    ))
    .orderBy(desc(transactions.date));

  const streak = calculateStreak(recentTransactions);

  allAchievements.push({
    type: '7_day_streak',
    title: '7-Day Streak',
    description: 'Logged transactions for 7 consecutive days',
    icon: '🔥',
    earned: streak >= 7,
    progress: Math.min(streak, 7),
    target: 7,
    earnedAt: earnedTypes.has('7_day_streak') 
      ? earnedAchievements.find(a => a.achievementType === '7_day_streak')?.earnedAt 
      : undefined,
  });

  // 100 Transactions
  allAchievements.push({
    type: '100_transactions',
    title: 'Century Club',
    description: 'Logged 100 transactions',
    icon: '💯',
    earned: transactionCount[0].count >= 100,
    progress: Math.min(transactionCount[0].count, 100),
    target: 100,
    earnedAt: earnedTypes.has('100_transactions') 
      ? earnedAchievements.find(a => a.achievementType === '100_transactions')?.earnedAt 
      : undefined,
  });

  // Fetch and update streak data
  const userStreakData = await db.query.userStreaks.findFirst({
    where: eq(userStreaks.userId, userId),
  });

  if (userStreakData) {
    allAchievements.push({
      type: 'current_streak',
      title: 'Current Streak',
      description: `You are on a ${userStreakData.currentStreak}-day streak!`,
      icon: '⚡',
      earned: userStreakData.currentStreak >= 7, // Example: earning if streak is 7 days or more
      progress: userStreakData.currentStreak,
      target: 7, // Example target
      earnedAt: earnedTypes.has('current_streak')
        ? earnedAchievements.find(a => a.achievementType === 'current_streak')?.earnedAt
        : undefined,
    });

    allAchievements.push({
      type: 'longest_streak',
      title: 'Longest Streak',
      description: `Your longest streak is ${userStreakData.longestStreak} days.`,
      icon: '⭐',
      earned: userStreakData.longestStreak >= 14, // Example: earning if longest streak is 14 days or more
      progress: userStreakData.longestStreak,
      target: 14, // Example target
      earnedAt: earnedTypes.has('longest_streak')
        ? earnedAchievements.find(a => a.achievementType === 'longest_streak')?.earnedAt
        : undefined,
    });
  }


  return allAchievements;
}

function calculateStreak(transactions: any[]): number {
  if (transactions.length === 0) return 0;

  const dates = transactions.map(t => new Date(t.date).toDateString());
  const uniqueDates = [...new Set(dates)].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  let streak = 0;
  const today = new Date().toDateString();
  let currentDate = new Date();

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(currentDate.getDate() - i);

    if (uniqueDates[i] === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function awardAchievement(userId: string, achievementType: string, title: string, icon: string, description?: string) {
  const existing = await db.query.achievements.findFirst({
    where: and(
      eq(achievements.userId, userId),
      eq(achievements.achievementType, achievementType)
    ),
  });

  if (!existing) {
    await db.insert(achievements).values({
      userId,
      achievementType,
      title,
      description,
      icon,
    });
  }
}