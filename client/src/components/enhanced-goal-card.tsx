import { useState } from "react";
import { formatCurrency, calculateGoalProgress, getDaysUntil } from "@/lib/financial-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Target, Calendar, Pause, Play, Ban, Plus, Zap, Users, Copy, 
  TrendingUp, Award 
} from "lucide-react";
import type { Goal } from "@shared/schema";
import { 
  usePauseGoal, useResumeGoal, useCancelGoal, useContributeToGoal,
  useStartBoostWeek, useCloneGoal 
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EnhancedGoalCardProps {
  goal: Goal;
  onVictoryLap?: (goal: Goal) => void;
  onMilestone?: (goal: Goal, milestone: number) => void;
}

export function EnhancedGoalCard({ goal, onVictoryLap, onMilestone }: EnhancedGoalCardProps) {
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneMultiplier, setCloneMultiplier] = useState(1);

  const { toast } = useToast();
  const pauseMutation = usePauseGoal();
  const resumeMutation = useResumeGoal();
  const cancelMutation = useCancelGoal();
  const contributeMutation = useContributeToGoal();
  const boostWeekMutation = useStartBoostWeek();
  const cloneMutation = useCloneGoal();

  const current = parseFloat(goal.currentAmount);
  const target = parseFloat(goal.targetAmount);
  const progress = calculateGoalProgress(current, target);
  const daysRemaining = goal.deadline && goal.status !== 'paused' 
    ? getDaysUntil(goal.deadline) 
    : null;

  const milestones = JSON.parse(goal.milestonesReached || '[]');
  
  const statusColors = {
    active: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-muted text-muted-foreground border-muted",
    paused: "bg-warning/10 text-warning border-warning/20",
  };

  const getProgressUnit = () => {
    if (goal.progressUnit === 'days_runway' && goal.category === 'emergency') {
      // Assume $50/day for emergency runway
      const days = Math.floor(current / 50);
      return `${days} days of runway`;
    }
    if (goal.progressUnit === 'percent_prepaid' && goal.category === 'vacation') {
      return `${progress.toFixed(1)}% prepaid`;
    }
    return `${progress.toFixed(1)}%`;
  };

  const handlePauseResume = async () => {
    try {
      if (goal.status === 'paused') {
        await resumeMutation.mutateAsync(goal.id);
        toast({ title: "Goal Resumed", description: "Deadline adjusted for pause duration" });
      } else {
        await pauseMutation.mutateAsync(goal.id);
        toast({ title: "Goal Paused", description: "You can resume anytime" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(goal.id);
      toast({ title: "Goal Cancelled" });
      setCancelOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleContribute = async () => {
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    try {
      const result = await contributeMutation.mutateAsync({ id: goal.id, amount });
      
      if (result.newMilestones && result.newMilestones.length > 0) {
        result.newMilestones.forEach((m: number) => onMilestone?.(result.goal, m));
      }
      
      if (result.isCompleted) {
        onVictoryLap?.(result.goal);
      }
      
      setContributeOpen(false);
      setContributeAmount("");
      toast({ title: "Contribution added!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleBoostWeek = async () => {
    try {
      await boostWeekMutation.mutateAsync(goal.id);
      toast({ 
        title: "Boost Week Started!", 
        description: "All micro-savings will go to this goal for 7 days" 
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleClone = async () => {
    try {
      await cloneMutation.mutateAsync({ id: goal.id, multiplier: cloneMultiplier });
      toast({ title: "Goal Cloned!", description: "New goal created from this one" });
      setCloneOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isBoostWeekActive = goal.boostWeekActive === 1;
  const boostWeekEnds = goal.boostWeekEnds ? new Date(goal.boostWeekEnds) : null;

  return (
    <>
      <Card className="hover-elevate" data-testid={`goal-card-${goal.id}`}>
        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground">
                  {goal.name}
                </h3>
                {goal.why && (
                  <p className="text-xs italic text-muted-foreground mt-0.5 line-clamp-1">
                    "{goal.why}"
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-1">
              {goal.witnessEmail && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Witness
                </Badge>
              )}
              <Badge variant="outline" className={statusColors[goal.status]}>
                {goal.status}
              </Badge>
            </div>
          </div>

          {/* Boost Week Indicator */}
          {isBoostWeekActive && boostWeekEnds && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Boost Week Active - Ends {boostWeekEnds.toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Milestone Badges */}
          {milestones.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {milestones.map((m: number) => (
                <Badge key={m} variant="outline" className="text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  {m}%
                </Badge>
              ))}
            </div>
          )}
          
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{getProgressUnit()}</span>
            </div>
            
            <Progress value={progress} className="h-1.5" />
            
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
          
          {daysRemaining !== null && goal.status === 'active' && (
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

          {goal.status === 'paused' && (
            <div className="flex items-center gap-2 pt-2 border-t border-border text-warning">
              <Pause className="h-4 w-4" />
              <span className="text-sm">
                Paused since {goal.pausedAt ? new Date(goal.pausedAt).toLocaleDateString() : 'recently'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {goal.status === 'active' && (
              <Button
                size="sm"
                onClick={() => setContributeOpen(true)}
                data-testid={`button-contribute-${goal.id}`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Funds
              </Button>
            )}

            {goal.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCloneOpen(true)}
                data-testid={`button-clone-${goal.id}`}
              >
                <Copy className="h-4 w-4 mr-1" />
                Clone Goal
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(goal.status === 'active' || goal.status === 'paused') && (
                  <DropdownMenuItem onClick={handlePauseResume}>
                    {goal.status === 'paused' ? (
                      <><Play className="h-4 w-4 mr-2" /> Resume</>
                    ) : (
                      <><Pause className="h-4 w-4 mr-2" /> Pause</>
                    )}
                  </DropdownMenuItem>
                )}
                
                {goal.status === 'active' && !isBoostWeekActive && (
                  <DropdownMenuItem onClick={handleBoostWeek}>
                    <Zap className="h-4 w-4 mr-2" /> Start Boost Week
                  </DropdownMenuItem>
                )}

                {goal.status !== 'cancelled' && goal.status !== 'completed' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setCancelOpen(true)}
                      className="text-destructive"
                    >
                      <Ban className="h-4 w-4 mr-2" /> Cancel Goal
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Contribute Dialog */}
      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              How much would you like to add to {goal.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                data-testid="input-contribute-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleContribute} disabled={contributeMutation.isPending}>
              {contributeMutation.isPending ? "Adding..." : "Add Contribution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel "{goal.name}". The funds saved will remain available 
              in your accounts, but the goal tracking will stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Goal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive">
              Cancel Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Goal</DialogTitle>
            <DialogDescription>
              Create a new goal based on "{goal.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount Multiplier</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 5].map((m) => (
                  <Button
                    key={m}
                    variant={cloneMultiplier === m ? "default" : "outline"}
                    onClick={() => setCloneMultiplier(m)}
                    className="flex-1"
                  >
                    {m}x
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                New target: ${(parseFloat(goal.targetAmount) * cloneMultiplier).toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={cloneMutation.isPending}>
              {cloneMutation.isPending ? "Cloning..." : "Clone Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
