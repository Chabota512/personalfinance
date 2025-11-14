import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDebts, useActiveDebts, useCreateDebt, useUpdateDebt, useDeleteDebt, useCreateDebtPayment, useAccounts } from "@/lib/api";
import { Plus, CreditCard, TrendingDown, Calendar, DollarSign, Trash2, Edit, AlertCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/financial-utils";
import { DebtMethodSelector } from "@/components/debt-method-selector";
import { AddDebtWizard } from "@/components/add-debt-wizard";

interface DebtFormData {
  name: string;
  type: 'i_owe' | 'owed_to_me';
  creditorDebtor: string;
  principalAmount: string;
  currentBalance: string;
  interestRate: string;
  repaymentMethod: 'amortization' | 'lump_sum' | 'custom';
  paymentAmount: string;
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly';
  startDate: string;
  dueDate: string;
}

export default function Debts() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [useNewWizard, setUseNewWizard] = useState(true); // Toggle for wizard vs old flow
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("active");
  
  const [formData, setFormData] = useState<DebtFormData>({
    name: "",
    type: "i_owe",
    creditorDebtor: "",
    principalAmount: "",
    currentBalance: "",
    interestRate: "",
    repaymentMethod: "amortization",
    paymentAmount: "",
    paymentFrequency: "monthly",
    startDate: new Date().toISOString().split('T')[0],
    dueDate: "",
  });

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
    accountId: "",
    notes: "",
    isExtraPayment: false,
  });

  const { toast } = useToast();
  const { data: allDebts, isLoading } = useDebts();
  const { data: activeDebts, isLoading: activeDebtsLoading } = useActiveDebts();
  const { data: accounts } = useAccounts();
  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();
  const deleteMutation = useDeleteDebt();
  const paymentMutation = useCreateDebtPayment();

  const activeDebtsData = activeDebts || [];
  const inactiveDebtsData = allDebts?.filter((d: any) => !d.isActive) || [];

  const assetAccounts = accounts?.filter((a: any) => a.accountType === 'asset') || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createMutation.mutateAsync({
        ...formData,
        currentBalance: formData.currentBalance || formData.principalAmount,
      });
      
      toast({
        title: "Debt added",
        description: `${formData.name} has been added successfully.`,
      });
      
      setIsAddOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add debt",
        variant: "destructive",
      });
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDebt) return;
    
    try {
      await paymentMutation.mutateAsync({
        debtId: selectedDebt.id,
        data: paymentData,
      });
      
      toast({
        title: "Payment recorded",
        description: `Payment of ${formatCurrency(parseFloat(paymentData.amount))} has been recorded.`,
      });
      
      setIsPaymentOpen(false);
      setSelectedDebt(null);
      resetPaymentForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (debtId: string, debtName: string) => {
    if (!confirm(`Are you sure you want to delete ${debtName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(debtId);
      toast({
        title: "Debt deleted",
        description: `${debtName} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete debt",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "i_owe",
      creditorDebtor: "",
      principalAmount: "",
      currentBalance: "",
      interestRate: "",
      repaymentMethod: "amortization",
      paymentAmount: "",
      paymentFrequency: "monthly",
      startDate: new Date().toISOString().split('T')[0],
      dueDate: "",
    });
  };

  const resetPaymentForm = () => {
    setPaymentData({
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      accountId: "",
      notes: "",
      isExtraPayment: false,
    });
  };

  const calculateProgress = (debt: any) => {
    const principal = parseFloat(debt.principalAmount);
    const current = parseFloat(debt.currentBalance);
    const paid = principal - current;
    const percentage = principal > 0 ? (paid / principal) * 100 : 0;
    return { paid, percentage: Math.max(0, Math.min(100, percentage)) };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading debts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display-xl md:text-display-2xl font-bold" data-testid="text-page-title">Debt Management</h1>
            <p className="text-body-md text-muted-foreground">Track and manage your debts and loans</p>
          </div>
        <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-debt">
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </div>
        
      {useNewWizard ? (
          <AddDebtWizard
            open={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            onComplete={async (data) => {
              try {
                // Calculate periods from length and unit
                let totalPeriods = parseInt(data.length);
                if (data.lengthUnit === 'weeks') {
                  totalPeriods = Math.ceil(totalPeriods / 4.33);
                } else if (data.lengthUnit === 'years') {
                  totalPeriods = totalPeriods * 12;
                }

                // Store as APR (annual percentage rate)
                let annualRate = parseFloat(data.interestRate || "0");
                if (data.rateFrequency === 'week') {
                  annualRate = annualRate * 52;
                } else if (data.rateFrequency === 'month') {
                  annualRate = annualRate * 12;
                }

                await createMutation.mutateAsync({
                  name: data.name,
                  type: 'i_owe',
                  creditorDebtor: data.creditorDebtor,
                  principalAmount: data.principalAmount,
                  currentBalance: data.principalAmount,
                  interestRate: annualRate.toString(),
                  repaymentMethod: data.repaymentMethod as any,
                  totalPeriods,
                  startDate: new Date().toISOString().split('T')[0],
                  reasons: data.reasons || data.reasonsTranscription,
                  reasonsTranscription: data.reasonsTranscription,
                  aiRiskAnalysis: data.aiAnalysis ? JSON.stringify(data.aiAnalysis) : null,
                  aiRecommendation: data.aiAnalysis?.recommendation || null,
                  aiRiskScore: data.aiAnalysis?.riskScore || null,
                  monthlyIncome: data.monthlyIncome,
                  monthlyLivingCosts: data.monthlyLivingCosts
                });

                toast({
                  title: "Debt added",
                  description: `${data.name} has been added successfully.`,
                });
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to add debt",
                  variant: "destructive",
                });
              }
            }}
          />
        ) : (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Debt</DialogTitle>
                <DialogDescription>Add a new debt or loan to track</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Debt Name *</Label>
                  <Input
                    id="name"
                    data-testid="input-debt-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Student Loan, Car Loan"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type" data-testid="select-debt-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="i_owe">I Owe (Liability)</SelectItem>
                      <SelectItem value="owed_to_me">Owed to Me (Asset)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="creditorDebtor">
                    {formData.type === 'i_owe' ? 'Creditor' : 'Debtor'} *
                  </Label>
                  <Input
                    id="creditorDebtor"
                    data-testid="input-creditor-debtor"
                    value={formData.creditorDebtor}
                    onChange={(e) => setFormData({ ...formData, creditorDebtor: e.target.value })}
                    placeholder={formData.type === 'i_owe' ? 'e.g., ABC Bank' : 'e.g., John Smith'}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="principalAmount">Principal Amount *</Label>
                  <Input
                    id="principalAmount"
                    data-testid="input-principal-amount"
                    type="number"
                    step="0.01"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="currentBalance">Current Balance</Label>
                  <Input
                    id="currentBalance"
                    data-testid="input-current-balance"
                    type="number"
                    step="0.01"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                    placeholder="Leave empty to use principal amount"
                  />
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (% APR)</Label>
                  <Input
                    id="interestRate"
                    data-testid="input-interest-rate"
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="repaymentMethod">Repayment Method *</Label>
                  <Select 
                    value={formData.repaymentMethod} 
                    onValueChange={(value: any) => setFormData({ ...formData, repaymentMethod: value })}
                  >
                    <SelectTrigger id="repaymentMethod" data-testid="select-repayment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amortization">Regular Payments (Amortization)</SelectItem>
                      <SelectItem value="lump_sum">Lump Sum Payment</SelectItem>
                      <SelectItem value="custom">Custom Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.repaymentMethod === 'amortization' && (
                  <>
                    <div>
                      <Label htmlFor="paymentAmount">Payment Amount *</Label>
                      <Input
                        id="paymentAmount"
                        data-testid="input-payment-amount"
                        type="number"
                        step="0.01"
                        value={formData.paymentAmount}
                        onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                        placeholder="0.00"
                        required={formData.repaymentMethod === 'amortization'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="paymentFrequency">Payment Frequency *</Label>
                      <Select 
                        value={formData.paymentFrequency} 
                        onValueChange={(value: any) => setFormData({ ...formData, paymentFrequency: value })}
                      >
                        <SelectTrigger id="paymentFrequency" data-testid="select-payment-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    data-testid="input-start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    data-testid="input-due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-debt">
                  {createMutation.isPending ? "Adding..." : "Add Debt"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}

      {allDebts && allDebts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No debts tracked</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start tracking your debts and loans to manage them effectively
            </p>
            <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-first-debt">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Debt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active-debts">
              Active Debts ({activeDebtsData.length})
            </TabsTrigger>
            <TabsTrigger value="inactive" data-testid="tab-inactive-debts">
              Paid Off ({inactiveDebtsData.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeDebtsData.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No active debts</p>
                </CardContent>
              </Card>
            ) : (
              activeDebtsData.map((debt: any) => {
                const progress = calculateProgress(debt);
                const principal = parseFloat(debt.principalAmount);
                const current = parseFloat(debt.currentBalance);
                
                return (
                  <Card key={debt.id} data-testid={`card-debt-${debt.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle data-testid={`text-debt-name-${debt.id}`}>{debt.name}</CardTitle>
                            <Badge variant={debt.type === 'i_owe' ? 'destructive' : 'default'}>
                              {debt.type === 'i_owe' ? 'I Owe' : 'Owed to Me'}
                            </Badge>
                          </div>
                          <CardDescription>
                            {debt.type === 'i_owe' ? 'Creditor' : 'Debtor'}: {debt.creditorDebtor}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/debts/${debt.id}`}>
                            <Button
                              size="sm"
                              variant="default"
                              data-testid={`button-view-details-${debt.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDebt(debt);
                              setIsPaymentOpen(true);
                            }}
                            data-testid={`button-record-payment-${debt.id}`}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(debt.id, debt.name)}
                            data-testid={`button-delete-${debt.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Principal</p>
                          <p className="text-lg font-semibold" data-testid={`text-principal-${debt.id}`}>
                            {formatCurrency(principal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Balance</p>
                          <p className="text-lg font-semibold" data-testid={`text-balance-${debt.id}`}>
                            {formatCurrency(current)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Paid</p>
                          <p className="text-lg font-semibold text-green-600" data-testid={`text-paid-${debt.id}`}>
                            {formatCurrency(progress.paid)}
                          </p>
                        </div>
                        {debt.interestRate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Interest Rate</p>
                            <p className="text-lg font-semibold">{parseFloat(debt.interestRate).toFixed(2)}%</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{progress.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress.percentage} data-testid={`progress-${debt.id}`} />
                      </div>

                      {debt.payments && debt.payments.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Recent Payments</p>
                          <div className="space-y-2">
                            {debt.payments.slice(0, 3).map((payment: any) => (
                              <div key={payment.id} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(parseFloat(payment.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4 mt-4">
            {inactiveDebtsData.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No paid off debts</p>
                </CardContent>
              </Card>
            ) : (
              inactiveDebtsData.map((debt: any) => (
                <Card key={debt.id} data-testid={`card-inactive-debt-${debt.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{debt.name}</CardTitle>
                        <CardDescription>{debt.creditorDebtor}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-green-50">Paid Off</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Original Amount: {formatCurrency(parseFloat(debt.principalAmount))}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Payment Recording Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedDebt?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <Label htmlFor="paymentAmount">Payment Amount *</Label>
              <Input
                id="paymentAmount"
                data-testid="input-payment-amount-dialog"
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                data-testid="input-payment-date"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="accountId">Pay From Account</Label>
              <Select 
                value={paymentData.accountId} 
                onValueChange={(value) => setPaymentData({ ...paymentData, accountId: value })}
              >
                <SelectTrigger id="accountId" data-testid="select-payment-account">
                  <SelectValue placeholder="Select account (optional)" />
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
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                data-testid="input-payment-notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Optional notes about this payment"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isExtraPayment"
                data-testid="checkbox-extra-payment"
                checked={paymentData.isExtraPayment}
                onChange={(e) => setPaymentData({ ...paymentData, isExtraPayment: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isExtraPayment" className="cursor-pointer">
                This is an extra payment (beyond regular schedule)
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsPaymentOpen(false);
                  setSelectedDebt(null);
                  resetPaymentForm();
                }}
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={paymentMutation.isPending} data-testid="button-submit-payment">
                {paymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
