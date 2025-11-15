import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient, fetchApi } from "@/lib/queryClient";
import { MapPin, Loader2, Navigation, Mic, Square, Play, Pause, TrendingDown, TrendingUp, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BudgetLinkDialog } from "@/components/budget-link-dialog";
import { InsufficientFundsDialog } from "@/components/insufficient-funds-dialog";
import { BudgetOverspendDialog } from "@/components/budget-overspend-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";

type CategorySuggestion = {
  category: string;
  confidence: number;
};

type WarningResponse = {
  showInsufficientFundsWarning: boolean;
  showBudgetOverspendWarning: boolean;
};

type TransactionResponse = {
  id: string;
  [key: string]: any;
};

interface QuickDealFormProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EXPENSE_CATEGORIES = [
  { id: "food", name: "🍕 Food", keywords: ["food", "restaurant", "grocery", "coffee", "lunch", "dinner", "breakfast"] },
  { id: "transport", name: "🚗 Transport", keywords: ["gas", "uber", "taxi", "parking", "toll", "bus", "train", "transport"] },
  { id: "shopping", name: "🛍️ Shopping", keywords: ["amazon", "store", "clothing", "shop", "mall", "online"] },
  { id: "entertainment", name: "🎮 Fun", keywords: ["movie", "game", "concert", "netflix", "spotify", "entertainment"] },
  { id: "housing", name: "🏠 Housing", keywords: ["rent", "mortgage", "property", "housing"] },
  { id: "healthcare", name: "💊 Health", keywords: ["doctor", "pharmacy", "medical", "hospital", "health"] },
  { id: "utilities", name: "💡 Bills", keywords: ["electric", "water", "internet", "phone", "utility", "bill"] },
  { id: "other_expense", name: "📦 Other", keywords: [] },
];

const INCOME_CATEGORIES = [
  { id: "salary", name: "💼 Salary", keywords: ["salary", "paycheck", "wage", "employer", "job", "work"] },
  { id: "business", name: "🏢 Business", keywords: ["business", "revenue", "sales"] },
  { id: "freelance", name: "💻 Freelance", keywords: ["freelance", "gig", "contract", "consulting"] },
  { id: "bonus", name: "🎁 Bonus", keywords: ["bonus", "award", "prize", "commission"] },
  { id: "gift", name: "🎀 Gift", keywords: ["gift", "present"] },
  { id: "refund", name: "↩️ Refund", keywords: ["refund", "return", "reimbursement"] },
  { id: "investment_income", name: "📈 Investment", keywords: ["investment", "dividend", "interest", "stock", "crypto"] },
  { id: "other_income", name: "💰 Other", keywords: [] },
];

function autoDetectCategory(description: string, type: 'income' | 'expense'): string {
  const lowerDesc = description.toLowerCase();
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  for (const category of categories) {
    for (const keyword of category.keywords) {
      if (lowerDesc.includes(keyword)) {
        return category.id;
      }
    }
  }

  return type === 'expense' ? "other_expense" : "other_income";
}

export function QuickDealForm({ onSuccess, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: QuickDealFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [step, setStep] = useState<'type' | 'details'>('type');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [contentmentLevel, setContentmentLevel] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string>("");
  const [categoryConfidence, setCategoryConfidence] = useState<number>(0);
  const [depositAccountId, setDepositAccountId] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [monthlyAccount, setMonthlyAccount] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(""); // For temporary override

  // Budget linking state
  const [budgetLinkOpen, setBudgetLinkOpen] = useState(false);
  const [matchingBudgetItems, setMatchingBudgetItems] = useState<any[]>([]);
  const [pendingTransactionId, setPendingTransactionId] = useState<string>("");

  // Alert dialogs state
  const [showInsufficientFundsDialog, setShowInsufficientFundsDialog] = useState(false);
  const [showBudgetOverspendDialog, setShowBudgetOverspendDialog] = useState(false);
  const [alertData, setAlertData] = useState<any>(null);

  // Fetch user preferences to check alert settings
  const { data: preferences } = useQuery({
    queryKey: ["/api/users/preferences"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch category suggestion from AI
  const { data: categorySuggestion } = useQuery<CategorySuggestion | null>({
    queryKey: ['/api/ai/categorize', description],
    queryFn: async () => {
      if (!description || description.length < 3) return null;
      return await apiRequest<CategorySuggestion>('/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ description, transactionType: transactionType }),
      });
    },
    enabled: description.length >= 3,
  });

  // Fetch warnings based on amount, category, and type
  const { data: warnings } = useQuery<WarningResponse | null>({
    queryKey: ['/api/quick-deals/check-warnings', amount, category, transactionType],
    queryFn: async () => {
      if (!amount || parseFloat(amount) <= 0) return null;
      return await apiRequest<WarningResponse>('/api/quick-deals/check-warnings', {
        method: 'POST',
        body: JSON.stringify({ amount, category, type: transactionType }),
      });
    },
    enabled: !!amount && parseFloat(amount) > 0 && !!category,
  });

  // Mutation for creating a quick deal
  const createQuickDeal = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest<TransactionResponse>('/api/quick-deals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (categorySuggestion) {
      setSuggestedCategory(categorySuggestion.category);
      setCategoryConfidence(categorySuggestion.confidence);
      if (!category) { // Only auto-set if category is not manually selected
        setCategory(categorySuggestion.category);
      }
    }
  }, [categorySuggestion, category]);

  // Fetch accounts and monthly account when dialog opens
  useEffect(() => {
    if (open) {
      // Fetch all accounts
      fetchApi('/api/accounts')
        .then(res => res.json())
        .then(data => {
          const assetAccounts = data.filter((a: any) => 
            a.accountType === 'asset' && a.isActive === 1
          );
          setAccounts(assetAccounts);

          if (transactionType === 'income') {
            // Auto-select checking account if available for income
            const checking = assetAccounts.find((a: any) => 
              a.accountCategory === 'checking'
            );
            if (checking) {
              setDepositAccountId(checking.id);
            } else if (assetAccounts.length > 0) {
              setDepositAccountId(assetAccounts[0].id);
            }
          }
        })
        .catch(err => console.error('Failed to load accounts:', err));

      // Fetch monthly account for expenses
      if (transactionType === 'expense') {
        fetchApi('/api/quick-deals/monthly-account')
          .then(res => res.json())
          .then(data => {
            if (data && data.accountId) {
              setMonthlyAccount(data);
              setSelectedAccountId(data.accountId); // Set as default
            }
          })
          .catch(err => console.error('Failed to load monthly account:', err));
      }
    }
  }, [open, transactionType]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join(' ');
          setReason(transcript);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Mic access denied",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const playAudio = () => {
    if (audioUrl && !isPlaying) {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.onended = () => setIsPlaying(false);
      }
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        variant: "destructive"
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setLocationName("Current Location");

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) {
              const parts = data.display_name.split(',');
              const shortName = parts.slice(0, 3).join(',');
              setLocationName(shortName);
            }
          })
          .catch(() => {})
          .finally(() => {
            setIsGettingLocation(false);
          });
      },
      () => {
        toast({
          title: "Location error",
          variant: "destructive"
        });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Check for insufficient funds and budget overspending before submitting
  const checkBeforeSubmit = async () => {
    if (transactionType === 'income') {
      return true; // No checks needed for income
    }

    const amountNum = parseFloat(amount);

    // Validate amount is a valid number
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid transaction amount",
        variant: "destructive"
      });
      return false;
    }

    const finalCategory = category || autoDetectCategory(description, transactionType);

    // Check insufficient funds if enabled in preferences
    if (preferences?.showInsufficientFundsWarning && selectedAccountId) {
      const sourceAccount = accounts.find(a => a.id === selectedAccountId);
      if (sourceAccount) {
        const availableBalance = parseFloat(sourceAccount.balance);

        // Validate balance is a valid number
        if (isNaN(availableBalance)) {
          console.warn('Invalid account balance, skipping insufficient funds check');
        } else if (availableBalance < amountNum) {
          setAlertData({
            type: 'insufficientFunds',
            accountName: sourceAccount.name,
            availableBalance,
            requiredAmount: amountNum,
          });
          setShowInsufficientFundsDialog(true);
          return false;
        }
      }
    }

    // Check budget overspending if enabled in preferences
    if (preferences?.showBudgetOverspendWarning) {
      try {
        const budgetsRes = await apiRequest('GET', '/api/budgets/active');
        if (budgetsRes && Array.isArray(budgetsRes)) {
          for (const budget of budgetsRes) {
            const categoryItem = budget.categoryItems?.find((item: any) => 
              item.category === finalCategory
            );

            if (categoryItem) {
              const budgetLimit = parseFloat(categoryItem.allocated);
              const currentSpent = parseFloat(categoryItem.spent || '0');

              // Validate budget numbers are valid
              if (isNaN(budgetLimit) || isNaN(currentSpent)) {
                console.warn('Invalid budget data, skipping overspend check for this category');
                continue;
              }

              const newTotal = currentSpent + amountNum;

              if (newTotal > budgetLimit) {
                setAlertData({
                  type: 'budgetOverspend',
                  categoryName: finalCategory,
                  budgetLimit,
                  currentSpent,
                  transactionAmount: amountNum,
                });
                setShowBudgetOverspendDialog(true);
                return false;
              }
            }
          }
        }
      } catch (e) {
        // Silent fail - budget check is optional
        console.warn('Budget overspend check failed:', e);
      }
    }

    return true; // All checks passed
  };

  const handleSubmit = async (e: React.FormEvent, skipChecks = false) => {
    e.preventDefault();

    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Missing info",
        description: "Enter description and amount",
        variant: "destructive"
      });
      return;
    }

    // Validate account selection
    if (transactionType === 'expense' && !selectedAccountId) {
      toast({
        title: "No account selected",
        description: "Please select an account to deduct from",
        variant: "destructive"
      });
      return;
    }

    if (transactionType === 'income' && !depositAccountId) {
      toast({
        title: "No account selected",
        description: "Please select an account to deposit to",
        variant: "destructive"
      });
      return;
    }

    // Run pre-submission checks unless skipping
    if (!skipChecks) {
      const canProceed = await checkBeforeSubmit();
      if (!canProceed) {
        return; // Dialog will be shown, user can proceed from there
      }
    }

    setIsSubmitting(true);

    try {
      let reasonAudioUrl = null;

      if (audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'reason.webm');

        const uploadResponse = await fetchApi('/api/upload/audio', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          reasonAudioUrl = url;
        }
      }

      const finalCategory = category || autoDetectCategory(description, transactionType);

      // Record category choice for learning
      if (suggestedCategory && finalCategory !== suggestedCategory) {
        try {
          await apiRequest('POST', '/api/ai/record-category-choice', {
            description,
            transactionType,
            suggestedCategory,
            userSelectedCategory: finalCategory
          });
        } catch (e) {
          // Silent fail - learning is optional
        }
      }

      const quickDealData = {
        type: transactionType,
        description: description.trim(),
        amount,
        category: finalCategory,
        locationName: locationName || null,
        latitude,
        longitude,
        reason: reason.trim() || null,
        reasonAudioUrl,
        contentmentLevel,
        depositAccountId: transactionType === 'income' ? depositAccountId : null,
        sourceAccountId: transactionType === 'expense' ? selectedAccountId : null,
      };

      // Create Quick Deal transaction
      const transaction = await createQuickDeal.mutateAsync(quickDealData);

      // For expenses, check if this matches any budget items
      if (transactionType === 'expense') {
        try {
          const matchingItems = await apiRequest('POST', '/api/quick-deals/detect-budget-items', {
            description: description.trim(),
            category: finalCategory,
            amount
          });

          if (matchingItems && Array.isArray(matchingItems) && matchingItems.length > 0) {
            // Show dialog to let user link to budget item
            showBudgetLinkDialog(matchingItems, transaction.id);
          }
        } catch (e) {
          // Silent fail - budget linking is optional
          console.log('Budget item detection skipped:', e);
        }
      }

      toast({
        title: transactionType === 'income' ? "✅ Income logged" : "✅ Expense logged",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/cash-flow'] });

      setDescription("");
      setAmount("");
      setCategory("");
      setLocationName("");
      setLatitude(null);
      setLongitude(null);
      setReason("");
      setContentmentLevel(3);
      deleteRecording();

      // Reset selected account to monthly default
      if (monthlyAccount && monthlyAccount.accountId) {
        setSelectedAccountId(monthlyAccount.accountId);
      }

      setOpen(false);
      setStep('type');
      setTransactionType('expense');

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Quick Deal error:", error);
      toast({
        title: "Failed to save",
        description: error.message || "Please check that you have an account selected and try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showBudgetLinkDialog = (matchingItems: any[], transactionId: string) => {
    setMatchingBudgetItems(matchingItems);
    setPendingTransactionId(transactionId);
    setBudgetLinkOpen(true);
  };

  const handleTypeSelect = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setCategory("");
    setStep('details');
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setStep('type');
          setTransactionType('expense');
        }
      }}>
        {trigger && <div onClick={() => setOpen(true)}>{trigger}</div>}

        <DialogContent className="sm:max-w-[320px] p-0 gap-0 max-h-[65vh] overflow-hidden flex flex-col">
        {step === 'type' ? (
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center text-xl font-semibold">Record Transaction</DialogTitle>
              <DialogDescription className="text-center text-sm">Choose transaction type</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTypeSelect('expense')}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border/50 bg-gradient-to-br from-background to-muted/20 hover:border-destructive hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-250"
                data-testid="button-transaction-type-expense"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
                <span className="font-semibold text-sm">I Spent</span>
              </button>

              <button
                onClick={() => handleTypeSelect('income')}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border/50 bg-gradient-to-br from-background to-muted/20 hover:border-success hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-250"
                data-testid="button-transaction-type-income"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
                <span className="font-semibold text-sm">I Earned</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <DialogHeader>
                <div className="flex items-center justify-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    transactionType === 'expense' ? "bg-destructive/10" : "bg-success/10"
                  )}>
                    {transactionType === 'expense' ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <DialogTitle className="text-base font-semibold">
                    {transactionType === 'income' ? 'Record Income' : 'Record Expense'}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-center text-xs mt-1">
                  Fill in the details below
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium">What?</Label>
                <Input
                  id="description"
                  data-testid="input-transaction-description"
                  placeholder={transactionType === 'income' ? 'e.g., Freelance' : 'e.g., Coffee'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  autoFocus
                  className="h-10 text-sm rounded-xl border-border/50 focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-medium">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">K</span>
                  <Input
                    id="amount"
                    data-testid="input-transaction-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 text-sm pl-8 rounded-xl border-border/50 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category" className="text-xs font-medium">Category</Label>
                  {categoryConfidence > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {categoryConfidence >= 80 ? '🎯' : categoryConfidence >= 60 ? '✨' : '💡'} {categoryConfidence}% confident
                    </span>
                  )}
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="h-10 text-sm rounded-xl border-border/50" data-testid="select-transaction-category">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-sm">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {transactionType === 'income' && (
                <div className="space-y-1.5">
                  <Label htmlFor="deposit-account" className="text-xs font-medium">Deposit To</Label>
                  <Select value={depositAccountId} onValueChange={setDepositAccountId}>
                    <SelectTrigger id="deposit-account" className="h-10 text-sm rounded-xl border-border/50">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-sm">
                          {acc.name} (${parseFloat(acc.balance).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {transactionType === 'expense' && (
                <div className="space-y-1.5">
                  <Label htmlFor="expense-account" className="text-xs font-medium">
                    Deduct From {monthlyAccount && <span className="text-muted-foreground">(Monthly Default)</span>}
                  </Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger id="expense-account" className="h-10 text-sm rounded-xl border-border/50">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-sm">
                          {acc.name} (${parseFloat(acc.balance).toFixed(2)})
                          {monthlyAccount && acc.id === monthlyAccount.accountId && (
                            <span className="ml-2 text-xs text-primary">• Default</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Change applies to this transaction only. Next transaction will use the monthly default.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="location" className="text-xs font-medium">Location</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="h-6 text-xs px-2 rounded-lg hover:bg-accent/50"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Navigation className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="Enter or detect..."
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="h-9 text-xs pl-9 rounded-xl border-border/50"
                  />
                  {locationName && (
                    <button
                      type="button"
                      onClick={() => { setLocationName(""); setLatitude(null); setLongitude(null); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-xs font-medium">Note</Label>
                <Textarea
                  id="reason"
                  data-testid="input-transaction-reason"
                  placeholder="Optional..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[60px] resize-none text-xs rounded-xl border-border/50 focus:border-primary/50 transition-colors"
                />

                <div className="flex gap-2">
                  {!isRecording && !audioBlob && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startRecording}
                      className="flex-1 h-8 text-xs px-3 rounded-lg"
                      data-testid="button-start-recording"
                    >
                      <Mic className="h-3.5 w-3.5 mr-1.5" />
                      Voice
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={stopRecording}
                      className="flex-1 h-8 text-xs px-3 rounded-lg"
                      data-testid="button-stop-recording"
                    >
                      <Square className="h-3.5 w-3.5 mr-1.5" />
                      Stop
                    </Button>
                  )}

                  {audioBlob && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={togglePlayback}
                        className="flex-1 h-8 text-xs px-3 rounded-lg"
                        data-testid="button-toggle-playback"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-3.5 w-3.5 mr-1.5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={deleteRecording}
                        className="h-8 px-3 rounded-lg"
                        data-testid="button-delete-recording"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Feeling?</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setContentmentLevel(level)}
                      className={cn(
                        "flex-1 py-2 rounded-xl border-2 transition-all duration-200 text-lg active:scale-95",
                        contentmentLevel === level
                          ? "border-primary bg-primary/10 shadow-sm scale-105"
                          : "border-border/50 hover:border-border hover:bg-muted/30"
                      )}
                    >
                      {level === 1 ? "😞" : level === 2 ? "😕" : level === 3 ? "😐" : level === 4 ? "😊" : "😄"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20 backdrop-blur-sm flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('type')}
                className="flex-1 h-10 text-sm rounded-xl border-border/50 hover:bg-muted/50"
                data-testid="button-back-to-type"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 text-sm font-semibold rounded-xl shadow-sm"
                data-testid="button-save-transaction"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        )}
        </DialogContent>
      </Dialog>

      <BudgetLinkDialog
        open={budgetLinkOpen}
        onOpenChange={setBudgetLinkOpen}
        matchingItems={matchingBudgetItems}
        transactionId={pendingTransactionId}
        amount={amount}
      />

      {alertData?.type === 'insufficientFunds' && (
        <InsufficientFundsDialog
          open={showInsufficientFundsDialog}
          onOpenChange={setShowInsufficientFundsDialog}
          accountName={alertData.accountName}
          availableBalance={alertData.availableBalance}
          requiredAmount={alertData.requiredAmount}
          onProceed={() => {
            setShowInsufficientFundsDialog(false);
            // Submit with checks skipped
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSubmit(fakeEvent, true);
          }}
          onCancel={() => {
            setShowInsufficientFundsDialog(false);
            setAlertData(null);
          }}
        />
      )}

      {alertData?.type === 'budgetOverspend' && (
        <BudgetOverspendDialog
          open={showBudgetOverspendDialog}
          onOpenChange={setShowBudgetOverspendDialog}
          categoryName={alertData.categoryName}
          budgetLimit={alertData.budgetLimit}
          currentSpent={alertData.currentSpent}
          transactionAmount={alertData.transactionAmount}
          onProceed={() => {
            setShowBudgetOverspendDialog(false);
            // Submit with checks skipped
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSubmit(fakeEvent, true);
          }}
          onCancel={() => {
            setShowBudgetOverspendDialog(false);
            setAlertData(null);
          }}
        />
      )}
    </>
  );
}