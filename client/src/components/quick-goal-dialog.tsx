import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateGoal } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface QuickGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Simple NLP mapping for common items
const ITEM_MAPPINGS: Record<string, number> = {
  'macbook': 1299,
  'macbook pro': 1999,
  'iphone': 999,
  'ipad': 599,
  'laptop': 800,
  'computer': 1000,
  'car': 25000,
  'vacation': 2000,
  'trip': 1500,
  'wedding': 15000,
  'house down payment': 50000,
  'emergency fund': 5000,
};

// Parse relative dates
function parseRelativeDate(input: string): string | null {
  const lowerInput = input.toLowerCase().trim();
  const now = new Date();
  
  if (lowerInput.includes('next summer')) {
    const year = now.getMonth() > 6 ? now.getFullYear() + 1 : now.getFullYear();
    return `${year}-07-01`;
  }
  if (lowerInput.includes('next year')) {
    return `${now.getFullYear() + 1}-01-01`;
  }
  if (lowerInput.includes('next month')) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  }
  if (lowerInput.match(/in (\d+) months?/)) {
    const match = lowerInput.match(/in (\d+) months?/);
    const months = parseInt(match![1]);
    const future = new Date(now);
    future.setMonth(future.getMonth() + months);
    return future.toISOString().split('T')[0];
  }
  if (lowerInput.match(/in (\d+) years?/)) {
    const match = lowerInput.match(/in (\d+) years?/);
    const years = parseInt(match![1]);
    return `${now.getFullYear() + years}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  return null;
}

export function QuickGoalDialog({ open, onOpenChange }: QuickGoalDialogProps) {
  const [goalInput, setGoalInput] = useState("");
  const [whenInput, setWhenInput] = useState("");
  const [parsedAmount, setParsedAmount] = useState<number | null>(null);
  const [parsedDate, setParsedDate] = useState<string | null>(null);
  
  const createMutation = useCreateGoal();
  const { toast } = useToast();

  const handleGoalInputChange = (value: string) => {
    setGoalInput(value);
    
    // Reset parsed amount before parsing
    setParsedAmount(null);
    
    // Try to parse amount from input
    const lowerValue = value.toLowerCase();
    for (const [item, amount] of Object.entries(ITEM_MAPPINGS)) {
      if (lowerValue.includes(item)) {
        setParsedAmount(amount);
        return;
      }
    }
    
    // Try to extract dollar amount
    const dollarMatch = value.match(/\$?([\d,]+)/);
    if (dollarMatch) {
      const amount = parseFloat(dollarMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        setParsedAmount(amount);
      }
    }
  };

  const handleWhenInputChange = (value: string) => {
    setWhenInput(value);
    
    // Reset parsed date before parsing
    setParsedDate(null);
    
    const date = parseRelativeDate(value);
    if (date) {
      setParsedDate(date);
    }
  };

  const handleSubmit = async () => {
    if (!goalInput.trim()) {
      toast({
        title: "Error",
        description: "Please tell us what you want to save for",
        variant: "destructive",
      });
      return;
    }

    const targetAmount = parsedAmount || 1000; // Default if can't parse
    const deadline = parsedDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      await createMutation.mutateAsync({
        name: goalInput,
        targetAmount: targetAmount.toString(),
        currentAmount: "0",
        deadline,
        status: 'active',
        quickGoalNlpSource: `${goalInput} | ${whenInput}`,
        category: 'other'
      });

      toast({
        title: "Quick Goal Created!",
        description: `Your goal "${goalInput}" has been created.`,
      });

      onOpenChange(false);
      setGoalInput("");
      setWhenInput("");
      setParsedAmount(null);
      setParsedDate(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-quick-goal">
        <DialogHeader>
          <DialogTitle>Quick Goal</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-input">I want...</Label>
            <Input
              id="goal-input"
              data-testid="input-quick-goal-name"
              placeholder="e.g., MacBook, vacation, emergency fund"
              value={goalInput}
              onChange={(e) => handleGoalInputChange(e.target.value)}
              className="mt-1"
            />
            {parsedAmount && (
              <p className="text-sm text-muted-foreground mt-1">
                Estimated: ${parsedAmount.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="when-input">By when?</Label>
            <Input
              id="when-input"
              data-testid="input-quick-goal-when"
              placeholder="e.g., next summer, in 6 months"
              value={whenInput}
              onChange={(e) => handleWhenInputChange(e.target.value)}
              className="mt-1"
            />
            {parsedDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Target: {new Date(parsedDate).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-quick-goal"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              data-testid="button-create-quick-goal"
            >
              {createMutation.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
