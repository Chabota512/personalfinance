import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, PiggyBank, Smile, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoals } from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WindfallSplitterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  transactionDescription?: string;
}

export function WindfallSplitterDialog({ 
  open, 
  onOpenChange, 
  amount,
  transactionDescription 
}: WindfallSplitterDialogProps) {
  const [checkingPercent, setCheckingPercent] = useState(70);
  const [goalPercent, setGoalPercent] = useState(20);
  const [funPercent, setFunPercent] = useState(10);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { data: goals } = useGoals();
  const activeGoals = goals?.filter((g: any) => g.status === 'active') || [];

  const checkingAmount = (amount * checkingPercent / 100).toFixed(2);
  const goalAmount = (amount * goalPercent / 100).toFixed(2);
  const funAmount = (amount * funPercent / 100).toFixed(2);

  const handleSliderChange = (type: 'checking' | 'goal' | 'fun', value: number[]) => {
    const newValue = value[0];
    
    if (type === 'checking') {
      const remaining = 100 - newValue;
      const goalRatio = goalPercent / (goalPercent + funPercent) || 0.67;
      const newGoal = Math.round(remaining * goalRatio);
      const newFun = 100 - newValue - newGoal; // Ensure exact 100% total
      setCheckingPercent(newValue);
      setGoalPercent(newGoal);
      setFunPercent(newFun);
    } else if (type === 'goal') {
      const remaining = 100 - newValue;
      const checkingRatio = checkingPercent / (checkingPercent + funPercent) || 0.88;
      const newChecking = Math.round(remaining * checkingRatio);
      const newFun = 100 - newValue - newChecking; // Ensure exact 100% total
      setGoalPercent(newValue);
      setCheckingPercent(newChecking);
      setFunPercent(newFun);
    } else {
      const remaining = 100 - newValue;
      const checkingRatio = checkingPercent / (checkingPercent + goalPercent) || 0.78;
      const newChecking = Math.round(remaining * checkingRatio);
      const newGoal = 100 - newValue - newChecking; // Ensure exact 100% total
      setFunPercent(newValue);
      setCheckingPercent(newChecking);
      setGoalPercent(newGoal);
    }
  };

  const handleAllocate = async () => {
    if (!selectedGoalId && goalPercent > 0) {
      toast({ 
        title: "Select a goal", 
        description: "Choose which goal to allocate funds to",
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/windfall-allocate", {
        totalAmount: amount,
        checkingPercent,
        goalPercent,
        funPercent,
        goalId: selectedGoalId,
        description: transactionDescription,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to allocate windfall");
      }

      // Invalidate relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      
      toast({ 
        title: "Windfall Allocated!", 
        description: `Split across checking, goal, and fun money` 
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-windfall-splitter">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Split Your Windfall
          </DialogTitle>
          <DialogDescription>
            You received ${amount.toFixed(2)}. How would you like to allocate it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Checking Account */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Checking
              </Label>
              <span className="text-sm font-mono font-semibold">
                ${checkingAmount} ({checkingPercent}%)
              </span>
            </div>
            <Slider
              value={[checkingPercent]}
              onValueChange={(val) => handleSliderChange('checking', val)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Goal Allocation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Goal
              </Label>
              <span className="text-sm font-mono font-semibold">
                ${goalAmount} ({goalPercent}%)
              </span>
            </div>
            <Slider
              value={[goalPercent]}
              onValueChange={(val) => handleSliderChange('goal', val)}
              max={100}
              step={5}
              className="w-full"
            />
            {goalPercent > 0 && (
              <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                <SelectTrigger data-testid="select-goal">
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  {activeGoals.map((goal: any) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Fun Money */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Smile className="h-4 w-4" />
                Fun Money
              </Label>
              <span className="text-sm font-mono font-semibold">
                ${funAmount} ({funPercent}%)
              </span>
            </div>
            <Slider
              value={[funPercent]}
              onValueChange={(val) => handleSliderChange('fun', val)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Total Allocation</p>
            <p className="text-sm">
              <span className="font-semibold">${checkingAmount}</span> to Checking +{' '}
              <span className="font-semibold">${goalAmount}</span> to Goal +{' '}
              <span className="font-semibold">${funAmount}</span> to Fun
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAllocate} 
            disabled={isSubmitting || (goalPercent > 0 && !selectedGoalId)}
            data-testid="button-allocate"
          >
            {isSubmitting ? "Allocating..." : "Allocate Funds"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
