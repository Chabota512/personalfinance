
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/financial-utils";
import { TrendingDown, Calendar, DollarSign } from "lucide-react";

interface WhatIfSliderProps {
  category: string;
  currentSpending: number;
  savingsGoal?: {
    targetAmount: number;
    currentAmount: number;
    monthlyContribution: number;
  };
}

export function WhatIfSlider({ category, currentSpending, savingsGoal }: WhatIfSliderProps) {
  const [reductionPercent, setReductionPercent] = useState([0]);
  
  const scenario = useMemo(() => {
    const reduction = reductionPercent[0];
    const newSpending = currentSpending * (1 - reduction / 100);
    const monthlySavings = currentSpending - newSpending;
    
    let monthsToGoal = 0;
    if (savingsGoal) {
      const remaining = savingsGoal.targetAmount - savingsGoal.currentAmount;
      const newContribution = savingsGoal.monthlyContribution + monthlySavings;
      monthsToGoal = Math.ceil(remaining / newContribution);
    }
    
    return {
      newSpending,
      monthlySavings,
      annualSavings: monthlySavings * 12,
      monthsToGoal,
      payoffDate: monthsToGoal > 0 
        ? new Date(Date.now() + monthsToGoal * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        : null,
    };
  }, [reductionPercent, currentSpending, savingsGoal]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          What-If Scenario: Reduce {category}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Reduce spending by:</Label>
            <span className="text-2xl font-bold text-primary">{reductionPercent[0]}%</span>
          </div>
          <Slider
            value={reductionPercent}
            onValueChange={setReductionPercent}
            max={50}
            step={5}
            className="py-4"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              New Monthly Spending
            </div>
            <p className="text-lg font-semibold">{formatCurrency(scenario.newSpending)}</p>
            <p className="text-xs text-muted-foreground">
              Save {formatCurrency(scenario.monthlySavings)}/mo
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Annual Savings
            </div>
            <p className="text-lg font-semibold text-success">
              {formatCurrency(scenario.annualSavings)}
            </p>
          </div>
        </div>

        {savingsGoal && scenario.monthsToGoal > 0 && (
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm font-medium">Goal Impact</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reach your goal in <strong>{scenario.monthsToGoal} months</strong>
              {scenario.payoffDate && ` by ${scenario.payoffDate}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
