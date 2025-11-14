import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Check, MapPin, DollarSign, AlertCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/financial-utils";
import { useParams } from "wouter";
import { BudgetCompletionDialog } from "@/components/budget-completion-dialog";
import { BurnRateBar } from "@/components/burn-rate-bar";
import { DebtPaymentDialog } from "@/components/debt-payment-dialog";

interface BudgetItem {
  id: string;
  budgetId: string;
  category: string;
  itemName: string;
  quantity?: string;
  unit?: string;
  estimatedPrice: string;
  actualPrice?: string;
  purchased: boolean;
  purchaseDate?: string;
  locationName?: string;
}

export default function BudgetExecutionPage() {
  const { budgetId } = useParams();
  const { toast } = useToast();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showCompletion, setShowCompletion] = useState(false);
  const [debtPaymentItem, setDebtPaymentItem] = useState<BudgetItem | null>(null);

  const { data: budget } = useQuery<{
    id: string;
    category: string;
    allocatedAmount: string;
    period: string;
    startDate: string;
    endDate: string;
  }>({
    queryKey: [`/api/budgets/${budgetId}`],
    enabled: !!budgetId,
  });

  const { data: items = [], isLoading } = useQuery<BudgetItem[]>({
    queryKey: [`/api/budgets/${budgetId}/items`],
    enabled: !!budgetId,
  });

  const markPurchasedMutation = useMutation({
    mutationFn: async ({
      itemId,
      actualPrice,
    }: {
      itemId: string;
      actualPrice: string;
    }) => {
      return await apiRequest(
        "POST",
        `/api/budgets/${budgetId}/items/${itemId}/purchase`,
        {
          actualPrice,
          purchaseDate: new Date().toISOString(),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/budgets/${budgetId}/items`],
      });
      toast({ title: "Item marked as purchased" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category));
    return Array.from(cats);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filterCategory === "all") return items;
    return items.filter((item) => item.category === filterCategory);
  }, [items, filterCategory]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const purchasedItems = items.filter((item) => item.purchased).length;
    const totalEstimated = items.reduce(
      (sum, item) => sum + parseFloat(item.estimatedPrice),
      0
    );
    const totalActual = items.reduce(
      (sum, item) =>
        sum + (item.actualPrice ? parseFloat(item.actualPrice) : 0),
      0
    );
    const savings = totalEstimated - totalActual;

    return {
      totalItems,
      purchasedItems,
      remaining: totalItems - purchasedItems,
      progress: totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0,
      totalEstimated,
      totalActual,
      savings,
    };
  }, [items]);

  const handleMarkPurchased = (item: BudgetItem) => {
    // If it's a debt payment item, open special dialog
    if (item.linkedDebtId) {
      setDebtPaymentItem(item);
      return;
    }

    // Regular item - prompt for actual price
    const actualPrice = prompt(
      "Enter actual price paid:",
      item.estimatedPrice
    );
    if (actualPrice) {
      markPurchasedMutation.mutate({ itemId: item.id, actualPrice });
    }
  };

  if (isLoading) return <p>Loading shopping list...</p>;

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-8">
      {/* Removed PageHeader */}

      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Items</p>
            </div>
            <p className="text-2xl font-bold">
              {stats.purchasedItems} / {stats.totalItems}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Estimated</p>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.totalEstimated)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Actual</p>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.totalActual)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {stats.savings >= 0 ? "Saved" : "Over"}
              </p>
            </div>
            <p
              className={`text-2xl font-bold ${
                stats.savings >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatCurrency(Math.abs(stats.savings))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Progress value={stats.progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {stats.progress.toFixed(0)}% complete
          </p>
        </CardContent>
      </Card>

      {budget && (
        <Card>
          <CardContent className="pt-6">
            <BurnRateBar
              category={budget.category}
              spent={stats.totalActual}
              allocated={parseFloat(budget.allocatedAmount)}
              startDate={budget.startDate}
              endDate={budget.endDate}
            />
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCompletion(true)} className="ml-auto">
          Budget Complete
        </Button>
      </div>

      {/* Shopping List */}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className={`${item.purchased ? "opacity-60" : ""} ${
              item.linkedDebtId ? "border-orange-200 dark:border-orange-800" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.purchased}
                  onCheckedChange={() => {
                    if (!item.purchased) {
                      handleMarkPurchased(item);
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.linkedDebtId && (
                          <CreditCard className="h-4 w-4 text-orange-600" />
                        )}
                        <h3
                          className={`font-semibold ${
                            item.purchased ? "line-through" : ""
                          }`}
                        >
                          {item.itemName}
                        </h3>
                      </div>
                      {item.quantity && (
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit || ""}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            item.linkedDebtId 
                              ? "bg-orange-50 dark:bg-orange-950 border-orange-200 text-orange-700" 
                              : ""
                          }`}
                        >
                          {item.category.replace(/_/g, ' ')}
                        </Badge>
                        {item.linkedDebtId && (
                          <span className="text-xs text-orange-600 font-medium">
                            Debt Payment
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {item.actualPrice
                          ? formatCurrency(parseFloat(item.actualPrice))
                          : formatCurrency(parseFloat(item.estimatedPrice))}
                      </p>
                      {item.actualPrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          Est: {formatCurrency(parseFloat(item.estimatedPrice))}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.purchased && item.purchaseDate && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-success" />
                        {new Date(item.purchaseDate).toLocaleDateString()}
                      </div>
                      {item.locationName && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.locationName}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No items in this category
          </CardContent>
        </Card>
      )}

      {budget && (
        <BudgetCompletionDialog 
          open={showCompletion}
          onOpenChange={setShowCompletion}
          budget={budget}
          stats={stats}
        />
      )}

      {debtPaymentItem && (
        <DebtPaymentDialog
          open={!!debtPaymentItem}
          onOpenChange={(open) => !open && setDebtPaymentItem(null)}
          budgetItem={debtPaymentItem}
          onPaymentComplete={() => {
            setDebtPaymentItem(null);
            queryClient.invalidateQueries({ queryKey: [`/api/budgets/${budgetId}/items`] });
          }}
        />
      )}
      </div>
    </div>
  );
}