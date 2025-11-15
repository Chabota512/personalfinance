import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Banknote,
  TrendingUp,
  Building2,
  Home,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient, fetchApi } from "@/lib/queryClient";

interface AccountType {
  id: string;
  name: string;
  type: 'asset' | 'liability';
  category: string;
  icon: any;
  description: string;
}

interface SelectedAccount {
  typeId: string;
  name: string;
  type: 'asset' | 'liability';
  category: string;
  balance: string;
  skip: boolean;
}

interface CustomAccount {
  id: string;
  name: string;
  type: 'asset' | 'liability';
  category: string;
}

const ACCOUNT_TYPES: AccountType[] = [
  {
    id: 'checking',
    name: 'Checking Account',
    type: 'asset',
    category: 'checking',
    icon: Wallet,
    description: 'Your primary spending account'
  },
  {
    id: 'savings',
    name: 'Savings Account',
    type: 'asset',
    category: 'savings',
    icon: PiggyBank,
    description: 'Emergency fund and savings'
  },
  {
    id: 'cash',
    name: 'Cash',
    type: 'asset',
    category: 'cash',
    icon: Banknote,
    description: 'Physical cash on hand'
  },
  {
    id: 'credit_card',
    name: 'Credit Card',
    type: 'liability',
    category: 'credit_card',
    icon: CreditCard,
    description: 'Credit card balance owed'
  },
  {
    id: 'investment',
    name: 'Investment Account',
    type: 'asset',
    category: 'investment',
    icon: TrendingUp,
    description: 'Stocks, bonds, and investments'
  },
  {
    id: 'loan',
    name: 'Loan',
    type: 'liability',
    category: 'loan',
    icon: Building2,
    description: 'Personal or student loans'
  },
  {
    id: 'mortgage',
    name: 'Mortgage',
    type: 'liability',
    category: 'mortgage',
    icon: Home,
    description: 'Home mortgage balance'
  }
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customAccounts, setCustomAccounts] = useState<CustomAccount[]>([]);
  const [accounts, setAccounts] = useState<SelectedAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const totalSteps = 3;

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const addCustomAccount = () => {
    const newId = `custom-${Date.now()}`;
    setCustomAccounts([...customAccounts, {
      id: newId,
      name: '',
      type: 'asset',
      category: 'checking'
    }]);
  };

  const updateCustomAccount = (id: string, field: keyof CustomAccount, value: any) => {
    setCustomAccounts(prev =>
      prev.map(acc => acc.id === id ? { ...acc, [field]: value } : acc)
    );
  };

  const removeCustomAccount = (id: string) => {
    setCustomAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const handleNextFromSelection = () => {
    if (selectedTypes.length === 0 && customAccounts.filter(a => a.name.trim()).length === 0) {
      toast({
        title: "Select at least one account",
        description: "Please select at least one account type to continue.",
        variant: "destructive"
      });
      return;
    }

    // Only initialize accounts if they haven't been set yet
    if (accounts.length === 0) {
      const newAccounts: SelectedAccount[] = [];

      // Add selected predefined types
      selectedTypes.forEach(typeId => {
        const accountType = ACCOUNT_TYPES.find(t => t.id === typeId);
        if (accountType) {
          newAccounts.push({
            typeId: accountType.id,
            name: accountType.name,
            type: accountType.type,
            category: accountType.category,
            balance: '',
            skip: false
          });
        }
      });

      // Add custom accounts
      customAccounts
        .filter(custom => custom.name.trim())
        .forEach(custom => {
          newAccounts.push({
            typeId: custom.id,
            name: custom.name,
            type: custom.type,
            category: custom.category,
            balance: '',
            skip: false
          });
        });

      setAccounts(newAccounts);
    }

    setStep(2);
  };

  const handleNextFromBalances = () => {
    // Check if all accounts are either skipped or have a valid balance
    const allAccountsHandled = accounts.every(acc => {
      return acc.skip || (acc.balance && acc.balance.trim() !== '');
    });

    if (!allAccountsHandled) {
      toast({
        title: "Complete all accounts",
        description: "Please enter a balance for each account or mark it to add later.",
        variant: "destructive"
      });
      return;
    }

    setStep(3);
  };

  const updateAccountBalance = (typeId: string, balance: string) => {
    setAccounts(prev =>
      prev.map(acc => acc.typeId === typeId ? { ...acc, balance } : acc)
    );
  };

  const toggleSkipAccount = (typeId: string) => {
    setAccounts(prev =>
      prev.map(acc => acc.typeId === typeId ? { ...acc, skip: !acc.skip } : acc)
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create accounts and opening balance transactions
      for (const account of accounts) {
        // Always create the account with zero balance first
        const res = await apiRequest('POST', '/api/accounts', {
          name: account.name,
          accountType: account.type,
          accountCategory: account.category,
          balance: '0',
          description: ''
        });
        const createdAccount = await res.json();

        // Only create opening balance transaction if user provided a non-zero balance and didn't skip
        if (!account.skip && account.balance) {
          const balance = parseFloat(account.balance);
          if (balance !== 0) {
            await apiRequest('POST', '/api/transactions/opening-balance', {
              accountId: createdAccount.id,
              amount: Math.abs(balance).toFixed(2),
              date: new Date().toISOString().split('T')[0]
            });
          }
        }
      }

      // Mark onboarding as complete (without seeding sample data)
      await apiRequest('PUT', '/api/users/preferences', {
        hasCompletedOnboarding: true,
        skipSampleData: true
      });

      // Force clear the cache and refetch
      queryClient.removeQueries({ queryKey: ['/api/users/preferences'] });
      
      // Fetch fresh preferences data
      const prefsResponse = await fetchApi('/api/users/preferences');
      
      if (prefsResponse.ok) {
        const freshPrefs = await prefsResponse.json();
        queryClient.setQueryData(['/api/users/preferences'], freshPrefs);
      }
      
      // Invalidate other queries
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });

      toast({
        title: "Welcome to PersonalFinance Pro!",
        description: "Your accounts have been set up successfully.",
      });

      // Redirect immediately since we've already set the fresh data
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set up accounts",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNetWorth = () => {
    return accounts.reduce((total, acc) => {
      if (acc.skip || !acc.balance) return total;
      const balance = parseFloat(acc.balance) || 0;
      return total + (acc.type === 'asset' ? balance : -balance);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">Welcome to PersonalFinance Pro</CardTitle>
              <CardDescription>Let's set up your accounts in {totalSteps} easy steps</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </div>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Your Account Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose the accounts you want to track. You can add more later.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ACCOUNT_TYPES.map((accountType) => {
                  const Icon = accountType.icon;
                  const isSelected = selectedTypes.includes(accountType.id);

                  return (
                    <Card
                      key={accountType.id}
                      className={`cursor-pointer transition-all hover-elevate ${
                        isSelected ? 'border-primary border-2 bg-primary/5' : ''
                      }`}
                      onClick={() => handleTypeToggle(accountType.id)}
                      data-testid={`account-type-${accountType.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTypeToggle(accountType.id)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`checkbox-${accountType.id}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4 text-primary" />
                              <h4 className="font-medium">{accountType.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {accountType.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Custom Accounts</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomAccount}
                    data-testid="button-add-custom-account"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom
                  </Button>
                </div>

                {customAccounts.map((custom) => (
                  <Card key={custom.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Account Name</Label>
                            <Input
                              value={custom.name}
                              onChange={(e) => updateCustomAccount(custom.id, 'name', e.target.value)}
                              placeholder="e.g., Crypto Wallet"
                              data-testid={`input-custom-name-${custom.id}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Type</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={custom.type}
                              onChange={(e) => updateCustomAccount(custom.id, 'type', e.target.value)}
                              data-testid={`select-custom-type-${custom.id}`}
                            >
                              <option value="asset">Asset</option>
                              <option value="liability">Liability</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (custom.name.trim()) {
                                toast({
                                  title: "Saved",
                                  description: `${custom.name} has been saved.`,
                                });
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Please enter an account name.",
                                  variant: "destructive"
                                });
                              }
                            }}
                            data-testid={`button-save-custom-${custom.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomAccount(custom.id)}
                            data-testid={`button-remove-custom-${custom.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Enter Your Current Balances</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tell us how much you currently have in each account. You can skip any account and add the balance later.
                </p>
              </div>

              <div className="space-y-3">
                {accounts.map((account) => (
                  <Card key={account.typeId}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label className="text-sm font-medium mb-2 block">
                            {account.name}
                          </Label>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={account.balance}
                                onChange={(e) => updateAccountBalance(account.typeId, e.target.value)}
                                disabled={account.skip}
                                data-testid={`input-balance-${account.typeId}`}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {account.type === 'liability' ? 'Amount owed' : 'Current balance'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`skip-${account.typeId}`}
                                checked={account.skip}
                                onCheckedChange={() => toggleSkipAccount(account.typeId)}
                                data-testid={`checkbox-skip-${account.typeId}`}
                              />
                              <Label
                                htmlFor={`skip-${account.typeId}`}
                                className="text-sm text-muted-foreground cursor-pointer"
                              >
                                Add later
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Review Your Setup</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Everything looks good? Click "Complete Setup" to get started!
                </p>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Your Net Worth</p>
                    <p className="text-3xl font-bold text-foreground">
                      ${getNetWorth().toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Accounts to Create</h4>
                {accounts.map((account) => (
                  <div
                    key={account.typeId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  >
                    <span className="text-sm font-medium">{account.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {account.skip || !account.balance
                        ? 'Will add balance later'
                        : `$${parseFloat(account.balance).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            <div className="ml-auto">
              {step < totalSteps ? (
                <Button
                  onClick={
                    step === 1 
                      ? handleNextFromSelection 
                      : step === 2 
                      ? handleNextFromBalances 
                      : () => setStep(step + 1)
                  }
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  data-testid="button-complete-setup"
                >
                  {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}