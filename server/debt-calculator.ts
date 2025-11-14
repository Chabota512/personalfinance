// Debt repayment calculation utilities

interface LoanInput {
  principal: number;
  interestRate: number; // monthly rate (APR/12/100)
  periods: number; // number of months
  startDate: string;
  monthlyIncome?: number;
  monthlyLivingCosts?: number;
  maxAffordablePayment?: number;
}

interface ReborrowingInput extends LoanInput {
  reborrowPercentage: number; // e.g. 80 for 80%
  reborrowMaxCycles: number;
}

interface GraduatedInput extends LoanInput {
  graduatedBasePayment: number;
  graduatedStepPeriods: number;
  graduatedStepPercentage: number;
  graduatedAllowNegativeAmort?: boolean;
}

interface SettlementInput extends LoanInput {
  settlementCashAvailable: number;
  settlementAcceptedPercentage: number;
  settlementMinCashBuffer: number;
}

interface ForbearanceInput extends LoanInput {
  forbearanceHolidayPeriods: number;
  forbearanceRepayPeriods: number;
}

interface Projection {
  dates: string[];
  balances: number[];
  payments: number[];
  principal: number[];
  interest: number[];
  totalPaid: number;
  totalInterest: number;
  payoffDate: string;
  warnings?: Array<{ type: string; message: string }>;
}

interface MultiDebtLoan {
  id: string;
  principal: number;
  rate: number; // monthly rate
  minPayment: number;
}

interface MultiDebtComparison {
  snowball: Projection;
  avalanche: Projection;
  interestSaved: number;
  timeSaved: number; // months
}

// Helper: Add months to a date
function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

// Helper: Check if payment exceeds affordability
function checkAffordability(payment: number, income: number | undefined, livingCosts: number | undefined): { type: 'critical' | 'warning' | 'info'; message: string; amount?: number } | null {
  if (!income || !livingCosts) return null;

  const disposableIncome = income - livingCosts;
  if (payment > disposableIncome) {
    return {
      type: 'critical',
      message: `Payment of $${payment.toFixed(2)} exceeds disposable income of $${disposableIncome.toFixed(2)}`,
      amount: payment
    };
  }

  if (payment > disposableIncome * 0.5) {
    return {
      type: 'warning',
      message: `Payment of $${payment.toFixed(2)} exceeds 50% of disposable income`,
      amount: payment
    };
  }

  return null;
}

// 1. BULLET REPAYMENT
export function calculateBullet(input: LoanInput): Projection {
  const { principal, interestRate, periods, startDate } = input;
  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  const totalInterest = principal * interestRate * periods;
  const totalDue = principal + totalInterest;
  let balance = principal;

  for (let i = 0; i <= periods; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);

    if (i < periods) {
      // No payment during term
      payments.push(0);
      principalArr.push(0);
      interestArr.push(0);
      balances.push(balance);
    } else {
      // Final balloon payment
      payments.push(totalDue);
      principalArr.push(principal);
      interestArr.push(totalInterest);
      balances.push(0);
    }
  }

  // Check if balloon payment is risky
  if (input.monthlyIncome && input.monthlyLivingCosts) {
    const disposable = input.monthlyIncome - input.monthlyLivingCosts;
    if (totalDue > disposable * 0.8) {
      warnings.push({
        type: 'critical',
        message: `Final payment of $${totalDue.toFixed(2)} requires 80%+ of your spare cash`
      });
    }
  }

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid: totalDue,
    totalInterest,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}

// 2. CLASSIC AMORTIZING (Annuity Formula)
export function calculateAmortization(input: LoanInput): Projection {
  const { principal, interestRate, periods, startDate, monthlyIncome, monthlyLivingCosts, maxAffordablePayment } = input;

  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  // Calculate fixed payment using annuity formula
  const fixedPayment = interestRate === 0
    ? principal / periods
    : (principal * interestRate * Math.pow(1 + interestRate, periods)) / (Math.pow(1 + interestRate, periods) - 1);

  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;

  // Check affordability of fixed payment
  const affordWarning = checkAffordability(fixedPayment, monthlyIncome, monthlyLivingCosts);
  if (affordWarning) warnings.push({ ...affordWarning, period: 0 });

  if (maxAffordablePayment && fixedPayment > maxAffordablePayment) {
    warnings.push({
      type: 'critical',
      message: `Fixed payment of $${fixedPayment.toFixed(2)} exceeds max affordable payment of $${maxAffordablePayment.toFixed(2)}`,
      period: 0,
      amount: fixedPayment
    });
  }

  for (let i = 0; i <= periods; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);

    if (i < periods && balance > 0.01) {
      const interestPayment = balance * interestRate;
      const principalPayment = fixedPayment - interestPayment;

      payments.push(fixedPayment);
      principalArr.push(principalPayment);
      interestArr.push(interestPayment);

      balance = Math.max(0, balance - principalPayment);
      totalInterest += interestPayment;
      totalPaid += fixedPayment;
    } else {
      payments.push(0);
      principalArr.push(0);
      interestArr.push(0);
    }
    balances.push(balance);
  }

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid,
    totalInterest,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}

// 3. RE-BORROWING CASCADE
export function calculateReborrowingCascade(input: ReborrowingInput): Projection {
  const { principal, interestRate, periods, startDate, reborrowPercentage, reborrowMaxCycles } = input;
  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  let cycle = 0;
  const reborrowFactor = reborrowPercentage / 100;

  for (let i = 0; i <= periods && balance > 0.01; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);

    const interestPayment = balance * interestRate;
    const fullPayment = balance + interestPayment;

    payments.push(fullPayment);
    principalArr.push(balance);
    interestArr.push(interestPayment);

    totalInterest += interestPayment;
    totalPaid += fullPayment;

    // Re-borrow if within cycle limit
    if (cycle < reborrowMaxCycles && i < periods - 1) {
      balance = balance * reborrowFactor;
      cycle++;
    } else {
      balance = 0;
    }

    balances.push(balance);
  }

  // Fill remaining periods
  while (dates.length <= periods) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + dates.length);
    dates.push(date.toISOString().split('T')[0]);
    balances.push(0);
    payments.push(0);
    principalArr.push(0);
    interestArr.push(0);
  }

  warnings.push({
    type: 'warning',
    message: `Cascade creates ${cycle} re-borrowing cycles - mathematically expensive`
  });

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid,
    totalInterest,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}

// 4. INTEREST-ONLY + BALLOON
export function calculateInterestOnlyBalloon(input: LoanInput): Projection {
  const { principal, interestRate, periods, startDate } = input;
  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  const interestPayment = principal * interestRate;
  const totalInterest = interestPayment * periods;
  let balance = principal;

  for (let i = 0; i <= periods; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);

    if (i < periods) {
      payments.push(interestPayment);
      principalArr.push(0);
      interestArr.push(interestPayment);
      balances.push(balance);
    } else {
      // Final balloon payment
      payments.push(principal + interestPayment);
      principalArr.push(principal);
      interestArr.push(interestPayment);
      balances.push(0);
    }
  }

  // Check balloon payment risk
  if (input.monthlyIncome && input.monthlyLivingCosts) {
    const disposable = input.monthlyIncome - input.monthlyLivingCosts;
    if (principal > disposable * 0.7) {
      warnings.push({
        type: 'critical',
        message: `Balloon payment of $${principal.toFixed(2)} requires 70%+ of spare cash`
      });
    }
  }

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid: principal + totalInterest,
    totalInterest,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}

// 5. EQUAL PRINCIPAL + DECLINING INTEREST
export function calculateEqualPrincipal(input: LoanInput): Projection {
  const { principal, interestRate, periods, startDate, monthlyIncome, monthlyLivingCosts, maxAffordablePayment } = input;
  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  const principalPerPeriod = principal / periods;
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;

  for (let i = 0; i <= periods; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);
    balances.push(balance);

    if (i < periods) {
      const interestPayment = balance * interestRate;
      const payment = principalPerPeriod + interestPayment;

      payments.push(payment);
      principalArr.push(principalPerPeriod);
      interestArr.push(interestPayment);

      balance -= principalPerPeriod;
      totalInterest += interestPayment;
      totalPaid += payment;

      // Check first period payment (highest)
      if (i === 0) {
        if (maxAffordablePayment && payment > maxAffordablePayment) {
          warnings.push({
            type: 'critical',
            message: `First payment of $${payment.toFixed(2)} exceeds max affordable payment of $${maxAffordablePayment.toFixed(2)}`,
            period: 0,
            amount: payment
          });
        }

        const affordWarning = checkAffordability(payment, monthlyIncome, monthlyLivingCosts);
        if (affordWarning) warnings.push({ ...affordWarning, period: 0 });
      }
    } else {
      payments.push(0);
      principalArr.push(0);
      interestArr.push(0);
    }
  }

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid,
    totalInterest,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}

// 6. GRADUATED (STEP-UP) PAYMENTS
export function calculateGraduated(input: GraduatedInput): Projection {
  const {
    principal,
    interestRate,
    periods,
    startDate,
    graduatedBasePayment = 0,
    graduatedStepPeriods = 3,
    graduatedStepPercentage = 25,
    graduatedAllowNegativeAmort = false,
    monthlyIncome,
    monthlyLivingCosts
  } = input;

  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  let balance = principal;
  let currentPayment = graduatedBasePayment;
  const stepIncrease = 1 + (graduatedStepPercentage / 100);
  let totalInterest = 0;
  let totalPaid = 0;

  for (let i = 0; i <= periods; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);
    balances.push(balance);

    if (i < periods && balance > 0.01) {
      // Increase payment every N periods
      if (i > 0 && i % graduatedStepPeriods === 0) {
        currentPayment *= stepIncrease;
      }

      const interestPayment = balance * interestRate;

      // If negative amortization not allowed, ensure payment >= interest
      let actualPayment = currentPayment;
      if (!graduatedAllowNegativeAmort && currentPayment < interestPayment) {
        actualPayment = interestPayment;
        warnings.push({
          type: 'info',
          message: `Period ${i}: Payment increased to $${interestPayment.toFixed(2)} to prevent negative amortization`,
          period: i,
          amount: interestPayment
        });
      }

      const principalPayment = Math.max(0, actualPayment - interestPayment);

      payments.push(actualPayment);
      principalArr.push(principalPayment);
      interestArr.push(interestPayment);

      balance = Math.max(0, balance - principalPayment);
      totalInterest += interestPayment;
      totalPaid += actualPayment;

      // Check final stepped payment affordability
      if (i === periods - 1) {
        const affordWarning = checkAffordability(actualPayment, monthlyIncome, monthlyLivingCosts);
        if (affordWarning) {
          warnings.push({
            ...affordWarning,
            period: i,
            message: `Final payment of $${actualPayment.toFixed(2)} may exceed income capacity`
          });
        }
      }
    } else if (i === periods) {
      payments.push(0);
      principalArr.push(0);
      interestArr.push(0);
    }
  }

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid,
    totalInterest,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}

// 7. SNOWBALL vs AVALANCHE (Multi-Debt)
export function calculateSnowballVsAvalanche(
  loans: MultiDebtLoan[],
  surplus: number,
  startDate: string
): MultiDebtComparison {
  // SNOWBALL: Sort by principal (smallest first)
  const snowballLoans = [...loans].sort((a, b) => a.principal - b.principal);
  const snowballProjection = calculateMultiDebtStrategy(snowballLoans, surplus, startDate);

  // AVALANCHE: Sort by rate (highest first)
  const avalancheLoans = [...loans].sort((a, b) => b.rate - a.rate);
  const avalancheProjection = calculateMultiDebtStrategy(avalancheLoans, startDate);

  const interestSaved = snowballProjection.totalInterest - avalancheProjection.totalInterest;
  const timeSaved = snowballProjection.dates.length - avalancheProjection.dates.length;

  return {
    snowball: snowballProjection,
    avalanche: avalancheProjection,
    interestSaved,
    timeSaved
  };
}

function calculateMultiDebtStrategy(
  loans: MultiDebtLoan[],
  surplus: number,
  startDate: string
): Projection {
  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  // Clone loans with balance tracking
  const activeLoans = loans.map(l => ({ ...l, balance: l.principal }));

  let period = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (activeLoans.some(l => l.balance > 0.01)) {
    dates.push(addMonths(startDate, period));

    let periodPayment = 0;
    let availableSurplus = surplus;

    // Pay minimums on all debts
    for (const loan of activeLoans) {
      if (loan.balance > 0.01) {
        const interest = loan.balance * loan.rate;
        const minPayment = Math.min(loan.minPayment, loan.balance + interest);
        const principalPaid = Math.max(0, minPayment - interest);

        loan.balance = Math.max(0, loan.balance - principalPaid);
        totalInterest += interest;
        periodPayment += minPayment;
        totalPaid += minPayment;
      }
    }

    // Throw surplus at target (first non-zero loan in sorted order)
    const targetLoan = activeLoans.find(l => l.balance > 0.01);
    if (targetLoan && availableSurplus > 0) {
      const extraPayment = Math.min(availableSurplus, targetLoan.balance);
      targetLoan.balance = Math.max(0, targetLoan.balance - extraPayment);
      periodPayment += extraPayment;
      totalPaid += extraPayment;
    }

    payments.push(periodPayment);

    // Aggregate balance
    const aggregateBalance = activeLoans.reduce((sum, l) => sum + l.balance, 0);
    balances.push(aggregateBalance);

    period++;

    // Safety check
    if (period > 1000) {
      warnings.push({
        type: 'critical',
        message: 'Strategy did not converge within 1000 periods'
      });
      break;
    }
  }

  return {
    dates,
    balances,
    payments,
    principalPayments: [], // Not tracked individually
    interestPayments: [],
    totalInterest,
    totalPaid,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}

// 8. NEGOTIATED SETTLEMENT
export function calculateSettlement(input: SettlementInput): Projection {
  const { principal, startDate, settlementCashAvailable, settlementAcceptedPercentage, settlementMinCashBuffer } = input;
  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  const requiredCash = principal * (settlementAcceptedPercentage / 100);
  const date = new Date(startDate);
  dates.push(date.toISOString().split('T')[0]);

  if (settlementCashAvailable < requiredCash) {
    warnings.push({
      type: 'critical',
      message: `Need $${requiredCash.toFixed(2)} cash (${settlementAcceptedPercentage}% of principal), you have $${settlementCashAvailable.toFixed(2)}`
    });
    // Return unfeasible projection
    balances.push(principal);
    payments.push(0);
    principalArr.push(0);
    interestArr.push(0);
  } else {
    const cashAfterSettlement = settlementCashAvailable - requiredCash;
    if (cashAfterSettlement < settlementMinCashBuffer) {
      warnings.push({
        type: 'warning',
        message: `Settlement leaves only $${cashAfterSettlement.toFixed(2)} buffer (recommended: $${settlementMinCashBuffer.toFixed(2)})`
      });
    }

    balances.push(principal);
    balances.push(0);
    payments.push(requiredCash);
    principalArr.push(requiredCash);
    interestArr.push(0);
  }

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid: requiredCash,
    totalInterest: 0,
    payoffDate: dates[0],
    warnings
  };
}

// 9. FORBEARANCE (Payment Holiday)
export function calculateForbearance(input: ForbearanceInput): Projection {
  const { principal, interestRate, periods, startDate, forbearanceHolidayPeriods, forbearanceRepayPeriods } = input;
  const dates: string[] = [];
  const balances: number[] = [];
  const payments: number[] = [];
  const principalArr: number[] = [];
  const interestArr: number[] = [];
  const warnings: Array<{ type: string; message: string }> = [];

  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  let accruedInterest = 0;

  for (let i = 0; i <= periods; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);

    if (i < forbearanceHolidayPeriods) {
      // Holiday phase - no payment, interest accrues
      const interestPayment = balance * interestRate;
      balance += interestPayment;
      accruedInterest += interestPayment;

      payments.push(0);
      principalArr.push(0);
      interestArr.push(interestPayment);
      balances.push(balance);
      totalInterest += interestPayment;

    } else if (i < forbearanceHolidayPeriods + forbearanceRepayPeriods) {
      // Catch-up phase - repay accrued interest
      const catchUpPayment = accruedInterest / forbearanceRepayPeriods;

      payments.push(catchUpPayment);
      principalArr.push(0);
      interestArr.push(catchUpPayment);
      balances.push(balance);
      totalPaid += catchUpPayment;

    } else {
      // Normal amortization for remaining periods
      const remainingPeriods = periods - i;
      if (remainingPeriods > 0 && balance > 0) {
        const rate = interestRate;
        const monthlyPayment = (balance * rate) / (1 - Math.pow(1 + rate, -remainingPeriods));
        const interestPayment = balance * rate;
        const principalPayment = monthlyPayment - interestPayment;

        payments.push(monthlyPayment);
        principalArr.push(principalPayment);
        interestArr.push(interestPayment);

        balance -= principalPayment;
        totalInterest += interestPayment;
        totalPaid += monthlyPayment;
        balances.push(balance);
      } else {
        payments.push(0);
        principalArr.push(0);
        interestArr.push(0);
        balances.push(0);
      }
    }
  }

  warnings.push({
    type: 'warning',
    message: `Forbearance adds $${accruedInterest.toFixed(2)} in accrued interest during holiday`
  });

  return {
    dates,
    balances,
    payments,
    principal: principalArr,
    interest: interestArr,
    totalPaid,
    totalInterest,
    payoffDate: dates[dates.length - 1],
    warnings
  };
}