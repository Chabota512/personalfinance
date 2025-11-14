import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface PredictionInput {
  historicalData: any[];
  timeframe: 'weekly' | 'monthly' | 'quarterly';
}

export async function predictExpenses(userId: string, input: PredictionInput) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      predictions: [],
      message: 'Gemini API key not configured'
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
      Based on the following financial data, predict future expenses for the ${input.timeframe} timeframe:
      ${JSON.stringify(input.historicalData, null, 2)}

      Provide predictions in JSON format with categories and amounts.
      Format: { "predictions": [{ "category": "string", "amount": number, "confidence": number }] }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error('Gemini prediction error:', error);
    return {
      predictions: [],
      error: error.message
    };
  }
}

export async function generateFinancialInsights(
  userId: string,
  data: { ratios: any; patterns: any }
): Promise<{ insights: string[] }> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      insights: [
        'Configure Gemini API key in Secrets to enable AI insights',
        'Track your spending patterns manually for now',
        'Set budgets to stay on top of your finances'
      ]
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    let prompt = `You are a friendly financial advisor analyzing someone's financial health.

Financial Ratios:
- Debt to Income Ratio: ${data.ratios.debtToIncomeRatio?.toFixed(2)}%
- Savings Rate: ${data.ratios.savingsRate?.toFixed(2)}%
- Net Worth: $${data.ratios.netWorth?.toFixed(2)}
- Monthly Income: $${data.ratios.monthlyIncome?.toFixed(2)}
- Monthly Expenses: $${data.ratios.monthlyExpenses?.toFixed(2)}`;

    if (data.patterns) {
      prompt += `\n\nSpending Patterns:`;
      if (data.patterns.categoryBreakdown && data.patterns.categoryBreakdown.length > 0) {
        prompt += `\nCategory Breakdown:\n`;
        data.patterns.categoryBreakdown.forEach((cat: any) => {
          prompt += `  - ${cat.category}: $${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
        });
      }
      if (data.patterns.timePatterns?.length > 0) {
        prompt += `\nTime Patterns: ${JSON.stringify(data.patterns.timePatterns)}`;
      }
      if (data.patterns.recurringExpenses?.length > 0) {
        prompt += `\nRecurring Expenses: ${JSON.stringify(data.patterns.recurringExpenses)}`;
      }
    }

    prompt += `\n\nProvide 3-5 actionable, personalized financial insights. Focus on:
1. Positive patterns they should maintain (be encouraging!)
2. Specific savings opportunities with estimated amounts
3. Unusual spending patterns that might indicate habits to address
4. Budget recommendations based on their spending
5. Long-term financial health suggestions

Format each insight as a clear, friendly statement. Be specific with numbers when possible.
Don't number the insights, just provide them as separate lines.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response into individual insights
    const insights = text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(insight => insight.length > 15 && !insight.toLowerCase().includes('insight'));

    return { insights: insights.slice(0, 5) };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      insights: [
        'Configure your Gemini API key in Secrets to unlock personalized AI insights',
        'Track more transactions to help AI detect your spending patterns',
        'Set budgets for your top categories to get better recommendations'
      ]
    };
  }
}

export async function categorizeBatch(transactionsData: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    return transactionsData.map(t => ({
      id: t.id,
      category: 'uncategorized'
    }));
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
      Categorize these transactions into standard categories (food, transportation, housing, utilities, entertainment, healthcare, personal_care, education, other):
      ${JSON.stringify(transactionsData, null, 2)}

      Return JSON array: [{ "id": "transaction_id", "category": "category_name" }, ...]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error('Gemini categorization error:', error);
    return transactionsData.map(t => ({
      id: t.id,
      category: 'other'
    }));
  }
}