import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, DollarSign, Calendar, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";

export interface DebtMethodProjection {
  method: string;
  methodTitle: string;
  methodIcon: string;
  projection: {
    dates: string[];
    balances: number[];
    payments: number[];
    totalInterest: number;
    payoffDate: string | null;
    warnings: Array<{
      type: 'critical' | 'warning' | 'info';
      message: string;
    }>;
  };
  highestPayment: number;
  hidden?: boolean;
  hideReason?: string;
}

interface DebtMethodCardProps {
  method: DebtMethodProjection;
  onSelect: () => void;
  isSelected?: boolean;
}

export function DebtMethodCard({ method, onSelect, isSelected }: DebtMethodCardProps) {
  const hasCriticalWarning = method.projection.warnings.some(w => w.type === 'critical');
  const hasWarning = method.projection.warnings.some(w => w.type === 'warning');
  
  // Calculate sparkline data (simplified balance over time)
  const sparklineData = method.projection.balances.filter((_, i) => i % Math.max(1, Math.floor(method.projection.balances.length / 10)) === 0);
  const maxBalance = Math.max(...sparklineData);
  const sparklinePoints = sparklineData.map((balance, index) => {
    const x = (index / (sparklineData.length - 1)) * 100;
    const y = 100 - ((balance / maxBalance) * 100);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card 
      className={`
        ${hasCriticalWarning ? 'border-destructive' : hasWarning ? 'border-yellow-500' : 'border-border'}
        ${isSelected ? 'ring-2 ring-primary' : ''}
        hover-elevate
      `}
      data-testid={`card-method-${method.method}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {method.methodIcon === 'target' && <TrendingDown className="h-5 w-5" />}
              {method.methodIcon === 'money' && <DollarSign className="h-5 w-5" />}
              {method.methodIcon === 'calendar' && <Calendar className="h-5 w-5" />}
              {method.methodTitle}
            </CardTitle>
            {hasCriticalWarning && (
              <Badge variant="destructive" className="mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                High Risk
              </Badge>
            )}
            {hasWarning && !hasCriticalWarning && (
              <Badge variant="outline" className="mt-2 border-yellow-500 text-yellow-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Caution
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mini chart - spark line */}
        <div className="h-16 bg-muted/30 rounded-md p-2">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polyline
              points={sparklinePoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />
          </svg>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Interest</p>
            <p className="text-lg font-semibold" data-testid={`text-total-interest-${method.method}`}>
              {formatCurrency(method.projection.totalInterest)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Highest Payment</p>
            <p className="text-lg font-semibold" data-testid={`text-highest-payment-${method.method}`}>
              {formatCurrency(method.highestPayment)}
            </p>
          </div>
        </div>

        {/* Payoff date */}
        {method.projection.payoffDate && (
          <div>
            <p className="text-xs text-muted-foreground">Debt-Free By</p>
            <p className="text-sm font-medium">
              {new Date(method.projection.payoffDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* Risk warnings */}
        {method.projection.warnings.length > 0 && (
          <div className="space-y-1">
            {method.projection.warnings.slice(0, 2).map((warning, idx) => (
              <div 
                key={idx} 
                className={`text-xs p-2 rounded ${
                  warning.type === 'critical' ? 'bg-destructive/10 text-destructive' :
                  warning.type === 'warning' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-muted text-muted-foreground'
                }`}
              >
                {warning.message}
              </div>
            ))}
          </div>
        )}

        {/* Select button */}
        <Button
          onClick={onSelect}
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          data-testid={`button-select-${method.method}`}
        >
          {isSelected ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Selected
            </>
          ) : (
            "Select This Plan"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
