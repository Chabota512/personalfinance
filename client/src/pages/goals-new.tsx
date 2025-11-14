import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useGoals, useCreateGoal } from "@/lib/api";
import { EnhancedGoalCard } from "@/components/enhanced-goal-card";
import { QuickGoalDialog } from "@/components/quick-goal-dialog";
import { MilestoneCelebration } from "@/components/milestone-celebration";
import { VictoryLapDialog } from "@/components/victory-lap-dialog";
import { Plus, Target, Zap, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Goal } from "@shared/schema";

const SMART_TEMPLATES = [
  {
    id: 'emergency',
    name: 'Emergency Fund',
    category: 'emergency',
    description: '3-6 months of essential expenses',
    suggestedMonths: 12,
    defaultMultiplier: 3, // 3 months of expenses
  },
  {
    id: 'major_purchase',
    name: 'Major Purchase',
    category: 'other',
    description: 'House, car, or big-ticket item',
    suggestedMonths: 18,
  },
  {
    id: 'custom',
    name: 'Custom Goal',
    category: 'other',
    description: 'Design your own goal',
    suggestedMonths: 12,
  },
];

export default function GoalsNew() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickGoalOpen, setQuickGoalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    category: "other",
    description: "",
    why: "",
    witnessEnabled: false,
    witnessName: "",
    witnessEmail: "",
    monthlyContribution: "",
  });

  const [celebrationState, setCelebrationState] = useState<{
    show: boolean;
    goal: Goal | null;
    milestone: number;
  }>({ show: false, goal: null, milestone: 0 });

  const [victoryState, setVictoryState] = useState<{
    show: boolean;
    goal: Goal | null;
  }>({ show: false, goal: null });

  const { toast } = useToast();
  const { data: goals, isLoading } = useGoals();
  const createMutation = useCreateGoal();

  const activeGoals = goals?.filter((g: Goal) => g.status === 'active') || [];
  const pausedGoals = goals?.filter((g: Goal) => g.status === 'paused') || [];
  const completedGoals = goals?.filter((g: Goal) => g.status === 'completed') || [];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = SMART_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const suggestedDate = new Date();
      suggestedDate.setMonth(suggestedDate.getMonth() + template.suggestedMonths);

      setFormData({
        ...formData,
        name: template.id === 'custom' ? '' : template.name,
        category: template.category,
        deadline: suggestedDate.toISOString().split('T')[0],
      });
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedTemplate) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.targetAmount || !formData.deadline) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }

    try {
      const goalData: any = {
        name: formData.name,
        targetAmount: String(formData.targetAmount),
        currentAmount: String(formData.currentAmount),
        deadline: formData.deadline,
        status: 'active',
        category: formData.category,
        description: formData.description,
        why: formData.why,
        monthlyContribution: formData.monthlyContribution ? String(formData.monthlyContribution) : null,
      };

      if (formData.witnessEnabled) {
        goalData.witnessName = formData.witnessName;
        goalData.witnessEmail = formData.witnessEmail;
      }

      await createMutation.mutateAsync(goalData);
      toast({ title: "Goal Created!", description: "Your goal has been created successfully" });
      setWizardOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      targetAmount: "",
      currentAmount: "0",
      deadline: "",
      category: "other",
      description: "",
      why: "",
      witnessEnabled: false,
      witnessName: "",
      witnessEmail: "",
      monthlyContribution: "",
    });
    setSelectedTemplate(null);
    setStep(1);
  };

  const handleMilestone = (goal: Goal, milestone: number) => {
    setCelebrationState({ show: true, goal, milestone });
  };

  const handleVictoryLap = (goal: Goal) => {
    setVictoryState({ show: true, goal });
  };

  // Amount chips for quick selection
  const monthlyExpenseEstimate = 2500; // Could be pulled from budget data
  const amountChips = [
    { label: "½ month", value: monthlyExpenseEstimate * 0.5 },
    { label: "1 month", value: monthlyExpenseEstimate },
    { label: "3 months", value: monthlyExpenseEstimate * 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Goals</h1>
          <p className="text-muted-foreground">Turn your dreams into achievable milestones</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setQuickGoalOpen(true)}
            data-testid="button-quick-goal"
          >
            <Zap className="h-4 w-4 mr-2" />
            Quick Goal
          </Button>
          <Button onClick={() => setWizardOpen(true)} data-testid="button-new-goal">
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Goals</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal: Goal) => (
                  <EnhancedGoalCard 
                    key={goal.id} 
                    goal={goal}
                    onMilestone={handleMilestone}
                    onVictoryLap={handleVictoryLap}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paused Goals */}
          {pausedGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Paused Goals</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pausedGoals.map((goal: Goal) => (
                  <EnhancedGoalCard 
                    key={goal.id} 
                    goal={goal}
                    onMilestone={handleMilestone}
                    onVictoryLap={handleVictoryLap}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Completed Goals</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map((goal: Goal) => (
                  <EnhancedGoalCard 
                    key={goal.id} 
                    goal={goal}
                    onMilestone={handleMilestone}
                    onVictoryLap={handleVictoryLap}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {goals?.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-2">
                  Start saving for something meaningful
                </p>
                <p className="text-sm italic text-muted-foreground mb-4">
                  "This is the difference between a payday-loan ER visit and sleeping through the night"
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setQuickGoalOpen(true)} variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Quick Goal
                  </Button>
                  <Button onClick={() => setWizardOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Quick Goal Dialog */}
      <QuickGoalDialog open={quickGoalOpen} onOpenChange={setQuickGoalOpen} />

      {/* Enhanced Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={(open) => {
        setWizardOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Goal - Step {step} of 3</DialogTitle>
          </DialogHeader>

          {/* Step 1: Template Selection (3 smart bundles) */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose a goal type:</p>
              <div className="grid gap-4">
                {SMART_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer hover-elevate ${
                      selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="pt-6">
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleNext} disabled={!selectedTemplate}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Details + Why */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Goal Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-goal-name"
                />
              </div>

              <div>
                <Label htmlFor="why" className="text-base font-semibold">
                  Why is this important to you? *
                </Label>
                <Textarea
                  id="why"
                  value={formData.why}
                  onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                  placeholder="e.g., This is the difference between a payday-loan ER visit and sleeping through the night"
                  rows={3}
                  className="mt-2"
                  data-testid="input-goal-why"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will keep you motivated during the journey
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Witness Feature */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="witness-toggle" className="font-semibold">
                      Add a Witness
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Someone to celebrate with when you succeed
                    </p>
                  </div>
                  <Switch
                    id="witness-toggle"
                    checked={formData.witnessEnabled}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, witnessEnabled: checked })
                    }
                  />
                </div>
                
                {formData.witnessEnabled && (
                  <div className="space-y-2 pt-2">
                    <Input
                      placeholder="Witness name"
                      value={formData.witnessName}
                      onChange={(e) => setFormData({ ...formData, witnessName: e.target.value })}
                    />
                    <Input
                      type="email"
                      placeholder="Witness email"
                      value={formData.witnessEmail}
                      onChange={(e) => setFormData({ ...formData, witnessEmail: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleNext}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Amounts with Chips */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Target Amount ($) *</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {amountChips.map((chip) => (
                    <Button
                      key={chip.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, targetAmount: chip.value.toString() })}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      {chip.label} (${chip.value.toLocaleString()})
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="5000"
                  data-testid="input-target-amount"
                />
              </div>

              <div>
                <Label htmlFor="currentAmount">Starting Amount ($)</Label>
                <Input
                  id="currentAmount"
                  type="number"
                  step="0.01"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="deadline">Target Date *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  data-testid="input-deadline"
                />
              </div>

              <div>
                <Label htmlFor="monthlyContribution">Monthly Contribution (Optional)</Label>
                <Input
                  id="monthlyContribution"
                  type="number"
                  step="0.01"
                  value={formData.monthlyContribution}
                  onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                  placeholder="Suggested based on timeline"
                />
              </div>

              {formData.targetAmount && formData.deadline && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-2">Savings Plan:</p>
                    <p className="text-sm text-muted-foreground">
                      To reach ${parseFloat(formData.targetAmount).toFixed(2)} by{' '}
                      {new Date(formData.deadline).toLocaleDateString()}, save approximately{' '}
                      <span className="font-semibold text-foreground">
                        ${(
                          (parseFloat(formData.targetAmount) - parseFloat(formData.currentAmount || '0')) /
                          Math.max(1, Math.ceil((new Date(formData.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
                        ).toFixed(2)}
                      </span>{' '}
                      per month.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Milestone Celebration */}
      {celebrationState.show && celebrationState.goal && (
        <MilestoneCelebration
          milestone={celebrationState.milestone}
          goal={celebrationState.goal}
          onComplete={() => setCelebrationState({ show: false, goal: null, milestone: 0 })}
        />
      )}

      {/* Victory Lap */}
      {victoryState.show && victoryState.goal && (
        <VictoryLapDialog
          goal={victoryState.goal}
          open={victoryState.show}
          onOpenChange={(open) => setVictoryState({ show: open, goal: null })}
          onLockFunds={() => {
            toast({ title: "Funds Locked", description: "Moved to high-yield savings" });
          }}
          onRollOver={() => {
            toast({ title: "Rolled Over", description: "Contribution moved to next goal" });
          }}
        />
      )}
    </div>
  );
}
