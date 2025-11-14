import { formatCurrency, calculateBudgetProgress, getBudgetStatus } from "@/lib/financial-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BudgetProgressCardProps {
  category: string;
  allocated: number;
  spent: number;
}

export function BudgetProgressCard({ category, allocated, spent }: BudgetProgressCardProps) {
  const progress = calculateBudgetProgress(spent, allocated);
  const status = getBudgetStatus(progress);
  const remaining = allocated - spent;
  
  const statusColors = {
    healthy: 'text-success',
    warning: 'text-warning',
    over: 'text-destructive',
  };
  
  const progressColors = {
    healthy: 'bg-success',
    warning: 'bg-warning',
    over: 'bg-destructive',
  };
  
  return (
    <Card className="hover-elevate" data-testid={`budget-card-${category}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground capitalize" data-testid={`budget-category-${category}`}>
            {category.replace(/_/g, ' ')}
          </h3>
          <span className={`text-xs font-medium ${statusColors[status]}`} data-testid={`budget-progress-${category}`}>
            {progress.toFixed(0)}%
          </span>
        </div>
        
        <Progress 
          value={Math.min(progress, 100)} 
          className="h-1.5"
          indicatorClassName={progressColors[status]}
        />
        
        <div className="flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Spent</p>
            <p className="text-sm font-mono font-semibold text-foreground" data-testid={`budget-spent-${category}`}>
              {formatCurrency(spent)}
            </p>
          </div>
          
          <div className="space-y-0.5 text-right">
            <p className="text-muted-foreground">
              {remaining >= 0 ? 'Remaining' : 'Over Budget'}
            </p>
            <p className={`text-sm font-mono font-semibold ${remaining >= 0 ? 'text-foreground' : 'text-destructive'}`} data-testid={`budget-remaining-${category}`}>
              {formatCurrency(Math.abs(remaining))}
            </p>
          </div>
          
          <div className="space-y-0.5 text-right">
            <p className="text-muted-foreground">Budget</p>
            <p className="text-sm font-mono font-semibold text-foreground" data-testid={`budget-allocated-${category}`}>
              {formatCurrency(allocated)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
