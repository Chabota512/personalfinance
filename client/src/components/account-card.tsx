import { formatCurrency, getAccountTypeColor } from "@/lib/financial-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, MoreVertical, Settings } from "lucide-react";
import type { Account } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AdjustBalanceDialog } from "./adjust-balance-dialog";

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
  compact?: boolean;
}

const accountTypeIcons = {
  asset: TrendingUp,
  liability: TrendingDown,
  income: ArrowDownCircle,
  expense: ArrowUpCircle,
};

const accountTypeBadgeColors = {
  asset: "bg-success/10 text-success border-success/20",
  liability: "bg-destructive/10 text-destructive border-destructive/20",
  income: "bg-primary/10 text-primary border-primary/20",
  expense: "bg-warning/10 text-warning border-warning/20",
};

export function AccountCard({ account, onClick, compact = false }: AccountCardProps) {
  const Icon = accountTypeIcons[account.accountType as keyof typeof accountTypeIcons] || TrendingUp;
  const badgeColor = accountTypeBadgeColors[account.accountType as keyof typeof accountTypeBadgeColors];
  const balance = parseFloat(account.balance);
  const isNegative = balance < 0;
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  if (compact) {
    return (
      <>
        <Card
          className="hover-elevate cursor-pointer transition-all"
          onClick={onClick}
          data-testid={`account-card-${account.id}`}
        >
          <CardContent className="p-2">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`p-1 rounded ${account.accountType === 'asset' ? 'bg-success/10' : account.accountType === 'liability' ? 'bg-destructive/10' : account.accountType === 'income' ? 'bg-primary/10' : 'bg-warning/10'}`}>
                  <Icon className={`h-4 w-4 ${getAccountTypeColor(account.accountType)}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">{account.name}</h3>
                  {account.accountNumber && (
                    <p className="text-xs text-muted-foreground font-mono">#{account.accountNumber}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {account.accountType === 'asset' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdjustDialogOpen(true);
                    }}
                    data-testid={`button-adjust-balance-${account.id}`}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  data-testid={`button-account-menu-${account.id}`}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className={`text-sm font-semibold font-mono ${isNegative ? 'text-destructive' : getAccountTypeColor(account.accountType)}`}>
                  {formatCurrency(balance)}
                </p>
              </div>

              <Badge variant="outline" className={`${badgeColor} text-xs`}>
                {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
              </Badge>
            </div>

            {account.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                {account.description}
              </p>
            )}
          </CardContent>
        </Card>

        <AdjustBalanceDialog
          account={account}
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <Card
        className="hover-elevate cursor-pointer transition-all"
        onClick={onClick}
        data-testid={`account-card-${account.id}`}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-2.5 rounded-lg ${account.accountType === 'asset' ? 'bg-success/10' : account.accountType === 'liability' ? 'bg-destructive/10' : account.accountType === 'income' ? 'bg-primary/10' : 'bg-warning/10'}`}>
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${getAccountTypeColor(account.accountType)}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  {account.name}
                </h3>
                {account.accountNumber && (
                  <p className="text-xs text-muted-foreground font-mono">
                    #{account.accountNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {account.accountType === 'asset' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdjustDialogOpen(true);
                  }}
                  data-testid={`button-adjust-balance-${account.id}`}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" data-testid={`button-account-menu-${account.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className={`text-xl sm:text-2xl font-bold font-mono ${isNegative ? 'text-destructive' : getAccountTypeColor(account.accountType)}`}>
                {formatCurrency(balance)}
              </p>
            </div>

            <Badge variant="outline" className={`${badgeColor}`}>
              {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
            </Badge>
          </div>

          {account.description && (
            <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
              {account.description}
            </p>
          )}
        </CardContent>
      </Card>

      <AdjustBalanceDialog
        account={account}
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
      />
    </>
  );
}