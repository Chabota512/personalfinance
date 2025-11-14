import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/financial-utils";

export function RecurringIncomeReminder() {
  const { toast } = useToast();
  const [upcomingIncome, setUpcomingIncome] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUpcomingIncome();
  }, []);

  const fetchUpcomingIncome = async () => {
    try {
      const res = await apiRequest("GET", "/api/recurring-income/upcoming?daysAhead=7");
      if (res.ok) {
        const data = await res.json();
        setUpcomingIncome(data);
      }
    } catch (error) {
      console.error("Failed to fetch upcoming income:", error);
    }
  };

  const handleRecordIncome = async (income: any) => {
    try {
      // Create quick deal for this income
      await apiRequest("POST", "/api/quick-deals", {
        type: "income",
        description: income.name,
        amount: income.amount,
        category: "salary",
        depositAccountId: income.depositAccountId,
      });

      toast({
        title: "Income Recorded",
        description: `${income.name} - ${formatCurrency(parseFloat(income.amount))}`,
      });

      // Mark as reminded
      await apiRequest("PUT", `/api/recurring-income/${income.id}`, {
        lastReminded: new Date().toISOString(),
      });

      setDismissed(new Set([...dismissed, income.id]));
    } catch (error: any) {
      toast({
        title: "Failed to record income",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = (incomeId: string) => {
    setDismissed(new Set([...dismissed, incomeId]));
  };

  const visibleIncome = upcomingIncome.filter(
    (income) => !dismissed.has(income.id)
  );

  if (visibleIncome.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleIncome.map((income) => (
        <Card key={income.id} className="border-success/20 bg-success/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <CardTitle className="text-sm font-semibold">
                  Income Due Soon
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleDismiss(income.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{income.name}</span>
              <Badge variant="outline" className="bg-success/10 text-success">
                {formatCurrency(parseFloat(income.amount))}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Expected: {income.nextDate}</span>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => handleRecordIncome(income)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Record This Income
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}