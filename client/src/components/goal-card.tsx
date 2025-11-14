
import { useState, useEffect } from "react";
import { formatCurrency, calculateGoalProgress, getDaysUntil } from "@/lib/financial-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import type { Goal } from "@shared/schema";
import { formatFrequency, formatDayOfWeek, calculateScheduleAdherence } from "@shared/goal-utils";
import { useAccounts, useAccount, useContributeToGoal } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeNotes, setContributeNotes] = useState("");
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string | null>(
    goal.sourceAccountId ? String(goal.sourceAccountId) : null
  );

  const { toast } = useToast();
  const { data: accounts } = useAccounts();
  const { data: sourceAccount } = useAccount(selectedSourceAccountId || "");
  const contributeMutation = useContributeToGoal();

  const current = parseFloat(goal.currentAmount);
  const target = parseFloat(goal.targetAmount);
  const progress = calculateGoalProgress(current, target);
  const daysRemaining = goal.deadline ? getDaysUntil(goal.deadline) : null;

  const statusColors = {
    active: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-muted text-muted-foreground border-muted",
    paused: "bg-warning/10 text-warning border-warning/20",
  };

  // Calculate schedule adherence
  const scheduleInfo = goal.contributionFrequency
    ? calculateScheduleAdherence(goal, [])
    : null;

  // Format contribution schedule display
  const getScheduleDisplay = () => {
    if (!goal.contributionFrequency || !goal.contributionMode) {
      return null;
    }

    const frequency = formatFrequency(goal.contributionFrequency);
    const scheduledAmount = goal.scheduledAmount
      ? formatCurrency(parseFloat(goal.scheduledAmount))
      : null;

    let scheduleText = "";
    if (goal.contributionMode === "calculated_amount" && scheduledAmount) {
      scheduleText = `${frequency} • ${scheduledAmount}`;
      if (goal.dayOfWeek !== null && goal.contributionFrequency === "weekly") {
        scheduleText += ` every ${formatDayOfWeek(goal.dayOfWeek)}`;
      } else if (goal.dayOfMonth !== null && goal.contributionFrequency === "monthly") {
        scheduleText += ` on the ${goal.dayOfMonth}${getOrdinalSuffix(goal.dayOfMonth)}`;
      }
    } else if (goal.contributionMode === "calculated_date" && scheduledAmount) {
      scheduleText = `${frequency} • ${scheduledAmount}`;
    } else if (goal.contributionMode === "flexible_amount") {
      scheduleText = `${frequency} • Flexible amounts`;
    } else if (goal.contributionMode === "completely_flexible") {
      scheduleText = "Contribute whenever";
    }

    return scheduleText;
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  // Pre-fill amount for fixed schedules
  useEffect(() => {
    if (contributeOpen) {
      if (
        goal.scheduledAmount &&
        (goal.contributionMode === "calculated_amount" ||
          goal.contributionMode === "calculated_date")
      ) {
        setContributeAmount(goal.scheduledAmount);
      } else {
        setContributeAmount("");
      }
    }
  }, [contributeOpen, goal.scheduledAmount, goal.contributionMode]);

  const handleContribute = async () => {
    if (!contributeAmount || parseFloat(contributeAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid contribution amount",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSourceAccountId) {
      toast({
        title: "No source account",
        description: "Please select a source account",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(`/api/goals/${goal.id}/contribute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(contributeAmount),
          sourceAccountId: selectedSourceAccountId,
          notes: contributeNotes || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to contribute");
      }

      // Invalidate queries to refresh data
      contributeMutation.mutate({
        id: String(goal.id),
        amount: parseFloat(contributeAmount),
      });

      toast({
        title: "Contribution successful! 🎉",
        description: `Added ${formatCurrency(parseFloat(contributeAmount))} to ${goal.name}`,
      });

      setContributeOpen(false);
      setContributeAmount("");
      setContributeNotes("");
    } catch (error: any) {
      toast({
        title: "Contribution failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const getContributeButtonText = () => {
    if (
      goal.scheduledAmount &&
      (goal.contributionMode === "calculated_amount" ||
        goal.contributionMode === "calculated_date")
    ) {
      return `Contribute ${formatCurrency(parseFloat(goal.scheduledAmount))}`;
    }
    return "Contribute";
  };

  return (
    <>
      <Card className="hover-elevate" data-testid={`goal-card-${goal.id}`}>
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground">
                  {goal.name}
                </h3>
                {goal.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {goal.description}
                  </p>
                )}
              </div>
            </div>

            <Badge variant="outline" className={statusColors[goal.status]}>
              {goal.status}
            </Badge>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">
                {progress.toFixed(1)}%
              </span>
            </div>

            <Progress value={progress} className="h-1.5 sm:h-2" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-sm sm:text-base font-mono font-semibold text-success">
                  {formatCurrency(current)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-sm sm:text-base font-mono font-semibold text-foreground">
                  {formatCurrency(target)}
                </p>
              </div>
            </div>
          </div>

          {/* Contribution Schedule Section */}
          {getScheduleDisplay() && (
            <div
              className="pt-2 border-t border-border"
              data-testid={`goal-schedule-${goal.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Schedule
                </p>
                {scheduleInfo && (
                  <div className="flex items-center gap-1">
                    {scheduleInfo.status === "on_track" ||
                    scheduleInfo.status === "ahead" ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-warning" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        scheduleInfo.status === "on_track" ||
                        scheduleInfo.status === "ahead"
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {scheduleInfo.status === "on_track"
                        ? "On track"
                        : scheduleInfo.status === "ahead"
                        ? "Ahead"
                        : `Behind by ${Math.abs(
                            Math.round(
                              scheduleInfo.difference /
                                (goal.scheduledAmount
                                  ? parseFloat(goal.scheduledAmount)
                                  : 1)
                            )
                          )} contribution${
                            Math.abs(
                              Math.round(
                                scheduleInfo.difference /
                                  (goal.scheduledAmount
                                    ? parseFloat(goal.scheduledAmount)
                                    : 1)
                              )
                            ) !== 1
                              ? "s"
                              : ""
                          }`}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground">{getScheduleDisplay()}</p>
              
              {/* Next Due Date */}
              {goal.nextScheduledContribution && goal.contributionMode !== "completely_flexible" && (
                <div className="mt-2">
                  {(() => {
                    const nextDate = new Date(goal.nextScheduledContribution);
                    const today = new Date();
                    const isOverdue = nextDate < today;
                    
                    return (
                      <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Calendar className="h-3 w-3" />
                        <span>
                          {isOverdue ? 'Overdue: ' : 'Next: '}
                          {nextDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Source Account Dropdown */}
          {goal.status === "active" && (
            <div className="pt-2 space-y-2" data-testid={`goal-source-${goal.id}`}>
              <Label htmlFor={`source-account-${goal.id}`} className="text-xs">
                Fund from:
              </Label>
              <Select
                value={selectedSourceAccountId || ""}
                onValueChange={setSelectedSourceAccountId}
              >
                <SelectTrigger id={`source-account-${goal.id}`} className="h-8">
                  <SelectValue placeholder="Select account">
                    {sourceAccount?.name || "Select account"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((account: any) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} ({formatCurrency(parseFloat(account.balance))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contribute Button */}
          {goal.status === "active" && (
            <Button
              onClick={() => setContributeOpen(true)}
              className="w-full"
              size="sm"
              disabled={!selectedSourceAccountId}
              data-testid={`contribute-button-${goal.id}`}
            >
              {getContributeButtonText()}
            </Button>
          )}

          {daysRemaining !== null && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {daysRemaining > 0 ? (
                  <>{daysRemaining} days remaining</>
                ) : daysRemaining === 0 ? (
                  <>Due today</>
                ) : (
                  <>{Math.abs(daysRemaining)} days overdue</>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contribute Dialog */}
      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent data-testid={`contribute-dialog-${goal.id}`}>
          <DialogHeader>
            <DialogTitle>Contribute to {goal.name}</DialogTitle>
            <DialogDescription>
              Add funds to help reach your goal of {formatCurrency(target)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contribute-amount">Amount</Label>
              <Input
                id="contribute-amount"
                type="number"
                step="0.01"
                min="0"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="Enter amount"
                data-testid="contribute-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Source Account</Label>
              <div className="text-sm text-muted-foreground">
                {sourceAccount?.name || "No account selected"} (
                {sourceAccount
                  ? formatCurrency(parseFloat(sourceAccount.balance))
                  : "$0.00"}
                )
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contribute-notes">Notes (optional)</Label>
              <Textarea
                id="contribute-notes"
                value={contributeNotes}
                onChange={(e) => setContributeNotes(e.target.value)}
                placeholder="Add a note about this contribution"
                rows={3}
                data-testid="contribute-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContributeOpen(false)}
              data-testid="contribute-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContribute}
              disabled={contributeMutation.isPending}
              data-testid="contribute-confirm-button"
            >
              {contributeMutation.isPending ? "Contributing..." : "Confirm Contribution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
