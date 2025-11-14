// Financial calculation utilities for PersonalFinance Pro

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculateNetWorth(assets: number, liabilities: number): number {
  return assets - liabilities;
}

export function calculateSavingsRatio(monthlySavings: number, monthlyIncome: number): number {
  if (monthlyIncome === 0) return 0;
  return (monthlySavings / monthlyIncome) * 100;
}

export function calculateDebtToIncome(monthlyDebtPayments: number, monthlyIncome: number): number {
  if (monthlyIncome === 0) return 0;
  return (monthlyDebtPayments / monthlyIncome) * 100;
}

export function calculateBudgetProgress(spent: number, allocated: number): number {
  if (allocated === 0) return 0;
  return (spent / allocated) * 100;
}

export function getBudgetStatus(progress: number): 'healthy' | 'warning' | 'over' {
  if (progress >= 100) return 'over';
  if (progress >= 80) return 'warning';
  return 'healthy';
}

export function getAccountTypeColor(accountType: string): string {
  const colors: Record<string, string> = {
    asset: 'text-success',
    liability: 'text-destructive',
    income: 'text-primary',
    expense: 'text-warning',
  };
  return colors[accountType] || 'text-foreground';
}

export function getAccountTypeIcon(accountType: string): string {
  const icons: Record<string, string> = {
    asset: 'trending-up',
    liability: 'trending-down',
    income: 'arrow-down-circle',
    expense: 'arrow-up-circle',
  };
  return icons[accountType] || 'circle';
}

export function formatAccountNumber(type: string, index: number): string {
  const prefixes: Record<string, number> = {
    asset: 1000,
    liability: 2000,
    income: 3000,
    expense: 4000,
  };
  const prefix = prefixes[type] || 5000;
  return `${prefix + index}`;
}

export function calculateGoalProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min((current / target) * 100, 100);
}

export function getDaysUntil(date: string): number {
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getFinancialHealthScore(
  savingsRatio: number,
  debtToIncome: number,
  emergencyFundMonths: number
): number {
  let score = 0;
  
  // Savings ratio (40 points max)
  if (savingsRatio >= 20) score += 40;
  else score += (savingsRatio / 20) * 40;
  
  // Debt-to-income ratio (30 points max)
  if (debtToIncome <= 36) score += 30;
  else score += Math.max(0, 30 - (debtToIncome - 36));
  
  // Emergency fund (30 points max)
  if (emergencyFundMonths >= 6) score += 30;
  else score += (emergencyFundMonths / 6) * 30;
  
  return Math.round(score);
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}
