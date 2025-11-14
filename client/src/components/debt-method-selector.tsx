import { useState } from "react";
import { UniversalDebtForm, UniversalDebtFormData } from "@/components/universal-debt-form";
import { DebtMethodCard, DebtMethodProjection } from "@/components/debt-method-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { fetchApi, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DebtMethodSelectorProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function DebtMethodSelector({ onComplete, onCancel }: DebtMethodSelectorProps) {
  const [step, setStep] = useState<'input' | 'compare' | 'confirm'>('input');
  const [formData, setFormData] = useState<UniversalDebtFormData | null>(null);
  const [methods, setMethods] = useState<DebtMethodProjection[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFormSubmit = async (data: UniversalDebtFormData) => {
    setIsLoading(true);
    setFormData(data);
    
    try {
      const response: { methods: DebtMethodProjection[] } = await fetchApi('/api/debts/compare-all-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal: data.principal,
          interestRate: data.interestRate,
          rateFrequency: data.rateFrequency,
          length: data.length,
          lengthUnit: data.lengthUnit,
          monthlyIncome: data.monthlyIncome,
          monthlyLivingCosts: data.monthlyLivingCosts,
          cashSpare: data.cashSpare,
        }),
      });

      // Filter out hidden methods
      const visibleMethods = response.methods.filter((m: DebtMethodProjection) => !m.hidden);
      
      // Handle edge case: no viable methods
      if (visibleMethods.length === 0) {
        toast({
          title: "No viable repayment options",
          description: "Based on your financial situation, none of the standard repayment methods are feasible. Please adjust your income, living costs, or principal amount.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      setMethods(visibleMethods);
      setStep('compare');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate repayment methods",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
  };

  const handleConfirmSelection = async () => {
    if (!selectedMethod || !formData) return;

    setIsLoading(true);
    
    try {
      const selectedMethodData = methods.find(m => m.method === selectedMethod);
      
      // Create debt with selected method
      await apiRequest('POST', '/api/debts', {
        name: formData.lenderName,
        type: 'i_owe',
        creditorDebtor: formData.lenderName,
        principalAmount: formData.principal,
        currentBalance: formData.principal,
        interestRate: formData.interestRate,
        repaymentMethod: selectedMethod,
        paymentAmount: selectedMethodData?.highestPayment.toString() || "0",
        paymentFrequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: selectedMethodData?.projection.payoffDate || "",
        totalPeriods: formData.lengthUnit === 'months' ? parseInt(formData.length) : Math.ceil(parseInt(formData.length) / 4.33),
        monthlyIncome: formData.monthlyIncome,
        monthlyLivingCosts: formData.monthlyLivingCosts,
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/debts/active'] });

      toast({
        title: "Debt added",
        description: `${formData.lenderName} with ${selectedMethodData?.methodTitle} repayment plan has been added.`,
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add debt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'input') {
    return (
      <div>
        <UniversalDebtForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          initialData={formData || undefined}
        />
      </div>
    );
  }

  if (step === 'compare') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep('input')}
            data-testid="button-back-to-form"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Form
          </Button>
          <div className="text-sm text-muted-foreground">
            {methods.length} repayment {methods.length === 1 ? 'option' : 'options'} available
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Choose Your Repayment Strategy</h3>
            <p className="text-sm text-muted-foreground">
              Review the options below and select the plan that best fits your financial situation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2">
            {methods.map((method) => (
              <DebtMethodCard
                key={method.method}
                method={method}
                onSelect={() => handleMethodSelect(method.method)}
                isSelected={selectedMethod === method.method}
              />
            ))}
          </div>

          {selectedMethod && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={isLoading}
                data-testid="button-confirm-selection"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Debt...
                  </>
                ) : (
                  "Confirm & Add Debt"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
