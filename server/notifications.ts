import { db } from "./db";
import { budgetNotifications, notificationSubscriptions, budgets, budgetCategories } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

import webpush from 'web-push';

// Configure VAPID keys (you should set these as environment variables in production)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmrVOSKSKM5nEpK0dTYPJqy1xC0_wYDHQLB8qPHF4RHKWpWqMGQE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@personalfinancepro.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function sendPushNotification(
  userId: string,
  notification: any
) {
  try {
    const subscriptions = await db.query.notificationSubscriptions.findMany({
      where: eq(notificationSubscriptions.userId, userId),
    });

    if (subscriptions.length === 0) {
      console.log(`[PUSH] No subscriptions found for user ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        url: '/',
        severity: notification.severity,
        type: notification.type,
        budgetId: notification.budgetId,
      },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`[PUSH] ✓ Sent to user ${userId}:`, notification.title);
      } catch (error: any) {
        console.error(`[PUSH] ✗ Failed to send to subscription ${sub.id}:`, error.message);
        
        // Remove invalid subscriptions (410 Gone means unsubscribed)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[PUSH] Removing invalid subscription ${sub.id}`);
          await db.delete(notificationSubscriptions)
            .where(eq(notificationSubscriptions.id, sub.id));
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("[PUSH] Error sending push notifications:", error);
  }
}

export async function createBudgetNotification(
  userId: string,
  budgetId: string,
  type: string,
  title: string,
  message: string,
  severity: "low" | "medium" | "high" | "critical"
) {
  // Save notification to database
  const notification = await db.insert(budgetNotifications).values({
    userId,
    budgetId,
    type,
    title,
    message,
    severity,
    createdAt: new Date(),
  }).returning();

  // Send push notification if user has subscribed
  await sendPushNotification(userId, notification[0]);

  return notification[0];
}


export async function checkBudgetThresholds(userId: string, budgetId: string) {
  const budget = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.id, budgetId),
      eq(budgets.userId, userId)
    ),
  });

  if (!budget) return;

  const categories = await db.query.budgetCategories.findMany({
    where: eq(budgetCategories.budgetId, budgetId),
  });

  for (const category of categories) {
    const allocated = parseFloat(category.allocatedAmount);
    const spent = parseFloat(category.spent || '0');
    const percentage = (spent / allocated) * 100;

    await checkAndNotifyBudgetThresholds(userId, budgetId, percentage, category.category, spent, allocated);
  }
}

export async function checkAndNotifyBudgetThresholds(
  userId: string,
  budgetId: string,
  percentUsed: number,
  category: string,
  spent: number,
  allocated: number
) {
  // 75% threshold
  if (percentUsed >= 75 && percentUsed < 100) {
    const existing = await db.query.budgetNotifications.findFirst({
      where: and(
        eq(budgetNotifications.userId, userId),
        eq(budgetNotifications.budgetId, budgetId),
        eq(budgetNotifications.categoryId, category.id), // Assuming category object has an 'id' field
        eq(budgetNotifications.threshold, '75') // This might need adjustment based on how threshold is stored
      ),
    });

    if (!existing) {
      await createBudgetNotification(
        userId,
        budgetId,
        "budget_warning",
        `Budget Alert: ${category}`,
        `You've used ${percentUsed.toFixed(0)}% of your ${category} budget ($${spent.toFixed(2)} of $${allocated.toFixed(2)})`,
        "high"
      );
    }
  }

  // 100% threshold
  if (percentUsed >= 100) {
    const existing = await db.query.budgetNotifications.findFirst({
      where: and(
        eq(budgetNotifications.userId, userId),
        eq(budgetNotifications.budgetId, budgetId),
        eq(budgetNotifications.categoryId, category.id), // Assuming category object has an 'id' field
        eq(budgetNotifications.threshold, '100') // This might need adjustment based on how threshold is stored
      ),
    });

    if (!existing) {
      await createBudgetNotification(
        userId,
        budgetId,
        "budget_exceeded",
        `Budget Exceeded: ${category}`,
        `You've exceeded your ${category} budget! Spent $${spent.toFixed(2)} of $${allocated.toFixed(2)} (${percentUsed.toFixed(0)}%)`,
        "critical"
      );
    }
  }
}

export async function createGoalContributionReminder(
  userId: string,
  goalId: string,
  goalName: string,
  dueDate: string,
  scheduledAmount: string | null,
  isOverdue: boolean
) {
  const amountText = scheduledAmount ? ` of $${parseFloat(scheduledAmount).toFixed(2)}` : '';
  const title = isOverdue 
    ? `Overdue: ${goalName} contribution`
    : `Due Today: ${goalName} contribution`;
  const message = isOverdue
    ? `Your scheduled contribution${amountText} for ${goalName} was due on ${new Date(dueDate).toLocaleDateString()}`
    : `Don't forget your scheduled contribution${amountText} for ${goalName} today!`;
  
  return await createBudgetNotification(
    userId,
    goalId,
    isOverdue ? "goal_contribution_overdue" : "goal_contribution_due",
    title,
    message,
    isOverdue ? "high" : "medium"
  );
}

export async function createDebtPaymentReminder(
  userId: string,
  debtId: string,
  debtName: string,
  dueDate: string,
  paymentAmount: string | null,
  isOverdue: boolean,
  isDueSoon: boolean = false
) {
  const amountText = paymentAmount ? ` of $${parseFloat(paymentAmount).toFixed(2)}` : '';
  
  let title: string;
  let message: string;
  let severity: "low" | "medium" | "high" | "critical";

  if (isOverdue) {
    title = `⚠️ Overdue: ${debtName} payment`;
    message = `Your payment${amountText} for ${debtName} was due on ${new Date(dueDate).toLocaleDateString()}. Pay now to avoid late fees!`;
    severity = "critical";
  } else if (isDueSoon) {
    const daysUntil = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    title = `Upcoming: ${debtName} payment`;
    message = `Payment${amountText} for ${debtName} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
    severity = "medium";
  } else {
    title = `Due Today: ${debtName} payment`;
    message = `Don't forget your payment${amountText} for ${debtName} today!`;
    severity = "high";
  }
  
  return await createBudgetNotification(
    userId,
    debtId,
    isOverdue ? "debt_payment_overdue" : isDueSoon ? "debt_payment_due_soon" : "debt_payment_due",
    title,
    message,
    severity
  );
}