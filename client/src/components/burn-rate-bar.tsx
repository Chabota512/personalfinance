import { Progress } from "@/components/ui/progress";
import { formatCurrency, getDaysUntil } from "@/lib/financial-utils";
import { cn } from "@/lib/utils";

interface BurnRateBarProps {
  category: string;
  spent: number;
  allocated: number;
  startDate: string;
  endDate: string;
  className?: string;
}

export function BurnRateBar({
  category,
  spent,
  allocated,
  startDate,
  endDate,
  className,
}: BurnRateBarProps) {
  const amountLeft = allocated - spent;
  const daysLeft = getDaysUntil(endDate);
  const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;

  const getColorClass = (percent: number) => {
    if (percent >= 90) return "text-destructive";
    if (percent >= 75) return "text-warning";
    if (percent >= 50) return "text-yellow-600 dark:text-yellow-500";
    return "text-success";
  };

  const getProgressColorClass = (percent: number) => {
    if (percent >= 90) return "bg-destructive";
    if (percent >= 75) return "bg-warning";
    if (percent >= 50) return "bg-yellow-600 dark:bg-yellow-500";
    return "bg-success";
  };

  const colorClass = getColorClass(percentUsed);
  const progressColorClass = getProgressColorClass(percentUsed);

  const formattedCategory = category.replace(/_/g, ' ');
  const daysText = daysLeft === 1 ? "day" : "days";
  const leftText = amountLeft >= 0 ? "left" : "over";
  const displayAmount = Math.abs(amountLeft);

  return (
    <div className={cn("space-y-2", className)} data-testid={`burn-rate-bar-${category}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium text-foreground" data-testid={`burn-rate-text-${category}`}>
          <span className={cn("font-semibold", colorClass)}>
            {formatCurrency(displayAmount)} {leftText}
          </span>
          {" of "}
          {formatCurrency(allocated)} {formattedCategory}
          {daysLeft >= 0 && (
            <>
              {" – "}
              <span className="text-muted-foreground" data-testid={`burn-rate-days-${category}`}>
                {daysLeft} {daysText} to go
              </span>
            </>
          )}
        </p>
        <span className={cn("text-xs font-medium tabular-nums", colorClass)} data-testid={`burn-rate-percent-${category}`}>
          {percentUsed.toFixed(0)}%
        </span>
      </div>
      <Progress
        value={Math.min(percentUsed, 100)}
        className="h-2"
        indicatorClassName={progressColorClass}
        data-testid={`burn-rate-progress-${category}`}
      />
    </div>
  );
}
