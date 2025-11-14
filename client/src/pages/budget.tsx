import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, ShoppingCart, TrendingUp, Calendar, DollarSign, Edit, Trash2, AlertTriangle, ChevronDown } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/financial-utils";
import { EmptyState } from "@/components/empty-state";
import { BurnRateBar } from "@/components/burn-rate-bar";
import { MobilePageShell, MobileSection } from "@/components/mobile-page-shell";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Budget {
  id: string;
  category: string;
  allocatedAmount: string;
  period: string;
  startDate: string;
  endDate: string;
  isActive: number;
  spent?: string;
  title?: string;
}

export default function BudgetPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editWarningOpen, setEditWarningOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [activeBudgetsOpen, setActiveBudgetsOpen] = useState(true);
  const [allBudgetsOpen, setAllBudgetsOpen] = useState(false);

  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
  });

  const { data: activeBudgets = [] } = useQuery<Budget[]>({
    queryKey: ["/api/budgets/active"],
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const res = await fetch(`/api/budgets/${budgetId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete budget");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Budget Deleted",
        description: "Budget items have been added to your master items list.",
      });
      setDeleteDialogOpen(false);
      setSelectedBudget(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (budget: Budget) => {
    setSelectedBudget(budget);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = async (budget: Budget) => {
    try {
      const res = await fetch(`/api/budgets/${budget.id}/can-edit`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!data.canEdit) {
        setSelectedBudget(budget);
        setEditWarningOpen(true);
      } else {
        setLocation(`/budget/${budget.id}/edit`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check budget status",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = () => {
    if (selectedBudget) {
      deleteBudgetMutation.mutate(selectedBudget.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateCompact = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateProgress = (spent: string | undefined, allocated: string) => {
    if (!spent) return 0;
    const spentNum = parseFloat(spent);
    const allocatedNum = parseFloat(allocated);
    if (isNaN(spentNum) || isNaN(allocatedNum) || allocatedNum === 0) return 0;
    return (spentNum / allocatedNum) * 100;
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <MobilePageShell compact scrollable>
        <div className="flex flex-col gap-2">
          {/* Compact Header */}
          <div className="flex items-center justify-between py-1">
            <h1 className="text-lg font-semibold">Budgets</h1>
            <Button
              size="sm"
              onClick={() => setLocation("/budget/new")}
              className="gap-1"
              data-testid="button-create-budget"
            >
              <Plus className="h-3 w-3" />
              Create
            </Button>
          </div>

          {/* Active Budgets Section */}
          {activeBudgets.length > 0 && (
            <Collapsible open={activeBudgetsOpen} onOpenChange={setActiveBudgetsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                <h2 className="text-sm font-semibold">Active Budgets ({activeBudgets.length})</h2>
                <ChevronDown className={`h-4 w-4 transition-transform ${activeBudgetsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-2 pt-2">
                  {activeBudgets.map((budget) => {
                      const allocated = parseFloat(budget.allocatedAmount);
                      const spent = parseFloat(budget.spent || '0');

                      return (
                        <Card
                          key={budget.id}
                          className="hover-elevate p-2"
                          data-testid={`budget-card-${budget.id}`}
                        >
                          <div className="space-y-2">
                            {/* Compact Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold truncate">
                                  {budget.title || 'Budget'}
                                </h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateCompact(budget.startDate)} - {formatDateCompact(budget.endDate)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {budget.period}
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(budget);
                                  }}
                                  data-testid={`button-edit-${budget.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(budget);
                                  }}
                                  data-testid={`button-delete-${budget.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Compact Burn Rate */}
                            <div className="space-y-1">
                              <BurnRateBar
                                category={budget.category}
                                spent={spent}
                                allocated={allocated}
                                startDate={budget.startDate}
                                endDate={budget.endDate}
                              />
                            </div>

                            {/* Compact Shop Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1"
                              onClick={() => setLocation(`/budgets/${budget.id}/shop`)}
                              data-testid={`button-shop-${budget.id}`}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              Shop
                            </Button>
                          </div>
                        </Card>
                      );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* All Budgets Section */}
          {budgets.length > 0 && (
            <Collapsible open={allBudgetsOpen} onOpenChange={setAllBudgetsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                <h2 className="text-sm font-semibold">All Budgets ({budgets.length})</h2>
                <ChevronDown className={`h-4 w-4 transition-transform ${allBudgetsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-2 pt-2">
                  {budgets.map((budget) => {
                      const allocated = parseFloat(budget.allocatedAmount);
                      const spent = parseFloat(budget.spent || '0');

                      return (
                        <Card
                          key={budget.id}
                          className="hover-elevate p-2"
                          data-testid={`budget-item-${budget.id}`}
                        >
                          <div className="space-y-2">
                            {/* Compact Info */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold truncate">
                                  {budget.title || 'Budget'}
                                </h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateCompact(budget.startDate)} - {formatDateCompact(budget.endDate)}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Badge variant={budget.isActive ? "default" : "secondary"} className="text-xs px-1 py-0">
                                  {budget.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {budget.period}
                                </Badge>
                              </div>
                            </div>

                            {/* Compact Budget Summary */}
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <p className="text-muted-foreground">Allocated</p>
                                <p className="font-bold">{formatCurrency(allocated)}</p>
                              </div>
                              {budget.spent !== undefined && (
                                <div className="text-right">
                                  <p className="text-muted-foreground">Spent</p>
                                  <p className="font-bold">{formatCurrency(spent)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Empty State */}
          {budgets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <TrendingUp className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-sm font-semibold">No budgets yet</h3>
                <p className="text-xs text-muted-foreground">Create your first budget to start tracking</p>
              </div>
              <Button
                size="sm"
                onClick={() => setLocation("/budget/new")}
                data-testid="button-create-first-budget"
              >
                Create Budget
              </Button>
            </div>
          )}
        </div>

        {/* Dialogs */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Budget?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to delete the budget for{" "}
                  <strong>{selectedBudget?.category.replace(/_/g, ' ')}</strong>?
                </p>
                <p className="text-sm">
                  All budget items will be moved to your master items list with their purchase history intact.
                  This action cannot be undone.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteBudgetMutation.isPending ? "Deleting..." : "Delete Budget"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={editWarningOpen} onOpenChange={setEditWarningOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Cannot Edit Budget
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This budget has items that have already been purchased and cannot be edited.
                </p>
                <p className="text-sm">
                  To make changes, please create a new budget instead.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction onClick={() => setLocation("/budget/new")}>
                Create New Budget
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MobilePageShell>
    );
  }

  // Desktop Layout (Original)
  return (
    <div className="min-h-screen pb-20 md:pb-6 bg-[#03010117]">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        {/* Create Budget Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setLocation("/budget/new")}
            className="gap-2"
            data-testid="button-create-budget"
          >
            <Plus className="h-4 w-4" />
            Create Budget
          </Button>
        </div>

        {activeBudgets.length > 0 && (
          <div className="grid gap-4">
            <h2 className="text-display-md md:text-display-lg font-semibold">Active Budgets</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeBudgets.map((budget) => {
                const allocated = parseFloat(budget.allocatedAmount);
                const spent = parseFloat(budget.spent || '0');

                return (
                  <Card
                    key={budget.id}
                    className="hover-elevate"
                    data-testid={`budget-card-${budget.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">
                          {budget.title || 'Budget'}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={budget.isActive ? "default" : "secondary"}>
                            {budget.period}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(budget);
                              }}
                              data-testid={`button-edit-${budget.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(budget);
                              }}
                              data-testid={`button-delete-${budget.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3" />
                        {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <BurnRateBar
                        category={budget.category}
                        spent={spent}
                        allocated={allocated}
                        startDate={budget.startDate}
                        endDate={budget.endDate}
                      />

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setLocation(`/budgets/${budget.id}/shop`)}
                        data-testid={`button-shop-${budget.id}`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Shop
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {budgets.length > 0 && (
          <div className="grid gap-4">
            <h2 className="text-display-md md:text-display-lg font-semibold">All Budgets</h2>
            <div className="grid gap-4">
              {budgets.map((budget) => {
                const allocated = parseFloat(budget.allocatedAmount);
                const spent = parseFloat(budget.spent || '0');

                return (
                  <Card
                    key={budget.id}
                    className="hover-elevate"
                    data-testid={`budget-item-${budget.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="space-y-1">
                          <CardTitle>
                            {budget.title || 'Budget'}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={budget.isActive ? "default" : "secondary"}>
                            {budget.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{budget.period}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Allocated</p>
                          <p className="text-2xl font-bold">{formatCurrency(allocated)}</p>
                        </div>
                        {budget.spent !== undefined && (
                          <div className="space-y-1 text-right">
                            <p className="text-sm text-muted-foreground">Spent</p>
                            <p className="text-2xl font-bold">{formatCurrency(spent)}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {budgets.length === 0 && (
          <EmptyState
            icon={TrendingUp}
            title="No budgets yet"
            description="Create your first budget to start tracking your spending"
            actionLabel="Create Budget"
            onAction={() => setLocation("/budget/new")}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Budget?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete the budget for{" "}
                <strong>{selectedBudget?.category.replace(/_/g, ' ')}</strong>?
              </p>
              <p className="text-sm">
                All budget items will be moved to your master items list with their purchase history intact.
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBudgetMutation.isPending ? "Deleting..." : "Delete Budget"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Warning Dialog */}
      <AlertDialog open={editWarningOpen} onOpenChange={setEditWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Cannot Edit Budget
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This budget has items that have already been purchased and cannot be edited.
              </p>
              <p className="text-sm">
                To make changes, please create a new budget instead.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation("/budget/new")}>
              Create New Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
