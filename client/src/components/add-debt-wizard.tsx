import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, TrendingDown, Calendar, DollarSign, BarChart3, Target, TrendingUp, Circle, Mountain, Snowflake, Handshake, Pause } from "lucide-react";
import { VoiceRecorder } from "./voice-recorder";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/financial-utils";
import { useAccounts } from "@/lib/api";

interface DebtWizardData {
  // Step 1: Basic Info
  name: string;
  creditorDebtor: string;
  principalAmount: string;
  interestRate: string;
  rateFrequency: 'week' | 'month' | 'year';
  length: string;
  lengthUnit: 'weeks' | 'months' | 'years';

  // Alternative input mode
  knowTotalOnly?: boolean;
  totalRepayment?: string;
  calculatedInterestRate?: string;

  // Step 2: Repayment Method
  repaymentMethod: string;

  // Step 3: Reasons
  reasons: string;
  reasonsTranscription: string;

  // User context
  monthlyIncome: string;
  monthlyLivingCosts: string;
}

interface AddDebtWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: DebtWizardData & { aiAnalysis?: any; projection?: any }) => void;
}

const REPAYMENT_METHODS = [
  {
    id: 'amortization',
    name: 'Classic Amortization',
    description: 'Fixed monthly payments that cover both principal and interest. Most common for mortgages and car loans.',
    icon: BarChart3,
    pros: ['Predictable monthly payments', 'Steady debt reduction', 'Common and well-understood'],
    cons: ['Higher early interest payments', 'Less flexibility']
  },
  {
    id: 'bullet',
    name: 'Bullet Payment',
    description: 'Pay only interest during the term, then repay the full principal at the end.',
    icon: Target,
    pros: ['Lower monthly payments during term', 'Better cash flow management'],
    cons: ['Large final payment', 'No principal reduction until end', 'Higher total interest']
  },
  {
    id: 'equal_principal',
    name: 'Equal Principal',
    description: 'Pay the same principal amount each period, plus decreasing interest.',
    icon: TrendingDown,
    pros: ['Faster debt reduction', 'Lower total interest', 'Decreasing payments over time'],
    cons: ['Higher initial payments', 'Requires more discipline early on']
  },
  {
    id: 'graduated',
    name: 'Graduated Payments',
    description: 'Payments start lower and increase over time. Good if you expect income to grow.',
    icon: TrendingUp,
    pros: ['Easier to manage initially', 'Good for growing income', 'More affordable early on'],
    cons: ['Higher total interest', 'Risk of negative amortization', 'Increasing obligations']
  },
  {
    id: 'interest_only_balloon',
    name: 'Interest-Only with Balloon',
    description: 'Pay only interest for a period, then switch to full amortization.',
    icon: Circle,
    pros: ['Very low initial payments', 'Time to improve finances'],
    cons: ['No early principal reduction', 'Payment shock when switching', 'Higher total cost']
  },
  {
    id: 'avalanche',
    name: 'Avalanche Method',
    description: 'Pay minimums on all debts, then extra toward highest interest rate first.',
    icon: Mountain,
    pros: ['Saves most interest', 'Fastest payoff mathematically', 'Efficient strategy'],
    cons: ['Less psychological wins', 'Requires discipline', 'Slower visible progress']
  },
  {
    id: 'snowball',
    name: 'Snowball Method',
    description: 'Pay minimums on all debts, then extra toward smallest balance first.',
    icon: Snowflake,
    pros: ['Quick psychological wins', 'Motivating progress', 'Simpler to follow'],
    cons: ['May cost more in interest', 'Not mathematically optimal']
  },
  {
    id: 'settlement',
    name: 'Debt Settlement',
    description: 'Negotiate to pay less than the full amount owed.',
    icon: Handshake,
    pros: ['Can significantly reduce debt', 'Faster resolution'],
    cons: ['Damages credit score', 'Tax implications', 'Not always accepted']
  },
  {
    id: 'forbearance',
    name: 'Forbearance',
    description: 'Temporarily pause or reduce payments, then catch up later.',
    icon: Pause,
    pros: ['Immediate relief', 'Avoids default', 'Buys time'],
    cons: ['Interest still accrues', 'Larger payments later', 'Extends debt term']
  }
];

export function AddDebtWizard({ open, onClose, onComplete }: AddDebtWizardProps) {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [projection, setProjection] = useState<any>(null);
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const [formData, setFormData] = useState<DebtWizardData>({
    name: "",
    creditorDebtor: "",
    principalAmount: "",
    interestRate: "",
    rateFrequency: 'month',
    length: "",
    lengthUnit: 'months',
    repaymentMethod: "amortization",
    reasons: "",
    reasonsTranscription: "",
    monthlyIncome: "",
    monthlyLivingCosts: ""
  });

  // Auto-populate income and expenses using hybrid approach
  useEffect(() => {
    if (open && !formData.monthlyIncome && !formData.monthlyLivingCosts) {
      const fetchFinancialData = async () => {
        try {
          let income = "";
          let expenses = "";
          let source = "";

          // Step 1: Try current month cash flow (actual spending)
          try {
            const today = new Date();
            const currentMonth = today.toISOString().slice(0, 7);

            const cashFlowResponse = await fetch(`/api/cash-flow?month=${currentMonth}`, {
              credentials: 'include'
            });

            if (cashFlowResponse.ok) {
              const cashFlowData = await cashFlowResponse.json();
              if (cashFlowData.income > 0 || cashFlowData.expenses > 0) {
                income = cashFlowData.income.toString();
                expenses = Math.abs(cashFlowData.expenses).toString();
                source = "current month transactions";
              }
            }
          } catch (error) {
            console.error('Cash flow fetch failed:', error);
          }

          // Step 2: If no cash flow data, try active budgets (planned spending)
          if (!income && !expenses) {
            try {
              const budgetsResponse = await fetch('/api/budgets/active', {
                credentials: 'include'
              });

              if (budgetsResponse.ok) {
                const budgets = await budgetsResponse.json();
                if (budgets && budgets.length > 0) {
                  // Sum up allocated amounts from all active budgets
                  const totalBudgeted = budgets.reduce((sum: number, b: any) => {
                    return sum + parseFloat(b.allocatedAmount || "0");
                  }, 0);

                  if (totalBudgeted > 0) {
                    // Estimate income as 1.2x of budgeted expenses (assuming 20% savings)
                    income = (totalBudgeted * 1.2).toFixed(2);
                    expenses = totalBudgeted.toFixed(2);
                    source = "active budgets";
                  }
                }
              }
            } catch (error) {
              console.error('Budgets fetch failed:', error);
            }
          }

          // Step 3: If still no data, try financial ratios (3-month average)
          if (!income && !expenses) {
            try {
              const ratiosResponse = await fetch('/api/analytics/financial-ratios', {
                credentials: 'include'
              });

              if (ratiosResponse.ok) {
                const ratios = await ratiosResponse.json();
                if (ratios.monthlyIncome > 0 || ratios.monthlyExpenses > 0) {
                  income = ratios.monthlyIncome.toString();
                  expenses = ratios.monthlyExpenses.toString();
                  source = "3-month average";
                }
              }
            } catch (error) {
              console.error('Financial ratios fetch failed:', error);
            }
          }

          // Update form data with the best available data
          if (income || expenses) {
            setFormData(prev => ({
              ...prev,
              monthlyIncome: income,
              monthlyLivingCosts: expenses,
              _dataSource: source // Store source for display
            }));
          }
        } catch (error) {
          console.error('Failed to fetch financial data:', error);
        }
      };

      fetchFinancialData();
    }
  }, [open]);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleNext = async () => {
    if (step === 4) {
      // Run AI analysis before showing projections
      await runAIAnalysis();
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Normalize interest rate to APR
      // Use calculated rate if in "total only" mode, otherwise use entered rate
      let annualRate = formData.knowTotalOnly && formData.calculatedInterestRate
        ? parseFloat(formData.calculatedInterestRate)
        : parseFloat(formData.interestRate || "0");

      // If not already annual, convert based on frequency
      if (!formData.knowTotalOnly) {
        if (formData.rateFrequency === 'week') {
          annualRate = annualRate * 52;
        } else if (formData.rateFrequency === 'month') {
          annualRate = annualRate * 12;
        }
      }

      // Normalize periods to months
      let totalPeriods = parseInt(formData.length);
      if (formData.lengthUnit === 'weeks') {
        totalPeriods = Math.ceil(totalPeriods / 4.33);
      } else if (formData.lengthUnit === 'years') {
        totalPeriods = totalPeriods * 12;
      }

      const response = await fetch('/api/debts/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal: parseFloat(formData.principalAmount),
          interestRate: annualRate,
          periods: totalPeriods,
          repaymentMethod: formData.repaymentMethod,
          reasons: formData.reasons || formData.reasonsTranscription,
          monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
          monthlyLivingCosts: parseFloat(formData.monthlyLivingCosts) || 0
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysis(result.analysis);
        setProjection(result.projection);
      } else {
        toast({
          title: "Analysis unavailable",
          description: "Continuing without AI analysis",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComplete = () => {
    onComplete({
      ...formData,
      aiAnalysis: analysis,
      projection: projection
    });
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setAnalysis(null);
    setProjection(null);
    setFormData({
      name: "",
      creditorDebtor: "",
      principalAmount: "",
      interestRate: "",
      rateFrequency: 'month',
      length: "",
      lengthUnit: 'months',
      repaymentMethod: "amortization",
      reasons: "",
      reasonsTranscription: "",
      monthlyIncome: "",
      monthlyLivingCosts: ""
    });
  };

  const selectedMethod = REPAYMENT_METHODS.find(m => m.id === formData.repaymentMethod);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Debt</DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps}: {
              step === 1 ? "Basic Information" :
              step === 2 ? "Choose Repayment Method" :
              step === 3 ? "Record Your Reasons" :
              step === 4 ? "AI Risk Analysis" :
              "Review & Confirm"
            }
          </DialogDescription>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Debt Name *</Label>
                <Input
                  id="name"
                  data-testid="input-debt-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Car Loan, Credit Card"
                />
              </div>

              <div>
                <Label htmlFor="creditor">Lender/Creditor Name *</Label>
                <Input
                  id="creditor"
                  data-testid="input-creditor"
                  value={formData.creditorDebtor}
                  onChange={(e) => setFormData({ ...formData, creditorDebtor: e.target.value })}
                  placeholder="e.g., ABC Bank"
                />
              </div>

              <div>
                <Label htmlFor="principal">Amount Owed (Principal) *</Label>
                <Input
                  id="principal"
                  data-testid="input-principal"
                  type="number"
                  step="0.01"
                  value={formData.principalAmount}
                  onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="length">Loan Term *</Label>
                  <Input
                    id="length"
                    data-testid="input-length"
                    type="number"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    placeholder="12"
                  />
                </div>
                <div>
                  <Label htmlFor="length-unit">Units</Label>
                  <Select value={formData.lengthUnit} onValueChange={(value: any) => setFormData({ ...formData, lengthUnit: value })}>
                    <SelectTrigger id="length-unit" data-testid="select-length-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Interest Rate Input Mode Toggle - moved after loan term */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="know-total-only"
                    checked={formData.knowTotalOnly || false}
                    onChange={(e) => {
                      const knowTotalOnly = e.target.checked;
                      setFormData({ 
                        ...formData, 
                        knowTotalOnly,
                        // Clear the other field when toggling
                        ...(knowTotalOnly ? { interestRate: '' } : { totalRepayment: '' })
                      });
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="know-total-only" className="cursor-pointer">
                    I don't know the interest rate, but I know the total amount I'll pay back
                  </Label>
                </div>

                {formData.knowTotalOnly ? (
                  // Mode B: User enters total repayment amount
                  <div>
                    <Label htmlFor="total-repayment">Total Amount to Repay *</Label>
                    <Input
                      id="total-repayment"
                      data-testid="input-total-repayment"
                      type="number"
                      step="0.01"
                      value={formData.totalRepayment || ''}
                      onChange={(e) => {
                        const totalRepayment = e.target.value;
                        setFormData({ ...formData, totalRepayment });

                        // Auto-calculate interest rate if we have enough info
                        if (formData.principalAmount && totalRepayment && formData.length) {
                          const principal = parseFloat(formData.principalAmount);
                          const total = parseFloat(totalRepayment);
                          let periods = parseInt(formData.length);

                          // Normalize to months
                          if (formData.lengthUnit === 'weeks') {
                            periods = Math.ceil(periods / 4.33);
                          } else if (formData.lengthUnit === 'years') {
                            periods = periods * 12;
                          }

                          if (principal > 0 && total > principal && periods > 0) {
                            // Simple approximation for now: calculate effective monthly rate
                            // Using the approximation: r ≈ (T/P - 1) / n for small rates
                            const totalInterest = total - principal;
                            const avgInterestPerPeriod = totalInterest / periods;
                            const avgPrincipal = principal / 2; // rough average
                            const monthlyRate = (avgInterestPerPeriod / avgPrincipal) * 100;
                            const annualRate = monthlyRate * 12;

                            setFormData(prev => ({ 
                              ...prev, 
                              calculatedInterestRate: annualRate.toFixed(2)
                            }));
                          }
                        }
                      }}
                      placeholder="e.g., 12000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the total amount you'll pay (including principal + interest)
                    </p>

                    {formData.calculatedInterestRate && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          📊 Calculated Interest Rate: ~{formData.calculatedInterestRate}% APR
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          This is an estimate based on your total repayment amount
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Mode A: User enters interest rate (original)
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="interest">Interest Rate (%) *</Label>
                      <Input
                        id="interest"
                        data-testid="input-interest-rate"
                        type="number"
                        step="0.01"
                        value={formData.interestRate}
                        onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                        placeholder="5.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate-freq">Per</Label>
                      <Select value={formData.rateFrequency} onValueChange={(value: any) => setFormData({ ...formData, rateFrequency: value })}>
                        <SelectTrigger id="rate-freq" data-testid="select-rate-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">Week</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="monthly-income">Your Monthly Income</Label>
                <Input
                  id="monthly-income"
                  data-testid="input-monthly-income"
                  type="number"
                  step="0.01"
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.monthlyIncome 
                    ? `Auto-filled from ${(formData as any)._dataSource || "your data"}` 
                    : "Enter your average monthly income"}
                </p>
              </div>

              <div>
                <Label htmlFor="living-costs">Your Monthly Living Costs</Label>
                <Input
                  id="living-costs"
                  data-testid="input-living-costs"
                  type="number"
                  step="0.01"
                  value={formData.monthlyLivingCosts}
                  onChange={(e) => setFormData({ ...formData, monthlyLivingCosts: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.monthlyLivingCosts 
                    ? `Auto-filled from ${(formData as any)._dataSource || "your data"}` 
                    : "Enter your average monthly expenses"}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Choose Repayment Method */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REPAYMENT_METHODS.map((method) => (
                  <Card
                    key={method.id}
                    className={`hover-elevate cursor-pointer ${
                      formData.repaymentMethod === method.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, repaymentMethod: method.id })}
                    data-testid={`card-method-${method.id}`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <method.icon className="h-5 w-5" />
                        {method.name}
                      </CardTitle>
                      <CardDescription>{method.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-green-600">Pros:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {method.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-600">Cons:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {method.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedMethod && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Selected: {selectedMethod.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Record Reasons */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reasons">Why are you taking this debt?</Label>
                <Textarea
                  id="reasons"
                  data-testid="textarea-reasons"
                  value={formData.reasons}
                  onChange={(e) => setFormData({ ...formData, reasons: e.target.value })}
                  placeholder="Describe why you need this loan and what you'll use it for..."
                  className="min-h-32"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or use voice</span>
                </div>
              </div>

              <VoiceRecorder
                onTranscriptionComplete={(transcription) => 
                  setFormData({ ...formData, reasonsTranscription: transcription })
                }
              />
            </div>
          )}

          {/* Step 4: AI Risk Analysis */}
          {step === 4 && (
            <div className="space-y-4">
              {isAnalyzing ? (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Crunching your numbers … hold tight.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Checking affordability & cash flow impact
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : analysis ? (
                <div className="space-y-4">
                  {/* Risk Assessment Card with Emoji & Color */}
                  <Card 
                    className={`
                      ${analysis.riskLevel === 'high' 
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' 
                        : analysis.riskLevel === 'medium' 
                        ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20' 
                        : 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                      }
                      animate-in slide-in-from-bottom duration-200
                    `}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <span className="text-3xl animate-bounce" style={{ animationIterationCount: 1 }}>
                          {analysis.riskLevel === 'high' ? '🛑' : analysis.riskLevel === 'medium' ? '⚠️' : '✅'}
                        </span>
                        <span className={`
                          ${analysis.riskLevel === 'high' 
                            ? 'text-red-900 dark:text-red-100' 
                            : analysis.riskLevel === 'medium' 
                            ? 'text-yellow-900 dark:text-yellow-100' 
                            : 'text-green-900 dark:text-green-100'
                          }
                        `}>
                          {analysis.riskLevel === 'high' ? 'High Risk' : analysis.riskLevel === 'medium' ? 'Room for Caution' : 'Looks Affordable'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Key Points as Bullets */}
                      <ul className="space-y-2">
                        {analysis.warnings && analysis.warnings.length > 0 ? (
                          analysis.warnings.slice(0, 3).map((warning: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                              <span className="flex-1">{warning}</span>
                            </li>
                          ))
                        ) : analysis.positives && analysis.positives.length > 0 ? (
                          analysis.positives.slice(0, 3).map((positive: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                              <span className="flex-1">{positive}</span>
                            </li>
                          ))
                        ) : (
                          <li className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                            <span className="flex-1">{analysis.recommendation}</span>
                          </li>
                        )}
                      </ul>

                      {/* Actionable Tip */}
                      {analysis.recommendation && (
                        <div className={`
                          p-3 rounded-lg border-l-4 text-sm
                          ${analysis.riskLevel === 'high' 
                            ? 'border-red-500 bg-red-100/50 dark:bg-red-900/20' 
                            : analysis.riskLevel === 'medium' 
                            ? 'border-yellow-500 bg-yellow-100/50 dark:bg-yellow-900/20' 
                            : 'border-green-500 bg-green-100/50 dark:bg-green-900/20'
                          }
                        `}>
                          <p className="font-medium mb-1">💡 Quick Tip:</p>
                          <p>{analysis.recommendation}</p>
                        </div>
                      )}

                      {/* Expandable Details */}
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          Show calculation details
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          <p>• Monthly Income: {formatCurrency(parseFloat(formData.monthlyIncome) || 0)}</p>
                          <p>• Living Costs: {formatCurrency(parseFloat(formData.monthlyLivingCosts) || 0)}</p>
                          <p>• Disposable Income: {formatCurrency(
                            (parseFloat(formData.monthlyIncome) || 0) - (parseFloat(formData.monthlyLivingCosts) || 0)
                          )}</p>
                          {projection && projection.payments && projection.payments[1] && (
                            <p>• Estimated Payment: {formatCurrency(projection.payments[1])}</p>
                          )}
                          {analysis.metrics && (
                            <>
                              <p>• Payment-to-Disposable: {analysis.metrics.paymentToDisposable}%</p>
                              <p>• Debt-to-Income: {analysis.metrics.debtToIncome}%</p>
                            </>
                          )}
                        </div>
                      </details>
                    </CardContent>
                  </Card>

                  {/* Financial Summary Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Financial Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Monthly Income</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(formData.monthlyIncome) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Living Costs</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(formData.monthlyLivingCosts) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Spare Cash/Month</p>
                          <p className="font-semibold text-blue-600">
                            {formatCurrency(
                              (parseFloat(formData.monthlyIncome) || 0) - (parseFloat(formData.monthlyLivingCosts) || 0)
                            )}
                          </p>
                        </div>
                        {projection && projection.payments && projection.payments[1] && (
                          <div>
                            <p className="text-muted-foreground">Monthly Payment</p>
                            <p className="font-semibold text-orange-600">{formatCurrency(projection.payments[1])}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      AI analysis unavailable
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll use basic calculations instead
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 5: Projections & Confirmation */}
          {step === 5 && projection && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Debt Repayment Projection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total to Pay</p>
                      <p className="text-xl font-bold">{formatCurrency(projection.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Interest</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(projection.totalInterest)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payoff Date</p>
                      <p className="text-xl font-bold">{projection.payoffDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Number of Payments</p>
                      <p className="text-xl font-bold">{projection.payments?.length - 1 || 0}</p>
                    </div>
                  </div>

                  {projection.warnings && projection.warnings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Important Warnings:
                      </p>
                      {projection.warnings.map((warning: any, i: number) => (
                        <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                          <Badge variant="outline" className="mb-2">
                            {warning.type?.toUpperCase()}
                          </Badge>
                          <p className="text-sm">{warning.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Payment Schedule (First 12 months):</p>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b sticky top-0 bg-background">
                          <tr>
                            <th className="text-left p-2">Month</th>
                            <th className="text-right p-2">Payment</th>
                            <th className="text-right p-2">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projection.dates?.slice(0, 13).map((date: string, i: number) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{date}</td>
                              <td className="text-right p-2">{formatCurrency(projection.payments[i] || 0)}</td>
                              <td className="text-right p-2">{formatCurrency(projection.balances[i] || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Ready to Add This Debt?</CardTitle>
                  <CardDescription>
                    Review the information above and click "Add Debt" to proceed, or go back to make changes.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && (
                    !formData.name || 
                    !formData.creditorDebtor || 
                    !formData.principalAmount || 
                    !formData.length ||
                    // Require either interest rate OR total repayment
                    (!formData.knowTotalOnly && !formData.interestRate) ||
                    (formData.knowTotalOnly && !formData.totalRepayment)
                  )) ||
                  (step === 4 && isAnalyzing)
                }
                data-testid="button-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} data-testid="button-add-debt">
                Add Debt
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}