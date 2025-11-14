import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign, TrendingDown, Calendar, Eye, EyeOff } from "lucide-react";
import { useDebt, useDebtProjection, useCreateDebtPayment, useAccounts } from "@/lib/api";
import { formatCurrency } from "@/lib/financial-utils";
import { DebtProjectionChart } from "@/components/debt-projection-chart";
import { useToast } from "@/hooks/use-toast";

export default function DebtDetail() {
  const { id } = useParams();
  const [showProjection, setShowProjection] = useState(true);
  
  const { data: debt, isLoading: debtLoading } = useDebt(id!);
  const { data: projection, isLoading: projectionLoading } = useDebtProjection(id!);

  if (debtLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading debt details...</p>
        </div>
      </div>
    );
  }

  if (!debt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/debts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Debts
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Debt not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const principal = parseFloat(debt.principalAmount);
  const currentBalance = parseFloat(debt.currentBalance);
  const paidSoFar = principal - currentBalance;
  const progressPercentage = principal > 0 ? (paidSoFar / principal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/debts">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-debt-name">{debt.name}</h1>
            <p className="text-muted-foreground">{debt.creditorDebtor}</p>
          </div>
        </div>
        <Badge variant={debt.type === 'i_owe' ? 'destructive' : 'default'}>
          {debt.type === 'i_owe' ? 'I Owe' : 'Owed to Me'}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-balance">
              {formatCurrency(currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {formatCurrency(principal)} original
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid So Far</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-paid-amount">
              {formatCurrency(paidSoFar)}
            </div>
            <p className="text-xs text-muted-foreground">
              {progressPercentage.toFixed(1)}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-interest-rate">
              {debt.interestRate ? `${parseFloat(debt.interestRate).toFixed(2)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Annual Percentage Rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projection Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Repayment Analysis</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowProjection(!showProjection)}
          data-testid="button-toggle-projection"
        >
          {showProjection ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showProjection ? 'Hide' : 'Show'} Projection
        </Button>
      </div>

      {/* Projection Visualization */}
      {showProjection && (
        <div>
          {projectionLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Calculating projection...</p>
              </CardContent>
            </Card>
          ) : projection ? (
            <DebtProjectionChart 
              projection={projection}
              debtName={debt.name}
              repaymentMethod={debt.repaymentMethod}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Unable to generate projection</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Debt Details */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debt Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Repayment Method</p>
                  <p className="font-medium capitalize" data-testid="text-repayment-method">
                    {debt.repaymentMethod?.replace(/_/g, ' ') || 'Standard'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Frequency</p>
                  <p className="font-medium capitalize" data-testid="text-payment-frequency">
                    {debt.paymentFrequency || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium" data-testid="text-start-date">
                    {new Date(debt.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium" data-testid="text-due-date">
                    {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              
              {debt.paymentAmount && (
                <div>
                  <p className="text-sm text-muted-foreground">Regular Payment Amount</p>
                  <p className="text-xl font-bold" data-testid="text-payment-amount">
                    {formatCurrency(parseFloat(debt.paymentAmount))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments made towards this debt</CardDescription>
            </CardHeader>
            <CardContent>
              {debt.payments && debt.payments.length > 0 ? (
                <div className="space-y-3">
                  {debt.payments.map((payment: any) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                      data-testid={`payment-${payment.id}`}
                    >
                      <div>
                        <p className="font-medium">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Principal: {formatCurrency(parseFloat(payment.principalPaid))}
                          {payment.interestPaid && ` | Interest: ${formatCurrency(parseFloat(payment.interestPaid))}`}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {formatCurrency(parseFloat(payment.amount))}
                        </p>
                        {payment.isExtraPayment && (
                          <Badge variant="secondary" className="mt-1">Extra</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No payments recorded yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Repay Debt Button */}
      <Card className="border-primary">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Make a Payment</h3>
              <p className="text-sm text-muted-foreground">
                Record a payment towards this debt
              </p>
            </div>
            <RepayDebtDialog
              debt={debt}
              projection={projection}
              onSuccess={() => {
                toast({
                  title: "Payment recorded",
                  description: "Your payment has been recorded successfully"
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RepayDebtDialog({ debt, projection, onSuccess }: { debt: any; projection: any; onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  
  const { data: accounts } = useAccounts();
  const paymentMutation = useCreateDebtPayment();
  const { toast } = useToast();

  // Calculate suggested payment amount from projection
  const suggestedPayment = projection && projection.payments && projection.payments[1] 
    ? projection.payments[1].toFixed(2) 
    : debt.paymentAmount || "0.00";

  const assetAccounts = accounts?.filter((a: any) => a.accountType === 'asset') || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await paymentMutation.mutateAsync({
        debtId: debt.id,
        data: {
          amount: paymentAmount,
          paymentDate,
          accountId,
          notes,
          isExtraPayment: false
        }
      });
      
      toast({
        title: "Payment recorded",
        description: `Payment of ${formatCurrency(parseFloat(paymentAmount))} has been recorded.`,
      });
      
      setIsOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setPaymentAmount(suggestedPayment);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setAccountId("");
    setNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setPaymentAmount(suggestedPayment);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button onClick={() => setIsOpen(true)} data-testid="button-repay-debt">
        Make Payment
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment towards {debt.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="payment-amount">Payment Amount *</Label>
            <Input
              id="payment-amount"
              data-testid="input-payment-amount"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            {suggestedPayment && parseFloat(suggestedPayment) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Suggested payment: {formatCurrency(parseFloat(suggestedPayment))}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="payment-date">Payment Date *</Label>
            <Input
              id="payment-date"
              data-testid="input-payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="account">Pay From Account *</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger id="account" data-testid="select-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {assetAccounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(parseFloat(account.balance))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              data-testid="textarea-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={paymentMutation.isPending}
              data-testid="button-submit-payment"
            >
              {paymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
