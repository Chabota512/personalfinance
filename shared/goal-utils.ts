import type { Goal } from "./schema";

export type ContributionFrequency = "daily" | "weekly" | "monthly" | "yearly" | "flexible";
export type ContributionMode = "calculated_amount" | "calculated_date" | "flexible_amount" | "completely_flexible";

export function calculateScheduledAmount(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date,
  frequency: ContributionFrequency
): number {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;

  const daysUntilTarget = Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  switch (frequency) {
    case "daily":
      return remaining / daysUntilTarget;
    case "weekly":
      const weeksUntilTarget = Math.max(1, Math.ceil(daysUntilTarget / 7));
      return remaining / weeksUntilTarget;
    case "monthly":
      const monthsUntilTarget = Math.max(1, Math.ceil(daysUntilTarget / 30));
      return remaining / monthsUntilTarget;
    case "yearly":
      const yearsUntilTarget = Math.max(1, Math.ceil(daysUntilTarget / 365));
      return remaining / yearsUntilTarget;
    case "flexible":
      return 0;
    default:
      return 0;
  }
}

export function calculateTargetDate(
  targetAmount: number,
  currentAmount: number,
  scheduledAmount: number,
  frequency: ContributionFrequency
): Date {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0 || scheduledAmount <= 0) return new Date();

  const contributionsNeeded = Math.ceil(remaining / scheduledAmount);
  const now = new Date();

  switch (frequency) {
    case "daily":
      return addDays(now, contributionsNeeded);
    case "weekly":
      return addDays(now, contributionsNeeded * 7);
    case "monthly":
      return addMonths(now, contributionsNeeded);
    case "yearly":
      return addYears(now, contributionsNeeded);
    case "flexible":
      return now;
    default:
      return now;
  }
}

export function calculateNextScheduledDate(
  frequency: ContributionFrequency,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  lastContributionDate?: Date
): Date | null {
  if (frequency === "flexible") {
    return null;
  }

  const now = new Date();
  const base = lastContributionDate || now;

  switch (frequency) {
    case "daily":
      return addDays(base, 1);
    
    case "weekly":
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const nextDate = new Date(base);
        const currentDay = nextDate.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7 || 7;
        return addDays(nextDate, daysToAdd);
      }
      return addDays(base, 7);
    
    case "monthly":
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        const nextDate = new Date(base);
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(Math.min(dayOfMonth, getLastDayOfMonth(nextDate)));
        return nextDate;
      }
      return addMonths(base, 1);
    
    case "yearly":
      return addYears(base, 1);
    
    default:
      return null;
  }
}

export function calculateScheduleAdherence(
  goal: Goal,
  contributions: Array<{ amount: string; actualDate: string }>
): {
  status: "on_track" | "ahead" | "behind" | "no_schedule";
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  percentageOfTarget: number;
} {
  if (!goal.contributionFrequency || !goal.scheduledAmount || !goal.deadline) {
    return {
      status: "no_schedule",
      expectedAmount: 0,
      actualAmount: parseFloat(goal.currentAmount),
      difference: 0,
      percentageOfTarget: 0,
    };
  }

  const targetAmount = parseFloat(goal.targetAmount);
  const currentAmount = parseFloat(goal.currentAmount);
  const scheduledAmount = parseFloat(goal.scheduledAmount);
  const createdAt = new Date(goal.createdAt);
  const deadline = new Date(goal.deadline);
  const now = new Date();

  const totalDays = Math.ceil((deadline.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  let expectedContributions = 0;
  switch (goal.contributionFrequency) {
    case "daily":
      expectedContributions = daysElapsed;
      break;
    case "weekly":
      expectedContributions = Math.floor(daysElapsed / 7);
      break;
    case "monthly":
      expectedContributions = Math.floor(daysElapsed / 30);
      break;
    case "yearly":
      expectedContributions = Math.floor(daysElapsed / 365);
      break;
  }

  const expectedAmount = Math.min(
    expectedContributions * scheduledAmount,
    targetAmount
  );

  const difference = currentAmount - expectedAmount;
  const percentageOfTarget = (currentAmount / targetAmount) * 100;

  let status: "on_track" | "ahead" | "behind" = "on_track";
  if (difference > scheduledAmount) {
    status = "ahead";
  } else if (difference < -scheduledAmount) {
    status = "behind";
  }

  return {
    status,
    expectedAmount,
    actualAmount: currentAmount,
    difference,
    percentageOfTarget,
  };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function getLastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function formatFrequency(frequency: ContributionFrequency): string {
  switch (frequency) {
    case "daily": return "Daily";
    case "weekly": return "Weekly";
    case "monthly": return "Monthly";
    case "yearly": return "Yearly";
    case "flexible": return "Flexible";
    default: return "Unknown";
  }
}

export function formatDayOfWeek(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] || "Unknown";
}
