import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/financial-utils';

interface DebtProjection {
  dates: string[];
  balances: number[];
  payments: number[];
  principalPayments: number[];
  interestPayments: number[];
  totalInterest: number;
  totalPaid: number;
  payoffDate: string | null;
  warnings: RiskWarning[];
}

interface RiskWarning {
  type: 'critical' | 'warning' | 'info';
  message: string;
  period?: number;
  amount?: number;
}

interface DebtProjectionChartProps {
  projection: DebtProjection;
  debtName?: string;
  repaymentMethod?: string;
}

export function DebtProjectionChart({ projection, debtName, repaymentMethod }: DebtProjectionChartProps) {
  if (!projection || !projection.dates || projection.dates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No projection data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart
  const chartData = projection.dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    balance: projection.balances[index] || 0,
    payment: projection.payments[index] || 0,
  }));

  // Filter out critical warnings
  const criticalWarnings = projection.warnings.filter(w => w.type === 'critical');
  const otherWarnings = projection.warnings.filter(w => w.type !== 'critical');

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-interest">
              {formatCurrency(projection.totalInterest)}
            </div>
            <p className="text-xs text-muted-foreground">
              Over life of debt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-paid">
              {formatCurrency(projection.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Principal + Interest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payoff Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-payoff-date">
              {projection.payoffDate 
                ? new Date(projection.payoffDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {projection.dates.length - 1} periods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Method</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold capitalize" data-testid="text-method">
              {repaymentMethod?.replace(/_/g, ' ') || 'Amortization'}
            </div>
            <p className="text-xs text-muted-foreground">
              Repayment strategy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Warnings */}
      {criticalWarnings.length > 0 && (
        <div className="space-y-2">
          {criticalWarnings.map((warning, index) => (
            <Alert key={index} variant="destructive" data-testid={`alert-critical-${index}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Balance Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Projection</CardTitle>
          <CardDescription>
            Outstanding balance over time for {debtName || 'this debt'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [formatCurrency(value), 'Balance']}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#e11d48" 
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payments Over Time Chart (if available) */}
      {projection.payments.some(p => p > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Schedule</CardTitle>
            <CardDescription>
              Payment amounts per period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatCurrency(value), 'Payment']}
                />
                <Line 
                  type="monotone" 
                  dataKey="payment" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Other Warnings */}
      {otherWarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Additional Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {otherWarnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2" data-testid={`warning-${index}`}>
                <Badge variant={warning.type === 'warning' ? 'default' : 'secondary'}>
                  {warning.type}
                </Badge>
                <p className="text-sm text-muted-foreground flex-1">{warning.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
