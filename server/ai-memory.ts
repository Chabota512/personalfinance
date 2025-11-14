
import { db } from './db';
import { sql } from 'drizzle-orm';

// Add this table to your schema
// export const aiInsightsHistory = pgTable('ai_insights_history', {
//   id: text('id').primaryKey().default(sql`gen_random_uuid()`),
//   userId: text('user_id').notNull().references(() => users.id),
//   insights: jsonb('insights').notNull(),
//   score: integer('score').notNull(),
//   createdAt: timestamp('created_at').defaultNow(),
//   userFeedback: jsonb('user_feedback'), // { helpful: boolean, followedRecommendations: string[] }
// });

export async function storeInsightsHistory(
  userId: string,
  insights: any,
  score: number
) {
  // Store in database instead of just cache
  await db.execute(sql`
    INSERT INTO ai_insights_history (user_id, insights, score, created_at)
    VALUES (${userId}, ${JSON.stringify(insights)}, ${score}, NOW())
  `);
}

export async function getRecentInsightsHistory(userId: string, limit = 5) {
  // Get last N insights to pass to AI for context
  const history = await db.execute(sql`
    SELECT insights, score, created_at
    FROM ai_insights_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  
  return history.rows;
}

export async function recordUserFeedback(
  userId: string,
  insightId: string,
  feedback: { helpful: boolean; followedRecommendations?: string[] }
) {
  await db.execute(sql`
    UPDATE ai_insights_history
    SET user_feedback = ${JSON.stringify(feedback)}
    WHERE id = ${insightId} AND user_id = ${userId}
  `);
}
