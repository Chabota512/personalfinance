import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface UniversalDebtFormData {
  lenderName: string;
  principal: string;
  interestRate: string;
  rateFrequency: 'week' | 'month';
  length: string;
  lengthUnit: 'weeks' | 'months';
  monthlyIncome: string;
  monthlyLivingCosts: string;
  cashSpare: string;
}

interface UniversalDebtFormProps {
  onSubmit: (data: UniversalDebtFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<UniversalDebtFormData>;
}

export function UniversalDebtForm({ onSubmit, isLoading, initialData }: UniversalDebtFormProps) {
  const [formData, setFormData] = useState<UniversalDebtFormData>({
    lenderName: initialData?.lenderName || "",
    principal: initialData?.principal || "",
    interestRate: initialData?.interestRate || "",
    rateFrequency: initialData?.rateFrequency || 'month',
    length: initialData?.length || "",
    lengthUnit: initialData?.lengthUnit || 'months',
    monthlyIncome: initialData?.monthlyIncome || "",
    monthlyLivingCosts: initialData?.monthlyLivingCosts || "",
    cashSpare: initialData?.cashSpare || "0",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.lenderName.trim() !== "" &&
    parseFloat(formData.principal) > 0 &&
    parseFloat(formData.length) > 0 &&
    parseFloat(formData.monthlyIncome) >= 0 &&
    parseFloat(formData.monthlyLivingCosts) >= 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="lenderName">Lender Name *</Label>
          <Input
            id="lenderName"
            data-testid="input-lender-name"
            value={formData.lenderName}
            onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
            placeholder="e.g., ABC Bank"
            required
          />
        </div>

        <div>
          <Label htmlFor="principal">Principal Owed *</Label>
          <Input
            id="principal"
            data-testid="input-principal"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.principal}
            onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="interestRate">Interest Rate (%)</Label>
            <Input
              id="interestRate"
              data-testid="input-interest-rate"
              type="number"
              step="0.01"
              min="0"
              value={formData.interestRate}
              onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="rateFrequency">Rate Per</Label>
            <Select
              value={formData.rateFrequency}
              onValueChange={(value: 'week' | 'month') => setFormData({ ...formData, rateFrequency: value })}
            >
              <SelectTrigger id="rateFrequency" data-testid="select-rate-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="length">Length *</Label>
            <Input
              id="length"
              data-testid="input-length"
              type="number"
              step="1"
              min="1"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              placeholder="12"
              required
            />
          </div>
          <div>
            <Label htmlFor="lengthUnit">Unit</Label>
            <Select
              value={formData.lengthUnit}
              onValueChange={(value: 'weeks' | 'months') => setFormData({ ...formData, lengthUnit: value })}
            >
              <SelectTrigger id="lengthUnit" data-testid="select-length-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="monthlyIncome">My Expected NET Income per Period *</Label>
          <Input
            id="monthlyIncome"
            data-testid="input-monthly-income"
            type="number"
            step="0.01"
            min="0"
            value={formData.monthlyIncome}
            onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
            placeholder="0.00"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">After-tax income per month</p>
        </div>

        <div>
          <Label htmlFor="monthlyLivingCosts">My Non-Negotiable Living Cost per Period *</Label>
          <Input
            id="monthlyLivingCosts"
            data-testid="input-monthly-living-costs"
            type="number"
            step="0.01"
            min="0"
            value={formData.monthlyLivingCosts}
            onChange={(e) => setFormData({ ...formData, monthlyLivingCosts: e.target.value })}
            placeholder="0.00"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Essential expenses per month</p>
        </div>

        <div>
          <Label htmlFor="cashSpare">Cash I Can Spare Right Now</Label>
          <Input
            id="cashSpare"
            data-testid="input-cash-spare"
            type="number"
            step="0.01"
            min="0"
            value={formData.cashSpare}
            onChange={(e) => setFormData({ ...formData, cashSpare: e.target.value })}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground mt-1">Available for lump-sum settlement</p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || isLoading}
        data-testid="button-show-options"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          "Show Me My Options"
        )}
      </Button>
    </form>
  );
}
