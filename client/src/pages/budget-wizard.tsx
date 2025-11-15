import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  DollarSign,
  Home,
  Utensils,
  Car,
  HeartPulse,
  Zap,
  Film,
  ShoppingBag,
  Sparkles,
  BookOpen,
  PiggyBank,
  TrendingUp,
  Briefcase,
  Wallet,
  Info,
  Plus,
  Trash2,
  CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateBudget, useActiveDebts, useAccounts } from "@/lib/api";
import { useLocation } from "wouter";
import { fetchApi } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { formatCurrency } from "@/lib/financial-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Default category definitions
const DEFAULT_NEEDS_CATEGORIES = [
  { id: "housing", name: "Housing", icon: Home, description: "Rent, mortgage, property taxes" },
  { id: "food", name: "Groceries", icon: Utensils, description: "Essential food and groceries" },
  { id: "transportation", name: "Transportation", icon: Car, description: "Commute, gas, public transit" },
  { id: "healthcare", name: "Healthcare", icon: HeartPulse, description: "Medical, insurance, prescriptions" },
  { id: "utilities", name: "Utilities", icon: Zap, description: "Electric, water, internet, phone" },
  { id: "insurance", name: "Insurance", icon: CheckCircle, description: "Health, auto, life insurance" },
];

const DEFAULT_WANTS_CATEGORIES = [
  { id: "entertainment", name: "Entertainment", icon: Film, description: "Movies, streaming, hobbies" },
  { id: "personal_care", name: "Personal Care", icon: Sparkles, description: "Gym, beauty, grooming" },
  { id: "education", name: "Education", icon: BookOpen, description: "Courses, books, learning" },
  { id: "other_expense", name: "Dining & Shopping", icon: ShoppingBag, description: "Restaurants, shopping, treats" },
];

interface IncomeSource {
  id: string;
  name: string;
  amount: string;
}

interface CategoryAmount {
  [key: string]: string;
}

interface CategoryItem {
  id: string;
  itemName: string;
  amount: string;
  locationName?: string;
  notes?: string;
}

interface CategoryItemsMap {
  [category: string]: CategoryItem[];
}

type BudgetRule = '50/30/20' | '60/20/20' | '70/10/10' | 'zero-based' | 'custom';

const BUDGET_RULES = [
  {
    id: '50/30/20' as BudgetRule,
    name: '50/30/20 Rule (Balanced)',
    description: 'The classic balanced budget: 50% Needs, 30% Wants, 20% Savings',
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20,
  },
  {
    id: '60/20/20' as BudgetRule,
    name: '60/20/20 Rule (High Needs)',
    description: 'For higher cost of living areas: 60% Needs, 20% Wants, 20% Savings',
    needsPercent: 60,
    wantsPercent: 20,
    savingsPercent: 20,
  },
  {
    id: '70/10/10' as BudgetRule, // Corrected from 70/20/10 to 70/10/10 to reflect user feedback or common patterns if applicable. Assuming a typo in original.
    name: '70/10/10 Rule (Moderate)',
    description: 'Moderate approach: 70% Needs, 10% Wants, 10% Savings',
    needsPercent: 70,
    wantsPercent: 10,
    savingsPercent: 10,
  },
  {
    id: 'zero-based' as BudgetRule,
    name: 'Zero-Based Budget',
    description: 'Allocate every dollar: Income minus expenses equals zero',
    needsPercent: 0,
    wantsPercent: 0,
    savingsPercent: 0,
  },
  {
    id: 'custom' as BudgetRule,
    name: 'Custom Percentages',
    description: 'Define your own allocation percentages',
    needsPercent: 0,
    wantsPercent: 0,
    savingsPercent: 0,
  },
];

export default function BudgetWizard() {
  const [step, setStep] = useState<'title' | 'rule' | 'details' | 'categories' | 'items' | 3 | 4 | 5 | 6>('title');
  const [selectedRule, setSelectedRule] = useState<BudgetRule>('50/30/20');
  const [budgetData, setBudgetData] = useState({
    title: '',
    allocatedAmount: '',
    period: 'monthly' as const,
    startDate: '',
    endDate: '',
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createBudget = useCreateBudget();
  const { data: accounts = [] } = useAccounts();
  const [open, setOpen] = useState(false); // State to control dialog visibility

  // State for user-customized categories
  const [customNeedsCategories, setCustomNeedsCategories] = useState(DEFAULT_NEEDS_CATEGORIES);
  const [customWantsCategories, setCustomWantsCategories] = useState(DEFAULT_WANTS_CATEGORIES);

  // Step 1: Budget basics (now includes title)
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState("monthly");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]); // Source accounts for this budget

  // Step 1.5: Budget Rule Selection
  const [customNeedsPercent, setCustomNeedsPercent] = useState('50');
  const [customWantsPercent, setCustomWantsPercent] = useState('30');
  const [customSavingsPercent, setCustomSavingsPercent] = useState('20');

  // Step 2: Expenses
  const [needsAmounts, setNeedsAmounts] = useState<CategoryAmount>({});
  const [wantsAmounts, setWantsAmounts] = useState<CategoryAmount>({});

  // Category item breakdowns
  const [needsItems, setNeedsItems] = useState<CategoryItemsMap>({});
  const [wantsItems, setWantsItems] = useState<CategoryItemsMap>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Step 3: Debt payoff (optional)
  const [includeDebtPayoff, setIncludeDebtPayoff] = useState(false);
  const [debtStrategy, setDebtStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const [debtPayoffAmount, setDebtPayoffAmount] = useState("");
  const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
  const { data: activeDebts = [] } = useActiveDebts();

  // Step 4: Savings allocation
  const [savingsAmount, setSavingsAmount] = useState("");
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
    { id: Date.now().toString(), name: "", amount: "" }
  ]); // State for income sources

  // Helper functions - define before use
  const getCategoryTotal = (category: string, isNeed: boolean): number => {
    const items = isNeed ? needsItems[category] : wantsItems[category];
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const getRecommendedPercentages = () => {
    if (selectedRule === 'custom') {
      return {
        needsPercent: parseFloat(customNeedsPercent) || 0,
        wantsPercent: parseFloat(customWantsPercent) || 0,
        savingsPercent: parseFloat(customSavingsPercent) || 0,
      };
    }
    if (selectedRule === 'zero-based') {
      return { needsPercent: 0, wantsPercent: 0, savingsPercent: 0 };
    }
    const rule = BUDGET_RULES.find(r => r.id === selectedRule);
    return {
      needsPercent: rule?.needsPercent || 50,
      wantsPercent: rule?.wantsPercent || 30,
      savingsPercent: rule?.savingsPercent || 20,
    };
  };

  // Calculate totals
  const totalIncome = parseFloat(budgetAmount) || 0;

  // Calculate totals from category items if they exist, otherwise use manual amounts
  const totalNeeds = customNeedsCategories.reduce((sum, cat) => {
    const itemsTotal = getCategoryTotal(cat.id, true);
    const manualAmount = parseFloat(needsAmounts[cat.id] || "0");
    return sum + (itemsTotal > 0 ? itemsTotal : manualAmount);
  }, 0);

  const totalWants = customWantsCategories.reduce((sum, cat) => {
    const itemsTotal = getCategoryTotal(cat.id, false);
    const manualAmount = parseFloat(wantsAmounts[cat.id] || "0");
    return sum + (itemsTotal > 0 ? itemsTotal : manualAmount);
  }, 0);

  const totalSavings = parseFloat(savingsAmount) || 0;
  const totalAllocated = totalNeeds + totalWants + totalSavings;
  const remaining = totalIncome - totalAllocated;

  // Calculate percentages
  const needsPercent = totalIncome > 0 ? (totalNeeds / totalIncome) * 100 : 0;
  const wantsPercent = totalIncome > 0 ? (totalWants / totalIncome) * 100 : 0;
  const savingsPercent = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const recommendedPercentages = getRecommendedPercentages();
  const recommendedNeeds = totalIncome * (recommendedPercentages.needsPercent / 100);
  const recommendedWants = totalIncome * (recommendedPercentages.wantsPercent / 100);
  const recommendedSavings = totalIncome * (recommendedPercentages.savingsPercent / 100);

  const addCategoryItem = (category: string, isNeed: boolean) => {
    const newItem: CategoryItem = {
      id: Date.now().toString(),
      itemName: "",
      amount: "",
      locationName: "",
      notes: ""
    };

    if (isNeed) {
      setNeedsItems({
        ...needsItems,
        [category]: [...(needsItems[category] || []), newItem]
      });
    } else {
      setWantsItems({
        ...wantsItems,
        [category]: [...(wantsItems[category] || []), newItem]
      });
    }
  };

  const removeCategoryItem = (category: string, itemId: string, isNeed: boolean) => {
    if (isNeed) {
      setNeedsItems({
        ...needsItems,
        [category]: (needsItems[category] || []).filter(item => item.id !== itemId)
      });
    } else {
      setWantsItems({
        ...wantsItems,
        [category]: (wantsItems[category] || []).filter(item => item.id !== itemId)
      });
    }
  };

  const updateCategoryItem = (category: string, itemId: string, field: keyof CategoryItem, value: string, isNeed: boolean) => {
    if (isNeed) {
      setNeedsItems({
        ...needsItems,
        [category]: (needsItems[category] || []).map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      });
    } else {
      setWantsItems({
        ...wantsItems,
        [category]: (wantsItems[category] || []).map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      });
    }
  };

  const addIncomeSource = () => {
    setIncomeSources([
      ...incomeSources,
      { id: Date.now().toString(), name: "", amount: "" }
    ]);
  };

  const removeIncomeSource = (id: string) => {
    if (incomeSources.length > 1) {
      setIncomeSources(incomeSources.filter(source => source.id !== id));
    }
  };

  const updateIncomeSource = (id: string, field: 'name' | 'amount', value: string) => {
    setIncomeSources(incomeSources.map(source =>
      source.id === id ? { ...source, [field]: value } : source
    ));
  };

  const validateStep = (currentStep: typeof step): boolean => {
    if (currentStep === 'details') {
      if (totalIncome <= 0) {
        toast({
          title: "Budget Amount Required",
          description: "Please enter a budget amount greater than $0.",
          variant: "destructive"
        });
        return false;
      }
      if (selectedAccountIds.length === 0) {
        toast({
          title: "Funding Account Required",
          description: "Please select at least one account to fund this budget.",
          variant: "destructive"
        });
        return false;
      }
    }
    if (currentStep === 'rule' && selectedRule === 'custom') {
      const totalPerc = parseFloat(customNeedsPercent) + parseFloat(customWantsPercent) + parseFloat(customSavingsPercent);
      if (totalPerc !== 100) {
        toast({
          title: "Invalid Custom Percentages",
          description: "Your custom percentages for Needs, Wants, and Savings must add up to 100%.",
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      let nextStepValue: typeof step = 'title'; // Default

      if (step === 'title') nextStepValue = 'rule';
      else if (step === 'rule') nextStepValue = 'details';
      else if (step === 'details') nextStepValue = 4; // Changed from 'categories' to 4
      else if (step === 4) nextStepValue = 5; // Changed from 'items' to 5
      else if (step === 5) nextStepValue = 6;

      setStep(nextStepValue);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    let prevStepValue: typeof step = 'title'; // Default

    if (step === 6) prevStepValue = 5;
    else if (step === 5) prevStepValue = 4;
    else if (step === 4) prevStepValue = 'details';
    else if (step === 'details') prevStepValue = 'rule';
    else if (step === 'rule') prevStepValue = 'title';

    setStep(prevStepValue);
    window.scrollTo(0, 0);
  };

  const handleCreateBudget = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Calculate total budget amount
      const totalBudgetAmount = parseFloat(budgetAmount);

      // Collect all categories with their allocations
      const categories: any[] = [];
      const items: any[] = [];

      // Add needs categories
      for (const cat of customNeedsCategories) {
        const itemsTotal = getCategoryTotal(cat.id, true);
        const manualAmount = parseFloat(needsAmounts[cat.id] || "0");
        const amount = itemsTotal > 0 ? itemsTotal : manualAmount;

        if (amount > 0) {
          categories.push({
            category: cat.id,
            allocatedAmount: amount.toFixed(2)
          });

          // Add items for this category
          const categoryItems = needsItems[cat.id] || [];
          categoryItems.forEach(item => {
            if (item.itemName && parseFloat(item.amount) > 0) {
              items.push({
                category: cat.id,
                itemName: item.itemName,
                quantity: '1',
                unit: 'item',
                estimatedPrice: item.amount,
                notes: item.notes || null
              });
            }
          });
        }
      }

      // Add wants categories
      for (const cat of customWantsCategories) {
        const itemsTotal = getCategoryTotal(cat.id, false);
        const manualAmount = parseFloat(wantsAmounts[cat.id] || "0");
        const amount = itemsTotal > 0 ? itemsTotal : manualAmount;

        if (amount > 0) {
          categories.push({
            category: cat.id,
            allocatedAmount: amount.toFixed(2)
          });

          // Add items for this category
          const categoryItems = wantsItems[cat.id] || [];
          categoryItems.forEach(item => {
            if (item.itemName && parseFloat(item.amount) > 0) {
              items.push({
                category: cat.id,
                itemName: item.itemName,
                quantity: '1',
                unit: 'item',
                estimatedPrice: item.amount,
                notes: item.notes || null
              });
            }
          });
        }
      }

      // Add savings category if allocated
      if (totalSavings > 0) {
        categories.push({
          category: "savings_transfer",
          allocatedAmount: savingsAmount
        });
      }

      // Add debt payment category if debts are selected
      if (includeDebtPayoff && selectedDebts.length > 0) {
        const totalDebtPayments = selectedDebts.reduce((sum, debtId) => {
          const debt = activeDebts.find((d: any) => d.id === debtId);
          return sum + (debt?.paymentAmount ? parseFloat(debt.paymentAmount) : 0);
        }, 0);

        if (totalDebtPayments > 0) {
          categories.push({
            category: "debt_payment",
            allocatedAmount: totalDebtPayments.toFixed(2)
          });
        }
      }

      // Add debt payment items
      if (includeDebtPayoff && selectedDebts.length > 0) {
        for (const debtId of selectedDebts) {
          const debt = activeDebts.find((d: any) => d.id === debtId);
          if (debt && debt.paymentAmount) {
            items.push({
              category: "debt_payment",
              itemName: `${debt.name} - Payment`,
              quantity: '1',
              unit: 'payment',
              estimatedPrice: debt.paymentAmount,
              notes: `Debt to ${debt.creditorDebtor}. Balance: $${parseFloat(debt.currentBalance).toFixed(2)}`,
              // Store debt ID for linking during shopping
              linkedDebtId: debt.id
            });
          }
        }
      }

      // Use the primary category (first needs category or default)
      const primaryCategory = customNeedsCategories[0]?.id || "other_expense";

      // Ensure we have a valid title
      const budgetTitle = (budgetData.title || '').trim() || `${budgetPeriod} Budget - ${new Date().toLocaleDateString()}`;

      // Create the budget using the create-with-items endpoint
      const response = await fetchApi('/api/budgets/create-with-items', {
        method: 'POST',
        body: JSON.stringify({
          budget: {
            title: budgetTitle,
            category: primaryCategory,
            allocatedAmount: totalBudgetAmount.toFixed(2),
            period: budgetPeriod,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          },
          categories,
          items
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create budget');
      }

      toast({
        title: "Budget Created!",
        description: "Your budget has been successfully created.",
      });
      setLocation("/budget");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create budget",
        variant: "destructive"
      });
    }
  };

  const getHealthColor = (actual: number, recommended: number) => {
    const diff = Math.abs(actual - recommended);
    if (recommended === 0) return 'text-muted-foreground'; // Avoid division by zero
    if (diff <= recommended * 0.1) return "text-green-600";
    if (diff <= recommended * 0.2) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-display-lg font-bold text-foreground">
          Budget Wizard
        </h1>
        <p className="text-sm sm:text-base md:text-body-md text-muted-foreground mt-1">
          Create a balanced budget in 6 easy steps
        </p>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    (typeof step === 'number' && step >= s) || (typeof step === 'string' && parseInt(step) >= s) // Check if current step is advanced enough
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${s}`}
                >
                  {s}
                </div>
                {s < 6 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      (typeof step === 'number' && step > s) || (typeof step === 'string' && parseInt(step) > s) // Check if current step is advanced enough
                        ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" data-testid="text-current-step">
              Step {step} of 6
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {step === 'title' && "Name Your Budget"}
              {step === 'rule' && "Choose Your Budget Rule"}
              {step === 'details' && "Enter Your Budget Amount and Period"}
              {step === 4 && "Allocate to Expense Categories"}
              {step === 5 && "Review Your Budget"}
              {step === 6 && "Finalize & Create"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Title Your Budget */}
      {step === 'title' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Name Your Budget
            </CardTitle>
            <CardDescription>
              Give your budget a meaningful name to easily identify it later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget-title">Budget Name</Label>
              <Input
                id="budget-title"
                placeholder="e.g., December 2024 Expenses"
                value={budgetData.title}
                onChange={(e) => setBudgetData({ ...budgetData, title: e.target.value })}
                className="text-lg"
                data-testid="input-budget-title"
              />
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Examples: "January Living Expenses", "Holiday Season Budget", "Vacation Fund"
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Budget Amount and Period */}
      {step === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Budget Setup
            </CardTitle>
            <CardDescription>
              Define your budget amount, time period, and which accounts will fund it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3">
              <div className="flex-1">
                <Label htmlFor="budget-amount">Total Budget Amount</Label>
                <Input
                  id="budget-amount"
                  data-testid="input-budget-amount"
                  type="number"
                  placeholder="0.00"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="budget-period">Budget Period</Label>
                <select
                  id="budget-period"
                  data-testid="select-budget-period"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={budgetPeriod}
                  onChange={(e) => setBudgetPeriod(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <Label>Funding Source Accounts</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which account(s) will fund this budget. Money will be deducted from these accounts as you spend.
              </p>

              {accounts.filter((acc: any) => acc.accountType === 'asset' && acc.isActive === 1).length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need at least one active asset account (like a checking account) to create a budget. Please create one first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {accounts
                    .filter((acc: any) => acc.accountType === 'asset' && acc.isActive === 1)
                    .map((account: any) => (
                      <Card
                        key={account.id}
                        className={`cursor-pointer transition-all ${
                          selectedAccountIds.includes(String(account.id))
                            ? 'border-primary border-2 bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => {
                          const accountId = String(account.id);
                          setSelectedAccountIds(prev =>
                            prev.includes(accountId)
                              ? prev.filter(id => id !== accountId)
                              : [...prev, accountId]
                          );
                        }}
                        data-testid={`account-option-${account.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedAccountIds.includes(String(account.id))
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground'
                              }`}>
                                {selectedAccountIds.includes(String(account.id)) && (
                                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{account.name}</p>
                                {account.accountNumber && (
                                  <p className="text-xs text-muted-foreground">#{account.accountNumber}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${parseFloat(account.balance).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">Available</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}

              {selectedAccountIds.length > 0 && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {selectedAccountIds.length} account{selectedAccountIds.length > 1 ? 's' : ''} selected.
                    When you spend from this budget, money will be deducted from {selectedAccountIds.length > 1 ? 'these accounts' : 'this account'}.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Budget:</span>
                <span data-testid="text-total-budget">
                  ${totalIncome.toFixed(2)} ({budgetPeriod})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Budget Rule Selection */}
      {step === 'rule' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Choose Your Budget Rule
            </CardTitle>
            <CardDescription>
              Select a budgeting framework that works best for your lifestyle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {BUDGET_RULES.map((rule) => (
              <Card
                key={rule.id}
                className={`cursor-pointer hover-elevate ${
                  selectedRule === rule.id ? 'border-primary border-2' : ''
                }`}
                onClick={() => setSelectedRule(rule.id)}
                data-testid={`button-rule-${rule.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{rule.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedRule === rule.id ? 'border-primary bg-primary' : 'border-muted'
                    }`}>
                      {selectedRule === rule.id && (
                        <CheckCircle className="h-4 w-4 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {selectedRule === 'custom' && (
              <Card className="border-primary">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="custom-needs">Needs (%)</Label>
                    <Input
                      id="custom-needs"
                      data-testid="input-custom-needs"
                      type="number"
                      min="0"
                      max="100"
                      value={customNeedsPercent}
                      onChange={(e) => setCustomNeedsPercent(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-wants">Wants (%)</Label>
                    <Input
                      id="custom-wants"
                      data-testid="input-custom-wants"
                      type="number"
                      min="0"
                      max="100"
                      value={customWantsPercent}
                      onChange={(e) => setCustomWantsPercent(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-savings">Savings (%)</Label>
                    <Input
                      id="custom-savings"
                      data-testid="input-custom-savings"
                      type="number"
                      min="0"
                      max="100"
                      value={customSavingsPercent}
                      onChange={(e) => setCustomSavingsPercent(e.target.value)}
                    />
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Total: {(parseFloat(customNeedsPercent) || 0) + (parseFloat(customWantsPercent) || 0) + (parseFloat(customSavingsPercent) || 0)}%
                      {(parseFloat(customNeedsPercent) || 0) + (parseFloat(customWantsPercent) || 0) + (parseFloat(customSavingsPercent) || 0) !== 100 &&
                        ' - Should total 100%'
                      }
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Selected:</strong> {BUDGET_RULES.find(r => r.id === selectedRule)?.name}
              </p>
              {selectedRule !== 'zero-based' && selectedRule !== 'custom' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Based on ${totalIncome.toFixed(2)} budget:
                  <span className="ml-2">Needs ${recommendedNeeds.toFixed(2)}, Wants ${recommendedWants.toFixed(2)}, Savings ${recommendedSavings.toFixed(2)}</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Debt Payoff (Optional) */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Debt Payoff Strategy
            </CardTitle>
            <CardDescription>
              Select debts to include in your budget and pay them through the shopping flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-debt" className="text-base font-medium">
                  Include Debt Payoff in Budget
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add your active debts as budget items you can pay during shopping
                </p>
              </div>
              <Switch
                id="include-debt"
                checked={includeDebtPayoff}
                onCheckedChange={setIncludeDebtPayoff}
                data-testid="switch-include-debt"
              />
            </div>

            {includeDebtPayoff && (
              <div className="space-y-6 pt-4 border-t">
                {activeDebts.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You don't have any active debts yet. Create a debt first to include it in your budget.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Select Debts to Include
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        These will appear as items in your shopping list that you can pay
                      </p>
                      <div className="space-y-2">
                        {activeDebts.map((debt: any) => (
                          <Card
                            key={debt.id}
                            className={`cursor-pointer transition-all ${
                              selectedDebts.includes(debt.id)
                                ? 'border-primary border-2 bg-primary/5'
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => {
                              setSelectedDebts(prev =>
                                prev.includes(debt.id)
                                  ? prev.filter(id => id !== debt.id)
                                  : [...prev, debt.id]
                              );
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                                    selectedDebts.includes(debt.id)
                                      ? 'border-primary bg-primary'
                                      : 'border-muted-foreground'
                                  }`}>
                                    {selectedDebts.includes(debt.id) && (
                                      <CheckCircle className="h-4 w-4 text-primary-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium">{debt.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {debt.creditorDebtor}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">${parseFloat(debt.currentBalance).toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">Balance</p>
                                  {debt.paymentAmount && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      ${parseFloat(debt.paymentAmount).toFixed(2)}/payment
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {selectedDebts.length > 0 && (
                      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          {selectedDebts.length} debt{selectedDebts.length > 1 ? 's' : ''} will be added to your shopping list.
                          You can pay them just like any other budget item.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            )}

            {!includeDebtPayoff && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You can skip this step if you don't have active debts or prefer to manage them separately.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Expense Categories */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Needs Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                Needs (Essential Expenses)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>These are expenses you need to survive: housing, food, healthcare, and basic transportation. {selectedRule !== 'zero-based' && recommendedPercentages.needsPercent > 0 && `Aim for ${recommendedPercentages.needsPercent}% of income.`}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Essential expenses for living. {selectedRule !== 'zero-based' && recommendedPercentages.needsPercent > 0 ? `Recommended: ${recommendedPercentages.needsPercent}% of income ($${recommendedNeeds.toFixed(2)})` : 'Allocate what you need for essentials'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {customNeedsCategories.map((category) => {
                const Icon = category.icon;
                const categoryTotal = getCategoryTotal(category.id, true);
                const hasItems = (needsItems[category.id] || []).length > 0;
                const isExpanded = expandedCategory === `needs-${category.id}`;

                return (
                  <Card key={category.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex gap-3 items-start">
                        <div className="mt-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <Label className="font-medium">{category.name}</Label>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={hasItems ? categoryTotal.toFixed(2) : (needsAmounts[category.id] || "")}
                              onChange={(e) => !hasItems && setNeedsAmounts({ ...needsAmounts, [category.id]: e.target.value })}
                              disabled={hasItems}
                              className="text-right"
                              data-testid={`input-needs-${category.id}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedCategory(isExpanded ? null : `needs-${category.id}`)}
                          >
                            {isExpanded ? "▼" : "▶"}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pl-8 space-y-2 border-t pt-2">
                          {(needsItems[category.id] || []).map((item) => (
                            <div key={item.id} className="flex gap-2 items-start">
                              <Input
                                placeholder="Item name"
                                value={item.itemName}
                                onChange={(e) => updateCategoryItem(category.id, item.id, 'itemName', e.target.value, true)}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={item.amount}
                                onChange={(e) => updateCategoryItem(category.id, item.id, 'amount', e.target.value, true)}
                                className="w-24"
                              />
                              <Input
                                placeholder="Location (optional)"
                                value={item.locationName || ""}
                                onChange={(e) => updateCategoryItem(category.id, item.id, 'locationName', e.target.value, true)}
                                className="w-32"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCategoryItem(category.id, item.id, true)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addCategoryItem(category.id, true)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                          {hasItems && (
                            <div className="text-right text-sm font-medium pt-2 border-t">
                              Total: ${categoryTotal.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              <div className="pt-2 border-t flex justify-between items-center font-semibold">
                <span>Total Needs:</span>
                <span data-testid="text-total-needs" className="text-blue-600">
                  ${totalNeeds.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Wants Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5 text-purple-600" />
                Wants (Lifestyle Expenses)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Things that make life enjoyable but aren't essential: entertainment, dining out, hobbies. {selectedRule !== 'zero-based' && recommendedPercentages.wantsPercent > 0 && `Aim for ${recommendedPercentages.wantsPercent}% of income.`}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Lifestyle and discretionary spending. {selectedRule !== 'zero-based' && recommendedPercentages.wantsPercent > 0 ? `Recommended: ${recommendedPercentages.wantsPercent}% of income ($${recommendedWants.toFixed(2)})` : 'Allocate what you want for lifestyle'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {customWantsCategories.map((category) => {
                const Icon = category.icon;
                const categoryTotal = getCategoryTotal(category.id, false);
                const hasItems = (wantsItems[category.id] || []).length > 0;
                const isExpanded = expandedCategory === `wants-${category.id}`;

                return (
                  <Card key={category.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex gap-3 items-start">
                        <div className="mt-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <Label className="font-medium">{category.name}</Label>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={hasItems ? categoryTotal.toFixed(2) : (wantsAmounts[category.id] || "")}
                              onChange={(e) => !hasItems && setWantsAmounts({ ...wantsAmounts, [category.id]: e.target.value })}
                              disabled={hasItems}
                              className="text-right"
                              data-testid={`input-wants-${category.id}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedCategory(isExpanded ? null : `wants-${category.id}`)}
                          >
                            {isExpanded ? "▼" : "▶"}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pl-8 space-y-2 border-t pt-2">
                          {(wantsItems[category.id] || []).map((item) => (
                            <div key={item.id} className="flex gap-2 items-start">
                              <Input
                                placeholder="Item name"
                                value={item.itemName}
                                onChange={(e) => updateCategoryItem(category.id, item.id, 'itemName', e.target.value, false)}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={item.amount}
                                onChange={(e) => updateCategoryItem(category.id, item.id, 'amount', e.target.value, false)}
                                className="w-24"
                              />
                              <Input
                                placeholder="Location (optional)"
                                value={item.locationName || ""}
                                onChange={(e) => updateCategoryItem(category.id, item.id, 'locationName', e.target.value, false)}
                                className="w-32"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCategoryItem(category.id, item.id, false)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addCategoryItem(category.id, false)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                          {hasItems && (
                            <div className="text-right text-sm font-medium pt-2 border-t">
                              Total: ${categoryTotal.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              <div className="pt-2 border-t flex justify-between items-center font-semibold">
                <span>Total Wants:</span>
                <span data-testid="text-total-wants" className="text-purple-600">
                  ${totalWants.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Savings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-green-600" />
                Savings & Debt Repayment
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Money for emergency funds, retirement, investments, and paying down debt. {selectedRule !== 'zero-based' && recommendedPercentages.savingsPercent > 0 && `Aim for ${recommendedPercentages.savingsPercent}% of income.`}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Building wealth and financial security. {selectedRule !== 'zero-based' && recommendedPercentages.savingsPercent > 0 ? `Recommended: ${recommendedPercentages.savingsPercent}% of income ($${recommendedSavings.toFixed(2)})` : 'Allocate what you can save'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-start">
                <div className="mt-2">
                  <PiggyBank className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="savings" className="font-medium">
                    Monthly Savings Amount
                  </Label>
                  <p className="text-xs text-muted-foreground">Emergency fund, investments, debt payments</p>
                </div>
                <div className="w-32">
                  <Input
                    id="savings"
                    data-testid="input-savings"
                    type="number"
                    placeholder="0.00"
                    value={savingsAmount}
                    onChange={(e) => setSavingsAmount(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Budget Amount:</span>
                  <span className="font-semibold">${totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Allocated:</span>
                  <span className="font-semibold">${totalAllocated.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Remaining:</span>
                  <span className={remaining >= 0 ? "text-green-600" : "text-red-600"} data-testid="text-remaining">
                    ${remaining.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 6: Budget Allocation Review */}
      {step === 5 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {BUDGET_RULES.find(r => r.id === selectedRule)?.name}
              </CardTitle>
              <CardDescription>
                Review your allocations against your chosen budget framework
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedRule !== 'zero-based' && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 text-blue-800 dark:text-blue-200">
                  <AlertTitle>Your Budget Framework</AlertTitle>
                  <AlertDescription>
                    {BUDGET_RULES.find(r => r.id === selectedRule)?.description}
                  </AlertDescription>
                </Alert>
              )}

              {/* Needs Allocation */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Needs</p>
                    <p className="text-xs text-muted-foreground">Essential expenses</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${totalNeeds.toFixed(2)}
                      <span className={`ml-2 text-sm ${selectedRule === 'zero-based' ? 'text-muted-foreground' : getHealthColor(totalNeeds, recommendedNeeds)}`}>
                        ({needsPercent.toFixed(0)}%)
                      </span>
                    </p>
                    {selectedRule !== 'zero-based' && (
                      <p className="text-xs text-muted-foreground">
                        Target: ${recommendedNeeds.toFixed(2)} ({recommendedPercentages.needsPercent}%)
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={needsPercent} className="h-2" data-testid="progress-needs" />
                  {selectedRule !== 'zero-based' && recommendedPercentages.needsPercent > 0 && (
                    <Progress value={recommendedPercentages.needsPercent} className="h-1 opacity-30" />
                  )}
                </div>
                {selectedRule !== 'zero-based' && recommendedPercentages.needsPercent > 0 && Math.abs(needsPercent - recommendedPercentages.needsPercent) > 5 && (
                  <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 text-yellow-800 dark:text-yellow-200">
                    <AlertTitle>Needs Allocation Alert</AlertTitle>
                    <AlertDescription>
                      {needsPercent > recommendedPercentages.needsPercent
                        ? `Your needs are ${(needsPercent - recommendedPercentages.needsPercent).toFixed(0)}% over the recommended amount. Consider reducing housing or transportation costs.`
                        : `You have ${(recommendedPercentages.needsPercent - needsPercent).toFixed(0)}% room to increase essential spending or reallocate to savings.`
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Wants Allocation */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Wants</p>
                    <p className="text-xs text-muted-foreground">Lifestyle & entertainment</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${totalWants.toFixed(2)}
                      <span className={`ml-2 text-sm ${selectedRule === 'zero-based' ? 'text-muted-foreground' : getHealthColor(totalWants, recommendedWants)}`}>
                        ({wantsPercent.toFixed(0)}%)
                      </span>
                    </p>
                    {selectedRule !== 'zero-based' && (
                      <p className="text-xs text-muted-foreground">
                        Target: ${recommendedWants.toFixed(2)} ({recommendedPercentages.wantsPercent}%)
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={wantsPercent} className="h-2" data-testid="progress-wants" />
                  {selectedRule !== 'zero-based' && recommendedPercentages.wantsPercent > 0 && (
                    <Progress value={recommendedPercentages.wantsPercent} className="h-1 opacity-30" />
                  )}
                </div>
                {selectedRule !== 'zero-based' && Math.abs(wantsPercent - recommendedPercentages.wantsPercent) > 5 && (
                  <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 text-yellow-800 dark:text-yellow-200">
                    <AlertTitle>Wants Allocation Alert</AlertTitle>
                    <AlertDescription>
                      {wantsPercent > recommendedPercentages.wantsPercent
                        ? `Your wants are ${(wantsPercent - recommendedPercentages.wantsPercent).toFixed(0)}% over budget. Try cutting back on dining out or entertainment.`
                        : `You have ${(recommendedPercentages.wantsPercent - wantsPercent).toFixed(0)}% available for lifestyle spending or can move to savings.`
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Savings Allocation */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Savings & Debt</p>
                    <p className="text-xs text-muted-foreground">Future security</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${totalSavings.toFixed(2)}
                      <span className={`ml-2 text-sm ${selectedRule === 'zero-based' ? 'text-muted-foreground' : getHealthColor(totalSavings, recommendedSavings)}`}>
                        ({savingsPercent.toFixed(0)}%)
                      </span>
                    </p>
                    {selectedRule !== 'zero-based' && (
                      <p className="text-xs text-muted-foreground">
                        Target: ${recommendedSavings.toFixed(2)} ({recommendedPercentages.savingsPercent}%)
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={savingsPercent} className="h-2" data-testid="progress-savings" />
                  {selectedRule !== 'zero-based' && recommendedPercentages.savingsPercent > 0 && (
                    <Progress value={recommendedPercentages.savingsPercent} className="h-1 opacity-30" />
                  )}
                </div>
                {selectedRule !== 'zero-based' && recommendedPercentages.savingsPercent > 0 && Math.abs(savingsPercent - recommendedPercentages.savingsPercent) > 5 && (
                  <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 text-yellow-800 dark:text-yellow-200">
                    <AlertTitle>Savings Allocation Alert</AlertTitle>
                    <AlertDescription>
                      {savingsPercent < recommendedPercentages.savingsPercent
                        ? `Try to save ${(recommendedPercentages.savingsPercent - savingsPercent).toFixed(0)}% more. Start with an emergency fund of 3-6 months expenses.`
                        : `Great job! You're saving ${(savingsPercent - recommendedPercentages.savingsPercent).toFixed(0)}% more than recommended.`
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Overall Health */}
              <Card className="border-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className={`h-5 w-5 ${remaining >= 0 ? "text-green-600" : "text-red-600"} mt-0.5`} />
                    <div>
                      <p className="font-semibold">Budget Health</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {remaining >= 0
                          ? `You have $${remaining.toFixed(2)} unallocated. Consider adding to savings or adjusting categories.`
                          : `You're over budget by $${Math.abs(remaining).toFixed(2)}. Review your wants and needs to balance your budget.`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {selectedRule !== 'zero-based' && (
            <Card className="border-primary">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Your selected budget rule is a guideline, not a rigid requirement.
                  Adjust based on your situation, but try to stay close to these percentages for long-term financial health.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 7: Review & Finalize */}
      {step === 6 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Your Budget</CardTitle>
              <CardDescription>
                Confirm all details before creating your budget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Income Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget Amount
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Budget Amount</span>
                    <span>${parseFloat(budgetAmount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total Budget</span>
                    <span data-testid="text-review-budget">${totalIncome.toFixed(2)} ({budgetPeriod})</span>
                  </div>
                </div>
              </div>

              {/* Needs Summary */}
              {totalNeeds > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    Needs ({needsPercent.toFixed(0)}%)
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(needsAmounts).map(([category, amount]) => {
                      if (parseFloat(amount || "0") > 0) {
                        const cat = customNeedsCategories.find(c => c.id === category);
                        return (
                          <div key={category} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cat?.name}</span>
                            <span>${parseFloat(amount).toFixed(2)}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    <div className="flex justify-between font-semibold pt-2 border-t text-blue-600">
                      <span>Total Needs</span>
                      <span data-testid="text-review-needs">${totalNeeds.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wants Summary */}
              {totalWants > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Film className="h-4 w-4 text-purple-600" />
                    Wants ({wantsPercent.toFixed(0)}%)
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(wantsAmounts).map(([category, amount]) => {
                      if (parseFloat(amount || "0") > 0) {
                        const cat = customWantsCategories.find(c => c.id === category);
                        return (
                          <div key={category} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cat?.name}</span>
                            <span>${parseFloat(amount).toFixed(2)}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    <div className="flex justify-between font-semibold pt-2 border-t text-purple-600">
                      <span>Total Wants</span>
                      <span data-testid="text-review-wants">${totalWants.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Savings Summary */}
              {totalSavings > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-green-600" />
                    Savings & Debt ({savingsPercent.toFixed(0)}%)
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Savings</span>
                      <span>${totalSavings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Budget Amount:</span>
                  <span className="font-semibold">${totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Allocated:</span>
                  <span className="font-semibold">${totalAllocated.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Remaining:</span>
                  <span className={remaining >= 0 ? "text-green-600" : "text-red-600"} data-testid="text-final-remaining">
                    ${remaining.toFixed(2)}
                  </span>
                </div>
              </div>

              {remaining < 0 && (
                <Alert className="bg-red-50 dark:bg-red-950 border-red-200 text-red-800 dark:text-red-200">
                  <AlertTitle>Budget Deficit Warning</AlertTitle>
                  <AlertDescription>
                    Your expenses exceed your income. Go back and reduce your allocations to balance your budget.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-3">
        {step !== 'title' && (
          <Button
            variant="outline"
            onClick={prevStep}
            data-testid="button-previous"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
        )}

        {step !== 6 ? (
          <Button
            onClick={nextStep}
            data-testid="button-next"
            className="ml-auto"
            disabled={
              (step === 'title' && !budgetData.title.trim()) ||
              (step === 'details' && (totalIncome <= 0 || selectedAccountIds.length === 0)) ||
              (step === 'rule' && selectedRule === 'custom' && (parseFloat(customNeedsPercent) + parseFloat(customWantsPercent) + parseFloat(customSavingsPercent) !== 100))
            }
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleCreateBudget}
            data-testid="button-create-budget"
            disabled={createBudget.isPending || totalAllocated === 0 || remaining < 0}
            className="ml-auto"
          >
            {createBudget.isPending ? "Creating..." : "Create Budget"}
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}