
import fs from 'fs';
import path from 'path';
import { getRecentInsightsHistory, storeInsightsHistory } from './ai-memory';

// Simple in-memory cache (replace with Replit DB in production)
const insightsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

interface ScoreData {
  savingsScore: number;
  savingsRate: number;
  budgetScore: number;
  budgetCount: number;
  debtScore: number;
  debtRatio: number;
  emergencyScore: number;
  emergencyMonths: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
  totalDebt: number;
  grade: string;
}

interface AIInsights {
  factorInsights: Array<{
    name: string;
    explanation: string;
    suggestion: string;
  }>;
  top3Recommendations: string[];
  overallSummary: string;
}

function getFallbackInsights(grade: string): AIInsights {
  const fallbackPath = path.join(process.cwd(), 'server', 'data', 'fallback.json');
  const fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
  
  const gradeKey = grade.toLowerCase().replace(' ', '_');
  const fallback = fallbackData[gradeKey] || fallbackData.needs_improvement;
  
  // Ensure overallSummary exists
  if (!fallback.overallSummary) {
    fallback.overallSummary = "Your financial journey is progressing. Focus on consistent habits.";
  }
  
  return fallback;
}

function buildPrompt(scores: ScoreData, previousInsights?: AIInsights, historicalData?: any[]): string {
  const templatePath = path.join(process.cwd(), 'server', 'prompts', 'financialHealth.txt');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace placeholders
  template = template
    .replace('{savingsScore}', scores.savingsScore.toString())
    .replace('{savingsRate}', scores.savingsRate.toFixed(1))
    .replace('{budgetScore}', scores.budgetScore.toString())
    .replace('{budgetCount}', scores.budgetCount.toString())
    .replace('{debtScore}', scores.debtScore.toString())
    .replace('{debtRatio}', scores.debtRatio.toFixed(1))
    .replace('{emergencyScore}', scores.emergencyScore.toString())
    .replace('{emergencyMonths}', scores.emergencyMonths.toFixed(1))
    .replace('{grade}', scores.grade)
    .replace('{monthlyIncome}', scores.monthlyIncome.toFixed(2))
    .replace('{monthlyExpenses}', scores.monthlyExpenses.toFixed(2))
    .replace('{netWorth}', scores.netWorth.toFixed(2))
    .replace('{totalDebt}', scores.totalDebt.toFixed(2));
  
  // Add historical trend analysis
  if (historicalData && historicalData.length > 0) {
    template += `\n\nHISTORICAL TRENDS (last ${historicalData.length} analyses):\n`;
    historicalData.forEach((entry: any, i: number) => {
      const daysAgo = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24));
      template += `\n${daysAgo} days ago (Score: ${entry.score}):\n`;
      if (entry.insights.top3Recommendations) {
        entry.insights.top3Recommendations.forEach((rec: string, j: number) => {
          template += `  ${j + 1}. ${rec}\n`;
        });
      }
      if (entry.user_feedback) {
        const feedback = entry.user_feedback;
        template += `  User feedback: ${feedback.helpful ? 'Helpful' : 'Not helpful'}`;
        if (feedback.followedRecommendations && feedback.followedRecommendations.length > 0) {
          template += ` | Followed: ${feedback.followedRecommendations.join(', ')}`;
        }
        template += `\n`;
      }
    });
    template += `\nANALYZE these trends: Are they improving? Declining? Stagnant? Has the user followed previous advice? Be specific about what's working and what needs adjustment.`;
  }
  
  // Add context from previous insights if available
  if (previousInsights) {
    template += `\n\nMOST RECENT RECOMMENDATIONS:\n`;
    previousInsights.top3Recommendations.forEach((rec, i) => {
      template += `${i + 1}. ${rec}\n`;
    });
    template += `\nConsider if progress has been made on these items when generating new insights.`;
  }
  
  return template;
}

function truncateIfNeeded(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find last complete sentence before maxLength
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  
  if (lastPeriod > maxLength * 0.7) {
    return truncated.substring(0, lastPeriod + 1);
  }
  
  return truncated.substring(0, maxLength - 3) + '...';
}

export async function generateInsights(
  scores: ScoreData,
  userId: string
): Promise<AIInsights> {
  const startTime = Date.now();
  
  // Check cache
  const cacheKey = `insights:${userId}`;
  const cached = insightsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log({ userId, source: 'cache', duration: Date.now() - startTime });
    return cached.data;
  }
  
  // Get historical insights from database for true learning
  const insightsHistory = await getRecentInsightsHistory(userId, 3);
  
  // Store previous insights before they expire
  const previousInsights = cached?.data;
  
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log({ userId, source: 'fallback', reason: 'no_api_key' });
    return getFallbackInsights(scores.grade);
  }
  
  try {
    const prompt = buildPrompt(scores, previousInsights, insightsHistory);
    
    // Determine which API to use
    const isGemini = process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY;
    const isGroq = process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY;
    const apiUrl = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    
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
            content: 'You are a helpful financial coach. Return only valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response (handle markdown code blocks if present)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }
    
    const insights: AIInsights = JSON.parse(jsonContent);
    
    // Truncate if needed
    insights.factorInsights.forEach(factor => {
      factor.explanation = truncateIfNeeded(factor.explanation, 100);
      factor.suggestion = truncateIfNeeded(factor.suggestion, 120);
    });
    insights.top3Recommendations = insights.top3Recommendations.map(rec => 
      truncateIfNeeded(rec, 80)
    );
    insights.overallSummary = truncateIfNeeded(insights.overallSummary, 150);
    
    // Cache the result
    insightsCache.set(cacheKey, { data: insights, timestamp: Date.now() });
    
    // Store in persistent history for true learning
    await storeInsightsHistory(userId, insights, scores.score);
    
    const duration = Date.now() - startTime;
    const tokens = data.usage?.total_tokens || 0;
    console.log({ userId, source: 'ai', duration, tokens, provider: isGroq ? 'groq' : 'openai' });
    
    return insights;
    
  } catch (error) {
    console.error('AI insights generation failed:', error);
    console.log({ userId, source: 'fallback', reason: 'ai_error', duration: Date.now() - startTime });
    return getFallbackInsights(scores.grade);
  }
}
