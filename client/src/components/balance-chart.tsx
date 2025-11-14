import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financial-utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useMemo } from "react";

interface BalanceChartProps {
  data: Array<{ date: string; balance: number }>;
  currentBalance: number;
  isLoading?: boolean;
}

export function BalanceChart({ data, currentBalance, isLoading }: BalanceChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      ...item,
      displayDate: new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  const balanceChange = useMemo(() => {
    if (!data || data.length < 2) return { amount: 0, percentage: 0 };
    const firstBalance = data[0].balance;
    const lastBalance = data[data.length - 1].balance;
    const amount = lastBalance - firstBalance;
    const percentage = firstBalance !== 0 ? (amount / firstBalance) * 100 : 0;
    return { amount, percentage };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Balance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Balance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>No balance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Balance Over Time
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Current Balance</div>
              <div className="text-xl font-bold" data-testid="text-current-balance">
                {formatCurrency(currentBalance)}
              </div>
            </div>
            {balanceChange.amount !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${balanceChange.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                {balanceChange.amount >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {formatCurrency(Math.abs(balanceChange.amount))}
                </span>
                <span className="text-xs">
                  ({balanceChange.percentage >= 0 ? '+' : ''}{balanceChange.percentage.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="displayDate" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `$${(value / 1000).toFixed(1)}k`;
                }
                return `$${value}`;
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--primary))' }}
              formatter={(value: any) => [formatCurrency(value), 'Balance']}
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 3 }}
              activeDot={{ r: 5 }}
              name="Balance"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
