
import { db } from "./db";
import { goals, debts, users } from "@shared/schema";
import { eq, and, lt, lte } from "drizzle-orm";
import { createGoalContributionReminder } from "./notifications";
import * as storage from "./storage";

// Check for due and overdue goal contributions
export async function checkGoalContributions() {
  try {
    console.log('[SCHEDULER] Checking goal contributions...');
    
    const allGoals = await db.query.goals.findMany({
      where: eq(goals.status, 'active'),
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let notificationsSent = 0;

    for (const goal of allGoals) {
      if (!goal.nextScheduledContribution || goal.contributionMode === "completely_flexible") {
        continue;
      }

      const nextDate = new Date(goal.nextScheduledContribution);
      nextDate.setHours(0, 0, 0, 0);

      const isOverdue = nextDate < today;
      const isDueToday = nextDate.getTime() === today.getTime();

      if (isDueToday || isOverdue) {
        await createGoalContributionReminder(
          goal.userId,
          goal.id,
          goal.name,
          goal.nextScheduledContribution,
          goal.scheduledAmount,
          isOverdue
        );
        notificationsSent++;
      }
    }

    console.log(`[SCHEDULER] Sent ${notificationsSent} goal contribution reminders`);
  } catch (error) {
    console.error('[SCHEDULER] Error checking goal contributions:', error);
  }
}

// Check for due and overdue debt payments
export async function checkDebtPayments() {
  try {
    console.log('[SCHEDULER] Checking debt payments...');
    
    const activeDebts = await db.query.debts.findMany({
      where: eq(debts.isActive, true),
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let notificationsSent = 0;

    for (const debt of activeDebts) {
      if (!debt.nextPaymentDue) {
        continue;
      }

      const dueDate = new Date(debt.nextPaymentDue);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdue = dueDate < today;
      const isDueToday = dueDate.getTime() === today.getTime();
      const isDueSoon = dueDate.getTime() <= today.getTime() + (3 * 24 * 60 * 60 * 1000); // 3 days

      if (isDueToday || isOverdue || isDueSoon) {
        const { createDebtPaymentReminder } = await import("./notifications");
        await createDebtPaymentReminder(
          debt.userId,
          debt.id,
          debt.name,
          debt.nextPaymentDue,
          debt.paymentAmount,
          isOverdue,
          isDueSoon && !isDueToday && !isOverdue
        );
        notificationsSent++;
      }
    }

    console.log(`[SCHEDULER] Sent ${notificationsSent} debt payment reminders`);
  } catch (error) {
    console.error('[SCHEDULER] Error checking debt payments:', error);
  }
}

// Run all scheduled checks
export async function runDailyChecks() {
  console.log('[SCHEDULER] Running daily checks at', new Date().toISOString());
  await checkGoalContributions();
  await checkDebtPayments();
  console.log('[SCHEDULER] Daily checks completed');
}

// Initialize scheduler - runs every hour
export function initializeScheduler() {
  console.log('[SCHEDULER] Initializing scheduler...');
  
  // Run immediately on startup
  runDailyChecks();
  
  // Then run every hour
  const HOUR_IN_MS = 60 * 60 * 1000;
  setInterval(runDailyChecks, HOUR_IN_MS);
  
  console.log('[SCHEDULER] Scheduler initialized - running every hour');
}
