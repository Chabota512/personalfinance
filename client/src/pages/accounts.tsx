import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AccountCard } from "@/components/account-card";
import { EmptyState } from "@/components/empty-state";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Zap,
  ChevronDown,
  Plus
} from "lucide-react";
import { useAccounts, useCreateAccount, useUpdateAccount } from "@/lib/api";
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
import { useQueryClient } from "@tanstack/react-query";

export default function AccountsPage() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const queryClient = useQueryClient();
  const { data: accounts, isLoading, error } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    accountType: "",
    accountCategory: "",
    balance: "0",
    description: "",
  });

  const [quickDealFormData, setQuickDealFormData] = useState({
    sourceAccountId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({ id: editingAccount.id, ...formData });
        toast({ title: "Account updated successfully" });
      } else {
        await createAccount.mutateAsync(formData);
        toast({ title: "Account created successfully" });
      }
      setOpen(false);
      setEditingAccount(null);
      setFormData({ name: "", accountType: "", accountCategory: "", balance: "0", description: "" });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleQuickDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // This is a placeholder for the actual quick deal creation logic
      // The key here is to ensure `sourceAccountId` is correctly passed
      console.log("Submitting quick deal with account:", quickDealFormData.sourceAccountId);
      toast({ title: "Quick Deal Submitted", description: `Account ID: ${quickDealFormData.sourceAccountId}` });
      // Replace with actual API call to create quick deal
      // await createQuickDeal(quickDealFormData);
      setQuickDealFormData({ sourceAccountId: "" }); // Reset form
      // close dialog if it was a dialog
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to create quick deal: ${error.message}`, variant: "destructive" });
    }
  };

  const handleEditAccount = (account: Account) => {
    setFormData({
      name: account.name,
      accountType: account.accountType,
      accountCategory: account.accountCategory,
      balance: account.balance,
      description: account.description || "",
    });
    setEditingAccount(account);
    setOpen(true);
  };

  const handleAccountSelectForQuickDeal = (accountId: string) => {
    setQuickDealFormData({ sourceAccountId: accountId });
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

  const quickDealAccount = accounts?.find((a: Account) => a.accountCategory === 'quick_deal_monthly');

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
            <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setEditingAccount(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setFormData({ name: "", accountType: "", accountCategory: "", balance: "0", description: "" })}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingAccount ? "Edit Account" : "Create New Account"}</DialogTitle>
                  <DialogDescription>
                    {editingAccount ? "Edit your account details" : "Add a new account to your chart of accounts"}
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
                        <SelectItem value="quick_deal_monthly">Monthly Quick Deal Account</SelectItem>
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
                    disabled={createAccount.isPending || updateAccount.isPending}
                  >
                    {createAccount.isPending || updateAccount.isPending ? "Saving..." : (editingAccount ? "Update Account" : "Create Account")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Quick Deal Configuration Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Zap className="h-4 w-4 mr-1" />
                  Quick Deal Config
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configure Quick Deal</DialogTitle>
                  <DialogDescription>
                    Select the default monthly account for quick deals.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleQuickDealSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="quick-deal-account">Monthly Account</Label>
                    <Select value={quickDealFormData.sourceAccountId} onValueChange={handleAccountSelectForQuickDeal}>
                      <SelectTrigger id="quick-deal-account">
                        <SelectValue placeholder="Select monthly account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.filter((a: Account) => a.accountCategory === 'quick_deal_monthly').map((account: Account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {quickDealFormData.sourceAccountId === "" && (
                      <p className="text-xs text-muted-foreground">
                        No monthly account selected. Please create one under "Expenses" category with "Monthly Quick Deal Account" type.
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={quickDealFormData.sourceAccountId === ""}>
                    Save Quick Deal Configuration
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
                    <AccountCard key={account.id} account={account} compact onClick={() => handleEditAccount(account)} />
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
                    <AccountCard key={account.id} account={account} compact onClick={() => handleEditAccount(account)} />
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
                    <AccountCard key={account.id} account={account} compact onClick={() => handleEditAccount(account)} />
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
                    <AccountCard key={account.id} account={account} compact onClick={() => handleEditAccount(account)} />
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

          <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setEditingAccount(null); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-account" onClick={() => setFormData({ name: "", accountType: "", accountCategory: "", balance: "0", description: "" })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingAccount ? "Edit Account" : "Create New Account"}</DialogTitle>
                  <DialogDescription>
                    {editingAccount ? "Edit your account details" : "Add a new account to your chart of accounts"}
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
                        <SelectItem value="quick_deal_monthly">Monthly Quick Deal Account</SelectItem>
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
                    disabled={createAccount.isPending || updateAccount.isPending}
                  >
                    {createAccount.isPending || updateAccount.isPending ? "Saving..." : (editingAccount ? "Update Account" : "Create Account")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Quick Deal Configuration Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Deal Config
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configure Quick Deal</DialogTitle>
                  <DialogDescription>
                    Select the default monthly account for quick deals.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleQuickDealSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="quick-deal-account">Monthly Account</Label>
                    <Select value={quickDealFormData.sourceAccountId} onValueChange={handleAccountSelectForQuickDeal}>
                      <SelectTrigger id="quick-deal-account">
                        <SelectValue placeholder="Select monthly account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.filter((a: Account) => a.accountCategory === 'quick_deal_monthly').map((account: Account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {quickDealFormData.sourceAccountId === "" && (
                      <p className="text-xs text-muted-foreground">
                        No monthly account selected. Please create one under "Expenses" category with "Monthly Quick Deal Account" type.
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={quickDealFormData.sourceAccountId === ""}>
                    Save Quick Deal Configuration
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Assets */}
        <div className="space-y-4">
          <h2 className="text-display-md md:text-display-lg font-semibold text-success">Assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsByType.asset.map((account: Account) => (
              <AccountCard key={account.id} account={account} onClick={() => handleEditAccount(account)} />
            ))}
          </div>
        </div>

        {/* Liabilities */}
        <div className="space-y-4">
          <h2 className="text-display-md md:text-display-lg font-semibold text-destructive">Liabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsByType.liability.map((account: Account) => (
              <AccountCard key={account.id} account={account} onClick={() => handleEditAccount(account)} />
            ))}
          </div>
        </div>

        {/* Income */}
        <div className="space-y-4">
          <h2 className="text-display-md md:text-display-lg font-semibold text-primary">Income</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsByType.income.map((account: Account) => (
              <AccountCard key={account.id} account={account} onClick={() => handleEditAccount(account)} />
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="space-y-4">
          <h2 className="text-display-md md:text-display-lg font-semibold text-warning">Expenses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsByType.expense.map((account: Account) => (
              <AccountCard key={account.id} account={account} onClick={() => handleEditAccount(account)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}