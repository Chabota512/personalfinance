import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getBalanceSheet, useAccounts } from "@/lib/api";
import type { Account } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

export default function BalanceSheetPage() {
  const isMobile = useIsMobile();
  const { data: balanceSheetData, isLoading: balanceSheetLoading } = useQuery({
    queryKey: ["/api/analytics/balance-sheet"],
    queryFn: getBalanceSheet,
  });

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();

  if (balanceSheetLoading || accountsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading balance sheet...</p>
        </div>
      </div>
    );
  }

  const totalAssets = balanceSheetData?.assets || 0;
  const totalLiabilities = balanceSheetData?.liabilities || 0;
  const netWorth = balanceSheetData?.netWorth || 0;

  // Filter and categorize accounts
  const accounts = (accountsData as Account[]) || [];
  const assetAccounts = accounts.filter(acc => acc.accountType === 'asset' && acc.isActive === 1);
  const liabilityAccounts = accounts.filter(acc => acc.accountType === 'liability' && acc.isActive === 1);

  // Categorize assets as current or long-term
  const currentAssetCategories = ['cash', 'checking', 'savings'];
  const currentAssets = assetAccounts.filter(acc => currentAssetCategories.includes(acc.accountCategory));
  const longTermAssets = assetAccounts.filter(acc => !currentAssetCategories.includes(acc.accountCategory));

  // Categorize liabilities as current or long-term
  const currentLiabilityCategories = ['credit_card'];
  const currentLiabilities = liabilityAccounts.filter(acc => currentLiabilityCategories.includes(acc.accountCategory));
  const longTermLiabilities = liabilityAccounts.filter(acc => !currentLiabilityCategories.includes(acc.accountCategory));

  // Calculate totals
  const totalCurrentAssets = currentAssets.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  const totalLongTermAssets = longTermAssets.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  const totalCurrentLiabilities = currentLiabilities.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div>
          <h1 className="text-display-xl md:text-display-2xl font-bold text-foreground">Balance Sheet</h1>
          <p className="text-body-md text-muted-foreground">
            Complete snapshot of your financial position
          </p>
        </div>

      {/* Net Worth Summary */}
      <Card className="border-2 bg-gradient-to-br from-primary/5 to-accent/5" data-testid="net-worth-summary">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl md:text-display-md">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 sm:pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-2">Total Assets</p>
              <p className="text-3xl font-bold font-mono text-success" data-testid="value-total-assets">
                {formatCurrency(totalAssets)}
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-2">Total Liabilities</p>
              <p className="text-3xl font-bold font-mono text-destructive" data-testid="value-total-liabilities">
                {formatCurrency(totalLiabilities)}
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-2">Net Worth</p>
              <p className={`text-4xl font-bold font-mono ${netWorth >= 0 ? 'text-primary' : 'text-destructive'}`} data-testid="value-net-worth">
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets */}
      <div className="space-y-4" data-testid="section-assets">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" />
          <h2 className="text-display-md md:text-display-lg font-semibold text-success">Assets</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Assets</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {formatCurrency(totalCurrentAssets)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentAssets.length > 0 ? (
                currentAssets.map((asset, index) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`row-asset-current-${index}`}>
                    <span className="font-medium text-foreground" data-testid={`text-asset-name-${index}`}>{asset.name}</span>
                    <span className="font-mono font-semibold text-success" data-testid={`value-asset-amount-${index}`}>
                      {formatCurrency(parseFloat(asset.balance))}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No current assets yet</p>
                  <p className="text-sm mt-2">Add cash, checking, or savings accounts</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Long-term Assets</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {formatCurrency(totalLongTermAssets)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {longTermAssets.length > 0 ? (
                longTermAssets.map((asset, index) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`row-asset-longterm-${index}`}>
                    <span className="font-medium text-foreground" data-testid={`text-asset-longterm-name-${index}`}>{asset.name}</span>
                    <span className="font-mono font-semibold text-success" data-testid={`value-asset-longterm-amount-${index}`}>
                      {formatCurrency(parseFloat(asset.balance))}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No long-term assets yet</p>
                  <p className="text-sm mt-2">Add investment, retirement, or property accounts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Liabilities */}
      <div className="space-y-4" data-testid="section-liabilities">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-destructive" />
          <h2 className="text-display-md md:text-display-lg font-semibold text-destructive">Liabilities</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Liabilities</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  {formatCurrency(totalCurrentLiabilities)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentLiabilities.length > 0 ? (
                currentLiabilities.map((liability, index) => (
                  <div key={liability.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`row-liability-current-${index}`}>
                    <span className="font-medium text-foreground" data-testid={`text-liability-name-${index}`}>{liability.name}</span>
                    <span className="font-mono font-semibold text-destructive" data-testid={`value-liability-amount-${index}`}>
                      {formatCurrency(parseFloat(liability.balance))}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No current liabilities</p>
                  <p className="text-sm mt-2">Add credit card accounts if applicable</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Long-term Liabilities</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  {formatCurrency(totalLongTermLiabilities)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {longTermLiabilities.length > 0 ? (
                longTermLiabilities.map((liability, index) => (
                  <div key={liability.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`row-liability-longterm-${index}`}>
                    <span className="font-medium text-foreground" data-testid={`text-liability-longterm-name-${index}`}>{liability.name}</span>
                    <span className="font-mono font-semibold text-destructive" data-testid={`value-liability-longterm-amount-${index}`}>
                      {formatCurrency(parseFloat(liability.balance))}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No long-term liabilities</p>
                  <p className="text-sm mt-2">Add loan or mortgage accounts if applicable</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accounting Equation */}
      <Card className="border-2 bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4 text-center flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Assets</p>
              <p className="text-2xl font-bold font-mono text-success">
                {formatCurrency(totalAssets)}
              </p>
            </div>

            <span className="text-2xl font-bold text-muted-foreground">=</span>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Liabilities</p>
              <p className="text-2xl font-bold font-mono text-destructive">
                {formatCurrency(totalLiabilities)}
              </p>
            </div>

            <span className="text-2xl font-bold text-muted-foreground">+</span>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Net Worth</p>
              <p className="text-2xl font-bold font-mono text-primary">
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}