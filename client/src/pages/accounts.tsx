import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AccountCard } from "@/components/account-card";
import { EmptyState } from "@/components/empty-state";
import { Plus, Wallet, ChevronDown, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useAccounts, useCreateAccount } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MobilePageShell } from "@/components/mobile-page-shell";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency, getAccountTypeColor } from "@/lib/financial-utils";
import type { Account } from '@shared/schema';

export default function AccountsPage() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { data: accounts, isLoading, error } = useAccounts();
  const createAccount = useCreateAccount();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    accountType: "",
    accountCategory: "",
    balance: "0",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount.mutateAsync(formData);
      toast({ title: "Account created successfully" });
      setOpen(false);
      setFormData({ name: "", accountType: "", accountCategory: "", balance: "0", description: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          title="Error loading accounts"
          description={error.message}
          icon={Wallet}
        />
      </div>
    );
  }

  const accountsByType = {
    asset: accounts?.filter((a: Account) => a.accountType === 'asset') || [],
    liability: accounts?.filter((a: Account) => a.accountType === 'liability') || [],
    income: accounts?.filter((a: Account) => a.accountType === 'income') || [],
    expense: accounts?.filter((a: Account) => a.accountType === 'expense') || [],
  };

  // Original mock data for reference
  const mockAccounts = [
    {
      id: "1",
      userId: "mock-user-1",
      name: "Checking Account",
      accountType: "asset",
      accountCategory: "checking",
      accountNumber: "1001",
      balance: "3450.75",
      description: "Primary checking account",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      userId: "mock-user-1",
      name: "Savings Account",
      accountType: "asset",
      accountCategory: "savings",
      accountNumber: "1002",
      balance: "15000.00",
      description: "Emergency fund",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "3",
      userId: "mock-user-1",
      name: "Investment Account",
      accountType: "asset",
      accountCategory: "investment",
      accountNumber: "1003",
      balance: "45000.00",
      description: "Stock portfolio",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "4",
      userId: "mock-user-1",
      name: "Credit Card",
      accountType: "liability",
      accountCategory: "credit_card",
      accountNumber: "2001",
      balance: "2450.00",
      description: "Main credit card",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "5",
      userId: "mock-user-1",
      name: "Car Loan",
      accountType: "liability",
      accountCategory: "loan",
      accountNumber: "2002",
      balance: "15000.00",
      description: "Auto loan",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "6",
      userId: "mock-user-1",
      name: "Salary",
      accountType: "income",
      accountCategory: "salary",
      accountNumber: "3001",
      balance: "0.00",
      description: "Monthly salary income",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "7",
      userId: "mock-user-1",
      name: "Food & Dining",
      accountType: "expense",
      accountCategory: "food",
      accountNumber: "4001",
      balance: "0.00",
      description: "Groceries and restaurants",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "8",
      userId: "mock-user-1",
      name: "Transportation",
      accountType: "expense",
      accountCategory: "transportation",
      accountNumber: "4002",
      balance: "0.00",
      description: "Gas, parking, maintenance",
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const accountTypeIcons = {
    asset: TrendingUp,
    liability: TrendingDown,
    income: ArrowDownCircle,
    expense: ArrowUpCircle,
  };

  const accountTypeColors = {
    asset: 'text-success',
    liability: 'text-destructive',
    income: 'text-primary',
    expense: 'text-warning',
  };


  if (isMobile) {
    return (
      <MobilePageShell compact={true} scrollable={false} className="flex flex-col h-screen pb-20">
        {/* Ultra-Compact Header */}
        <div className="flex-shrink-0 px-3 py-1 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Accounts</h1>
              <p className="text-xs text-muted-foreground">{accounts?.length || 0} total</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Account</DialogTitle>
                  <DialogDescription>
                    Add a new account to your chart of accounts
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input 
                      id="account-name" 
                      placeholder="e.g., Checking Account" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-type">Account Type</Label>
                    <Select value={formData.accountType} onValueChange={(val) => setFormData({ ...formData, accountType: val })}>
                      <SelectTrigger id="account-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-category">Category</Label>
                    <Select value={formData.accountCategory} onValueChange={(val) => setFormData({ ...formData, accountCategory: val })}>
                      <SelectTrigger id="account-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initial-balance">Initial Balance</Label>
                    <Input 
                      id="initial-balance" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Account description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createAccount.isPending}
                  >
                    {createAccount.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Scrollable Account List */}
        <div className="px-3 py-2 space-y-2">
          {/* Assets Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-2 rounded hover-elevate" data-testid="collapsible-assets">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold text-success">Assets</span>
                <span className="text-xs text-muted-foreground">({accountsByType.asset.length})</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <div className="space-y-2">
                {accountsByType.asset.length > 0 ? (
                  accountsByType.asset.map((account: Account) => (
                    <AccountCard key={account.id} account={account} compact />
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">No assets yet</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Liabilities Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-2 rounded hover-elevate" data-testid="collapsible-liabilities">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Liabilities</span>
                <span className="text-xs text-muted-foreground">({accountsByType.liability.length})</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <div className="space-y-2">
                {accountsByType.liability.length > 0 ? (
                  accountsByType.liability.map((account: Account) => (
                    <AccountCard key={account.id} account={account} compact />
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">No liabilities</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Income Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-2 rounded hover-elevate" data-testid="collapsible-income">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Income</span>
                <span className="text-xs text-muted-foreground">({accountsByType.income.length})</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <div className="space-y-2">
                {accountsByType.income.length > 0 ? (
                  accountsByType.income.map((account: Account) => (
                    <AccountCard key={account.id} account={account} compact />
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">No income accounts</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Expenses Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-2 rounded hover-elevate" data-testid="collapsible-expenses">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-semibold text-warning">Expenses</span>
                <span className="text-xs text-muted-foreground">({accountsByType.expense.length})</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <div className="space-y-2">
                {accountsByType.expense.length > 0 ? (
                  accountsByType.expense.map((account: Account) => (
                    <AccountCard key={account.id} account={account} compact />
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">No expense accounts</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </MobilePageShell>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-display-xl md:text-display-2xl font-bold">Chart of Accounts</h1>
            <p className="text-body-md text-muted-foreground">
              Manage your financial accounts using professional accounting principles
            </p>
          </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-account">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
              <DialogDescription>
                Add a new account to your chart of accounts
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input 
                  id="account-name" 
                  placeholder="e.g., Checking Account" 
                  data-testid="input-account-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Select value={formData.accountType} onValueChange={(val) => setFormData({ ...formData, accountType: val })}>
                  <SelectTrigger id="account-type" data-testid="select-account-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-category">Category</Label>
                <Select value={formData.accountCategory} onValueChange={(val) => setFormData({ ...formData, accountCategory: val })}>
                  <SelectTrigger id="account-category" data-testid="select-account-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-balance">Initial Balance</Label>
                <Input 
                  id="initial-balance" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  data-testid="input-initial-balance"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Account description"
                  data-testid="textarea-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                data-testid="button-create-account"
                disabled={createAccount.isPending}
              >
                {createAccount.isPending ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assets */}
      <div className="space-y-4">
        <h2 className="text-display-md md:text-display-lg font-semibold text-success">Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsByType.asset.map((account: Account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* Liabilities */}
      <div className="space-y-4">
        <h2 className="text-display-md md:text-display-lg font-semibold text-destructive">Liabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsByType.liability.map((account: Account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* Income */}
      <div className="space-y-4">
        <h2 className="text-display-md md:text-display-lg font-semibold text-primary">Income</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsByType.income.map((account: Account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* Expenses */}
      <div className="space-y-4">
        <h2 className="text-display-md md:text-display-lg font-semibold text-warning">Expenses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsByType.expense.map((account: Account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}