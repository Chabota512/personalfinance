import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useAccounts } from "@/lib/api";
import { GoalCard } from "@/components/goal-card";
import { MobilePageShell } from "@/components/mobile-page-shell";
import { useIsMobile } from "@/hooks/use-mobile";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { Plus, Target, Plane, GraduationCap, Home, Wallet, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateScheduledAmount, calculateTargetDate, formatFrequency, formatDayOfWeek } from "@shared/goal-utils";
import { formatCurrency, calculateGoalProgress } from "@/lib/financial-utils";
import type { ContributionFrequency, ContributionMode } from "@shared/goal-utils";
import type { Goal } from "@shared/schema";

const GOAL_TEMPLATES = [
  {
    id: 'emergency-fund',
    name: 'Emergency Fund',
    icon: Wallet,
    description: 'Build 3-6 months of expenses for financial security',
    category: 'savings',
    suggestedMonths: 12,
    color: 'text-blue-500'
  },
  {
    id: 'travel',
    name: 'Dream Vacation',
    icon: Plane,
    description: 'Save for that trip you\'ve always wanted',
    category: 'lifestyle',
    suggestedMonths: 8,
    color: 'text-purple-500'
  },
  {
    id: 'education',
    name: 'Education Fund',
    icon: GraduationCap,
    description: 'Invest in learning and skill development',
    category: 'education',
    suggestedMonths: 18,
    color: 'text-green-500'
  },
  {
    id: 'house',
    name: 'Down Payment',
    icon: Home,
    description: 'Save for a home down payment',
    category: 'major_purchase',
    suggestedMonths: 36,
    color: 'text-orange-500'
  },
  {
    id: 'investment',
    name: 'Investment Goal',
    icon: TrendingUp,
    description: 'Build wealth through investments',
    category: 'investment',
    suggestedMonths: 24,
    color: 'text-indigo-500'
  },
  {
    id: 'custom',
    name: 'Custom Goal',
    icon: Target,
    description: 'Create your own personalized goal',
    category: 'other',
    suggestedMonths: 12,
    color: 'text-gray-500'
  }
];

// Compact mobile goal card component
function CompactGoalCard({ goal }: { goal: Goal }) {
  const current = parseFloat(goal.currentAmount);
  const target = parseFloat(goal.targetAmount);
  const progress = calculateGoalProgress(current, target);

  return (
    <div className="p-2 border rounded-md bg-card space-y-1.5" data-testid={`goal-card-${goal.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="p-1 bg-primary/10 rounded">
            <Target className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{goal.name}</h3>
          </div>
        </div>
        <Badge variant="outline" className="text-xs px-1.5 py-0">
          {goal.status}
        </Badge>
      </div>

      <Progress value={progress} className="h-1" />

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-muted-foreground">Current: </span>
          <span className="font-mono font-semibold text-success">
            {formatCurrency(current)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Target: </span>
          <span className="font-mono font-semibold">
            {formatCurrency(target)}
          </span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        {progress.toFixed(0)}% complete
      </div>
    </div>
  );
}

export default function Goals() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeGoalsExpanded, setActiveGoalsExpanded] = useState(true);
  const [completedGoalsExpanded, setCompletedGoalsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
    category: "savings",
    description: "",
    contributionMode: "calculated_amount" as ContributionMode,
    contributionFrequency: "monthly" as ContributionFrequency,
    scheduledAmount: "",
    dayOfWeek: null as number | null,
    dayOfMonth: null as number | null,
    sourceAccountId: null as string | null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useGoals();
  const { data: accounts } = useAccounts();

  const createMutation = useCreateGoal();

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1 && !selectedTemplate) {
      newErrors.template = "Please select a goal template";
    }

    if (currentStep === 2) {
      if (!formData.name.trim()) {
        newErrors.name = "Goal name is required";
      }
      if (!formData.category) {
        newErrors.category = "Category is required";
      }
    }

    if (currentStep === 3) {
      const targetAmount = parseFloat(formData.targetAmount);
      if (!formData.targetAmount || isNaN(targetAmount) || targetAmount <= 0) {
        newErrors.targetAmount = "Target amount must be greater than 0";
      }

      const currentAmount = parseFloat(formData.currentAmount);
      if (isNaN(currentAmount) || currentAmount < 0) {
        newErrors.currentAmount = "Current amount must be 0 or greater";
      }

      if (currentAmount > targetAmount) {
        newErrors.currentAmount = "Current amount cannot exceed target amount";
      }

      // Target date validation depends on contribution mode
      if (formData.contributionMode === "calculated_amount" || formData.contributionMode === "flexible_amount") {
        if (!formData.targetDate) {
          newErrors.targetDate = "Target date is required";
        } else {
          const targetDate = new Date(formData.targetDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (targetDate <= today) {
            newErrors.targetDate = "Target date must be in the future";
          }
        }
      }

      // Validate scheduled amount for "calculated_date" mode
      if (formData.contributionMode === "calculated_date") {
        const scheduledAmount = parseFloat(formData.scheduledAmount);
        if (!formData.scheduledAmount || isNaN(scheduledAmount) || scheduledAmount <= 0) {
          newErrors.scheduledAmount = "Scheduled amount must be greater than 0";
        }
      }

      // Validate frequency for non-flexible modes
      if (formData.contributionMode !== "completely_flexible" && !formData.contributionFrequency) {
        newErrors.contributionFrequency = "Please select a contribution frequency";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = GOAL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const suggestedDate = new Date();
      suggestedDate.setMonth(suggestedDate.getMonth() + template.suggestedMonths);

      setFormData({
        ...formData,
        name: template.id === 'custom' ? '' : template.name,
        category: template.category,
        targetDate: suggestedDate.toISOString().split('T')[0],
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      const submissionData: any = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount),
        category: formData.category,
        description: formData.description,
        contributionMode: formData.contributionMode,
      };

      // Add target date for modes that use it
      if (formData.contributionMode === "calculated_amount" || formData.contributionMode === "flexible_amount") {
        submissionData.deadline = formData.targetDate;
      }

      // Add contribution frequency for non-flexible modes
      if (formData.contributionMode !== "completely_flexible") {
        submissionData.contributionFrequency = formData.contributionFrequency;
      }

      // Add scheduled amount for calculated_date mode
      if (formData.contributionMode === "calculated_date" && formData.scheduledAmount) {
        submissionData.scheduledAmount = parseFloat(formData.scheduledAmount);
      }

      // Add specific day fields if set
      if (formData.dayOfWeek !== null) {
        submissionData.dayOfWeek = formData.dayOfWeek;
      }
      if (formData.dayOfMonth !== null) {
        submissionData.dayOfMonth = formData.dayOfMonth;
      }

      // Add source account if selected
      if (formData.sourceAccountId) {
        submissionData.sourceAccountId = formData.sourceAccountId;
      }

      await createMutation.mutateAsync(submissionData);
      setIsOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Goal created successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      targetAmount: "",
      currentAmount: "0",
      targetDate: "",
      category: "savings",
      description: "",
      contributionMode: "calculated_amount",
      contributionFrequency: "monthly",
      scheduledAmount: "",
      dayOfWeek: null,
      dayOfMonth: null,
      sourceAccountId: null
    });
    setSelectedTemplate(null);
    setStep(1);
    setErrors({});
  };

  const activeGoals = goals?.filter((g: any) => !g.isAchieved) || [];
  const completedGoals = goals?.filter((g: any) => g.isAchieved) || [];

  // Mobile Layout
  if (isMobile) {
    return (
      <MobilePageShell compact scrollable={false} className="flex flex-col h-full">
        {/* Compact Header */}
        <div className="flex items-center justify-between py-1 px-3 border-b flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold">Goals</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-goal">
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">Create New Goal</DialogTitle>
                <DialogDescription className="text-sm">
                  Step {step} of 3: {step === 1 ? "Choose template" : step === 2 ? "Set details" : "Configure amounts"}
                </DialogDescription>
              </DialogHeader>

              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Select a goal template:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_TEMPLATES.map((template) => {
                      const Icon = template.icon;
                      return (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-all p-2 ${
                            selectedTemplate === template.id
                              ? 'ring-2 ring-primary'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div className={`p-2 rounded-full bg-primary/10 ${template.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-xs">{template.name}</h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                  {errors.template && (
                    <p className="text-xs text-destructive">{errors.template}</p>
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleNext} disabled={!selectedTemplate}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-sm">Goal Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Emergency Fund"
                      className="text-sm"
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="major_purchase">Major Purchase</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-xs text-destructive mt-1">{errors.category}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add any notes..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={handleBack}>
                      Back
                    </Button>
                    <Button size="sm" onClick={handleNext}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  {/* Basic Amounts Section */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="targetAmount" className="text-sm">Target Amount ($) *</Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        step="0.01"
                        value={formData.targetAmount}
                        onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                        placeholder="5000"
                        className="text-sm"
                      />
                      {errors.targetAmount && (
                        <p className="text-xs text-destructive mt-1">{errors.targetAmount}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="currentAmount" className="text-sm">Current Amount ($) *</Label>
                      <Input
                        id="currentAmount"
                        type="number"
                        step="0.01"
                        value={formData.currentAmount}
                        onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                        placeholder="0"
                        className="text-sm"
                      />
                      {errors.currentAmount && (
                        <p className="text-xs text-destructive mt-1">{errors.currentAmount}</p>
                      )}
                    </div>
                  </div>

                  {/* Contribution Schedule Section */}
                  <div className="space-y-3 border-t pt-3">
                    <h3 className="text-sm font-semibold">Contribution Schedule</h3>

                    <div>
                      <Label className="text-sm">How do you want to contribute? *</Label>
                      <RadioGroup
                        value={formData.contributionMode}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          contributionMode: value as ContributionMode,
                          targetDate: value === "calculated_date" ? "" : formData.targetDate,
                          scheduledAmount: value !== "calculated_date" ? "" : formData.scheduledAmount
                        })}
                        className="mt-2 space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="calculated_amount" id="calc-amount" />
                          <Label htmlFor="calc-amount" className="font-normal cursor-pointer text-xs leading-tight">
                            Calculate amount - Set deadline, we calculate savings
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="calculated_date" id="calc-date" />
                          <Label htmlFor="calc-date" className="font-normal cursor-pointer text-xs leading-tight">
                            Calculate date - Set amount, we calculate deadline
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="flexible_amount" id="flex-amount" />
                          <Label htmlFor="flex-amount" className="font-normal cursor-pointer text-xs leading-tight">
                            Flexible amounts - Regular schedule, varying amounts
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="completely_flexible" id="flex-all" />
                          <Label htmlFor="flex-all" className="font-normal cursor-pointer text-xs leading-tight">
                            Whenever possible - No fixed schedule
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Target Date */}
                    {(formData.contributionMode === "calculated_amount" || formData.contributionMode === "flexible_amount") && (
                      <div>
                        <Label htmlFor="targetDate" className="text-sm">Target Date *</Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={formData.targetDate}
                          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                          className="text-sm"
                        />
                        {errors.targetDate && (
                          <p className="text-xs text-destructive mt-1">{errors.targetDate}</p>
                        )}
                      </div>
                    )}

                    {/* Contribution Frequency */}
                    {formData.contributionMode !== "completely_flexible" && (
                      <div>
                        <Label htmlFor="frequency" className="text-sm">Frequency *</Label>
                        <Select
                          value={formData.contributionFrequency}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            contributionFrequency: value as ContributionFrequency,
                            dayOfWeek: null,
                            dayOfMonth: null
                          })}
                        >
                          <SelectTrigger id="frequency" className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.contributionFrequency && (
                          <p className="text-xs text-destructive mt-1">{errors.contributionFrequency}</p>
                        )}
                      </div>
                    )}

                    {/* Scheduled Amount */}
                    {formData.contributionMode === "calculated_date" && (
                      <div>
                        <Label htmlFor="scheduledAmount" className="text-sm">Amount per Contribution ($) *</Label>
                        <Input
                          id="scheduledAmount"
                          type="number"
                          step="0.01"
                          value={formData.scheduledAmount}
                          onChange={(e) => setFormData({ ...formData, scheduledAmount: e.target.value })}
                          placeholder="100"
                          className="text-sm"
                        />
                        {errors.scheduledAmount && (
                          <p className="text-xs text-destructive mt-1">{errors.scheduledAmount}</p>
                        )}
                      </div>
                    )}

                    {/* Day of Week */}
                    {formData.contributionFrequency === "weekly" && formData.contributionMode !== "completely_flexible" && (
                      <div>
                        <Label htmlFor="dayOfWeek" className="text-sm">Day of week (Optional)</Label>
                        <Select
                          value={formData.dayOfWeek?.toString() || ""}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            dayOfWeek: value ? parseInt(value) : null
                          })}
                        >
                          <SelectTrigger id="dayOfWeek" className="text-sm">
                            <SelectValue placeholder="Any day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Day of Month */}
                    {formData.contributionFrequency === "monthly" && formData.contributionMode !== "completely_flexible" && (
                      <div>
                        <Label htmlFor="dayOfMonth" className="text-sm">Day of month (Optional)</Label>
                        <Select
                          value={formData.dayOfMonth?.toString() || ""}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            dayOfMonth: value ? parseInt(value) : null
                          })}
                        >
                          <SelectTrigger id="dayOfMonth" className="text-sm">
                            <SelectValue placeholder="Any day" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Source Account */}
                    <div>
                      <Label htmlFor="sourceAccount" className="text-sm">Source Account (Optional)</Label>
                      <Select
                        value={formData.sourceAccountId || ""}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          sourceAccountId: value || null
                        })}
                      >
                        <SelectTrigger id="sourceAccount" className="text-sm">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} (${parseFloat(account.balance).toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Calculation Preview */}
                  {formData.targetAmount && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium mb-1.5">💡 Your Plan:</p>

                        {formData.contributionMode === "calculated_amount" && formData.targetDate && formData.contributionFrequency !== "flexible" && (
                          <div className="text-xs space-y-0.5">
                            <p className="text-muted-foreground">
                              To reach <span className="font-semibold text-foreground">${parseFloat(formData.targetAmount).toFixed(2)}</span> by{' '}
                              {new Date(formData.targetDate).toLocaleDateString()}
                            </p>
                            <p className="text-muted-foreground">
                              Save{' '}
                              <span className="font-semibold text-foreground">
                                ${calculateScheduledAmount(
                                  parseFloat(formData.targetAmount),
                                  parseFloat(formData.currentAmount || '0'),
                                  new Date(formData.targetDate),
                                  formData.contributionFrequency
                                ).toFixed(2)}
                              </span>{' '}
                              {formatFrequency(formData.contributionFrequency).toLowerCase()}
                            </p>
                          </div>
                        )}

                        {formData.contributionMode === "calculated_date" && formData.scheduledAmount && formData.contributionFrequency !== "flexible" && (
                          <div className="text-xs space-y-0.5">
                            <p className="text-muted-foreground">
                              Saving{' '}
                              <span className="font-semibold text-foreground">
                                ${parseFloat(formData.scheduledAmount).toFixed(2)}
                              </span>{' '}
                              {formatFrequency(formData.contributionFrequency).toLowerCase()}
                            </p>
                            <p className="text-muted-foreground">
                              Reach goal by{' '}
                              <span className="font-semibold text-foreground">
                                {calculateTargetDate(
                                  parseFloat(formData.targetAmount),
                                  parseFloat(formData.currentAmount || '0'),
                                  parseFloat(formData.scheduledAmount),
                                  formData.contributionFrequency
                                ).toLocaleDateString()}
                              </span>
                            </p>
                          </div>
                        )}

                        {formData.contributionMode === "flexible_amount" && formData.targetDate && (
                          <p className="text-xs text-muted-foreground">
                            Target: <span className="font-semibold text-foreground">${parseFloat(formData.targetAmount).toFixed(2)}</span> by{' '}
                            {new Date(formData.targetDate).toLocaleDateString()} with flexible contributions
                          </p>
                        )}

                        {formData.contributionMode === "completely_flexible" && (
                          <p className="text-xs text-muted-foreground">
                            Contribute to <span className="font-semibold text-foreground">${parseFloat(formData.targetAmount).toFixed(2)}</span> goal whenever possible
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={handleBack}>
                      Back
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Goal"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse bg-muted rounded-md" />
                ))}
              </div>
            ) : (
              <>
                {/* Active Goals Section */}
                {activeGoals.length > 0 && (
                  <Collapsible open={activeGoalsExpanded} onOpenChange={setActiveGoalsExpanded}>
                    <div className="space-y-2">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full py-1 text-sm font-semibold hover-elevate rounded px-2">
                          <span>Active Goals ({activeGoals.length})</span>
                          {activeGoalsExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2">
                        {activeGoals.map((goal: any) => (
                          <CompactGoalCard key={goal.id} goal={goal} />
                        ))}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {/* Completed Goals Section */}
                {completedGoals.length > 0 && (
                  <Collapsible open={completedGoalsExpanded} onOpenChange={setCompletedGoalsExpanded}>
                    <div className="space-y-2">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full py-1 text-sm font-semibold hover-elevate rounded px-2">
                          <span>Completed 🎉 ({completedGoals.length})</span>
                          {completedGoalsExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2">
                        {completedGoals.map((goal: any) => (
                          <CompactGoalCard key={goal.id} goal={goal} />
                        ))}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {/* Empty State */}
                {goals?.length === 0 && (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-sm font-semibold mb-1">No goals yet</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Create your first financial goal
                      </p>
                      <Button size="sm" onClick={() => setIsOpen(true)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Create First Goal
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
        </div>
      </MobilePageShell>
    );
  }

  // Desktop Layout (Original)
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-display-xl md:text-display-2xl font-bold">Financial Goals</h1>
            <p className="text-body-md text-muted-foreground">Track your savings goals and progress</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-goal">
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Step {step} of 3: {step === 1 ? "Choose a template" : step === 2 ? "Set details" : "Configure amounts"}
              </DialogDescription>
            </DialogHeader>

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select a goal template to get started:</p>
                <div className="grid grid-cols-2 gap-4">
                  {GOAL_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedTemplate === template.id
                            ? 'ring-2 ring-primary'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-3 rounded-full bg-primary/10 ${template.color}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {errors.template && (
                  <p className="text-sm text-destructive">{errors.template}</p>
                )}
                <div className="flex justify-end">
                  <Button onClick={handleNext} disabled={!selectedTemplate}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Goal Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Emergency Fund"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="major_purchase">Major Purchase</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive mt-1">{errors.category}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add any notes about this goal..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* Basic Amounts Section */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="targetAmount">Target Amount ($) *</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      step="0.01"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="5000"
                    />
                    {errors.targetAmount && (
                      <p className="text-sm text-destructive mt-1">{errors.targetAmount}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="currentAmount">Current Amount ($) *</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      step="0.01"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                      placeholder="0"
                    />
                    {errors.currentAmount && (
                      <p className="text-sm text-destructive mt-1">{errors.currentAmount}</p>
                    )}
                  </div>
                </div>

                {/* Contribution Schedule Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Contribution Schedule</h3>

                  <div>
                    <Label>How do you want to contribute? *</Label>
                    <RadioGroup
                      value={formData.contributionMode}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        contributionMode: value as ContributionMode,
                        targetDate: value === "calculated_date" ? "" : formData.targetDate,
                        scheduledAmount: value !== "calculated_date" ? "" : formData.scheduledAmount
                      })}
                      className="mt-2 space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="calculated_amount" id="calc-amount" />
                        <Label htmlFor="calc-amount" className="font-normal cursor-pointer">
                          Calculate amount for me - I'll set the deadline, you tell me how much to save
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="calculated_date" id="calc-date" />
                        <Label htmlFor="calc-date" className="font-normal cursor-pointer">
                          Calculate date for me - I'll save a fixed amount, you tell me when I'll reach it
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="flexible_amount" id="flex-amount" />
                        <Label htmlFor="flex-amount" className="font-normal cursor-pointer">
                          Flexible amounts - I'll contribute regularly but amounts may vary
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="completely_flexible" id="flex-all" />
                        <Label htmlFor="flex-all" className="font-normal cursor-pointer">
                          Whenever I can - No fixed schedule, I'll contribute when possible
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Target Date (for calculated_amount and flexible_amount modes) */}
                  {(formData.contributionMode === "calculated_amount" || formData.contributionMode === "flexible_amount") && (
                    <div>
                      <Label htmlFor="targetDate">Target Date *</Label>
                      <Input
                        id="targetDate"
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      />
                      {errors.targetDate && (
                        <p className="text-sm text-destructive mt-1">{errors.targetDate}</p>
                      )}
                    </div>
                  )}

                  {/* Contribution Frequency (for all except completely_flexible) */}
                  {formData.contributionMode !== "completely_flexible" && (
                    <div>
                      <Label htmlFor="frequency">Contribution Frequency *</Label>
                      <Select
                        value={formData.contributionFrequency}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          contributionFrequency: value as ContributionFrequency,
                          dayOfWeek: null,
                          dayOfMonth: null
                        })}
                      >
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.contributionFrequency && (
                        <p className="text-sm text-destructive mt-1">{errors.contributionFrequency}</p>
                      )}
                    </div>
                  )}

                  {/* Scheduled Amount (for calculated_date mode) */}
                  {formData.contributionMode === "calculated_date" && (
                    <div>
                      <Label htmlFor="scheduledAmount">Amount per Contribution ($) *</Label>
                      <Input
                        id="scheduledAmount"
                        type="number"
                        step="0.01"
                        value={formData.scheduledAmount}
                        onChange={(e) => setFormData({ ...formData, scheduledAmount: e.target.value })}
                        placeholder="100"
                      />
                      {errors.scheduledAmount && (
                        <p className="text-sm text-destructive mt-1">{errors.scheduledAmount}</p>
                      )}
                    </div>
                  )}

                  {/* Specific Day Picker for Weekly */}
                  {formData.contributionFrequency === "weekly" && formData.contributionMode !== "completely_flexible" && (
                    <div>
                      <Label htmlFor="dayOfWeek">Which day of the week? (Optional)</Label>
                      <Select
                        value={formData.dayOfWeek?.toString() || ""}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          dayOfWeek: value ? parseInt(value) : null
                        })}
                      >
                        <SelectTrigger id="dayOfWeek">
                          <SelectValue placeholder="Any day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Specific Day Picker for Monthly */}
                  {formData.contributionFrequency === "monthly" && formData.contributionMode !== "completely_flexible" && (
                    <div>
                      <Label htmlFor="dayOfMonth">Which day of the month? (Optional)</Label>
                      <Select
                        value={formData.dayOfMonth?.toString() || ""}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          dayOfMonth: value ? parseInt(value) : null
                        })}
                      >
                        <SelectTrigger id="dayOfMonth">
                          <SelectValue placeholder="Any day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Source Account Selection */}
                  <div>
                    <Label htmlFor="sourceAccount">Source Account (Optional)</Label>
                    <Select
                      value={formData.sourceAccountId || ""}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        sourceAccountId: value || null
                      })}
                    >
                      <SelectTrigger id="sourceAccount">
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} (${parseFloat(account.balance).toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Which account will you contribute from?
                    </p>
                  </div>
                </div>

                {/* Calculation Preview */}
                {formData.targetAmount && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium mb-2">💡 Your Plan:</p>

                      {formData.contributionMode === "calculated_amount" && formData.targetDate && formData.contributionFrequency !== "flexible" && (
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground">
                            To reach <span className="font-semibold text-foreground">${parseFloat(formData.targetAmount).toFixed(2)}</span> by{' '}
                            {new Date(formData.targetDate).toLocaleDateString()}
                          </p>
                          <p className="text-muted-foreground">
                            You need to save{' '}
                            <span className="font-semibold text-foreground">
                              ${calculateScheduledAmount(
                                parseFloat(formData.targetAmount),
                                parseFloat(formData.currentAmount || '0'),
                                new Date(formData.targetDate),
                                formData.contributionFrequency
                              ).toFixed(2)}
                            </span>{' '}
                            {formatFrequency(formData.contributionFrequency).toLowerCase()}
                          </p>
                        </div>
                      )}

                      {formData.contributionMode === "calculated_date" && formData.scheduledAmount && formData.contributionFrequency !== "flexible" && (
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground">
                            Saving{' '}
                            <span className="font-semibold text-foreground">
                              ${parseFloat(formData.scheduledAmount).toFixed(2)}
                            </span>{' '}
                            {formatFrequency(formData.contributionFrequency).toLowerCase()}
                          </p>
                          <p className="text-muted-foreground">
                            You'll reach your goal by{' '}
                            <span className="font-semibold text-foreground">
                              {calculateTargetDate(
                                parseFloat(formData.targetAmount),
                                parseFloat(formData.currentAmount || '0'),
                                parseFloat(formData.scheduledAmount),
                                formData.contributionFrequency
                              ).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                      )}

                      {formData.contributionMode === "flexible_amount" && formData.targetDate && (
                        <p className="text-sm text-muted-foreground">
                          Target: <span className="font-semibold text-foreground">${parseFloat(formData.targetAmount).toFixed(2)}</span> by{' '}
                          {new Date(formData.targetDate).toLocaleDateString()} with flexible contributions
                        </p>
                      )}

                      {formData.contributionMode === "completely_flexible" && (
                        <p className="text-sm text-muted-foreground">
                          You'll contribute to your <span className="font-semibold text-foreground">${parseFloat(formData.targetAmount).toFixed(2)}</span> goal whenever you can
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Goals</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal: any) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Completed Goals 🎉</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map((goal: any) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}

          {goals?.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first financial goal
                </p>
                <Button onClick={() => setIsOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
      </div>
    </div>
  );
}
