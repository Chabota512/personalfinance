
import { db } from "./db";
import { debts, debtPayments } from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import * as storage from "./storage";

export interface DebtHealthScore {
  score: number; // 0-100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    explanation: string;
    suggestion: string;
  }>;
  totalDebt: number;
  totalMonthlyPayments: number;
  debtToIncomeRatio: number;
  paymentConsistency: number;
  aiRecommendations: string[];
}

export async function calculateDebtHealthScore(userId: string): Promise<DebtHealthScore | null> {
  const activeDebts = await storage.getActiveDebtsByUserId(userId);
  
  if (activeDebts.length === 0) {
    return null; // No active debts
  }

  // Calculate totals
  const totalDebt = activeDebts.reduce((sum, d) => sum + parseFloat(d.currentBalance), 0);
  const totalMonthlyPayments = activeDebts.reduce((sum, d) => {
    if (d.paymentAmount && d.paymentFrequency === 'monthly') {
      return sum + parseFloat(d.paymentAmount);
    }
    return sum;
  }, 0);

  // Get user's monthly income from most recent debt (they all should have it)
  const monthlyIncome = activeDebts[0]?.monthlyIncome ? parseFloat(activeDebts[0].monthlyIncome) : 0;
  const debtToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyPayments / monthlyIncome) * 100 : 100;

  // Calculate payment consistency (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  let totalExpectedPayments = 0;
  let totalActualPayments = 0;
  
  for (const debt of activeDebts) {
    const payments = await storage.getDebtPaymentsByDebtId(debt.id);
    const recentPayments = payments.filter(p => new Date(p.paymentDate) >= ninetyDaysAgo);
    
    // Expected: 3 payments if monthly
    if (debt.paymentFrequency === 'monthly') {
      totalExpectedPayments += 3;
      totalActualPayments += recentPayments.length;
    }
  }
  
  const paymentConsistency = totalExpectedPayments > 0 
    ? Math.min(100, (totalActualPayments / totalExpectedPayments) * 100)
    : 100;

  // Score components
  const debtToIncomeScore = Math.max(0, 100 - debtToIncomeRatio); // <36% = 64+, <20% = 80+
  const consistencyScore = paymentConsistency;
  
  // High-risk debt check (risky repayment methods or high interest)
  const highRiskDebts = activeDebts.filter(d => 
    d.aiRiskScore && d.aiRiskScore > 70 || 
    (d.interestRate && parseFloat(d.interestRate) > 20) ||
    d.repaymentMethod === 'reborrowing_cascade'
  );
  const riskScore = Math.max(0, 100 - (highRiskDebts.length / activeDebts.length) * 50);
  
  // Progress score (are balances decreasing?)
  let progressScore = 100;
  for (const debt of activeDebts) {
    const principal = parseFloat(debt.principalAmount);
    const current = parseFloat(debt.currentBalance);
    const progress = principal > 0 ? ((principal - current) / principal) * 100 : 0;
    
    if (progress < 5 && new Date(debt.startDate) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      progressScore -= 20; // Debt older than 90 days with <5% progress
    }
  }
  progressScore = Math.max(0, progressScore);

  // Weighted score
  const score = Math.round(
    debtToIncomeScore * 0.35 +
    consistencyScore * 0.25 +
    riskScore * 0.25 +
    progressScore * 0.15
  );

  const grade = score >= 80 ? 'Excellent' :
                score >= 65 ? 'Good' :
                score >= 50 ? 'Fair' :
                score >= 35 ? 'Needs Attention' : 'Critical';

  const factors = [
    {
      name: 'Debt-to-Income Ratio',
      score: Math.round(debtToIncomeScore),
      weight: 0.35,
      explanation: `${debtToIncomeRatio.toFixed(1)}% of income goes to debt`,
      suggestion: debtToIncomeRatio > 36 ? 'Try to keep debt payments under 36% of income' : 'Healthy ratio',
    },
    {
      name: 'Payment Consistency',
      score: Math.round(consistencyScore),
      weight: 0.25,
      explanation: `${totalActualPayments}/${totalExpectedPayments} payments made in last 90 days`,
      suggestion: consistencyScore < 80 ? 'Set up automatic payments to avoid missed deadlines' : 'Great payment history',
    },
    {
      name: 'Risk Management',
      score: Math.round(riskScore),
      weight: 0.25,
      explanation: `${highRiskDebts.length} high-risk debt(s)`,
      suggestion: highRiskDebts.length > 0 ? 'Consider refinancing high-interest or risky debts' : 'Low-risk debt portfolio',
    },
    {
      name: 'Payoff Progress',
      score: Math.round(progressScore),
      weight: 0.15,
      explanation: 'Tracking reduction in principal balances',
      suggestion: progressScore < 50 ? 'Consider making extra payments to accelerate payoff' : 'Making good progress',
    },
  ];

  const aiRecommendations: string[] = [];
  
  if (debtToIncomeRatio > 43) {
    aiRecommendations.push('Critical: Debt payments exceed safe limits. Explore debt consolidation or forbearance options.');
  } else if (debtToIncomeRatio > 36) {
    aiRecommendations.push('Consider increasing income or reducing debt payments to improve cash flow.');
  }
  
  if (consistencyScore < 80) {
    aiRecommendations.push('Automate payments to improve consistency and avoid late fees.');
  }
  
  if (highRiskDebts.length > 0) {
    aiRecommendations.push(`Review ${highRiskDebts.length} high-risk debt(s) for refinancing opportunities.`);
  }
  
  if (progressScore < 50) {
    aiRecommendations.push('Accelerate payoff by applying extra payments to highest-interest debt (avalanche method).');
  }

  return {
    score,
    grade,
    factors,
    totalDebt,
    totalMonthlyPayments,
    debtToIncomeRatio,
    paymentConsistency,
    aiRecommendations,
  };
}
