
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingCart, X } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BudgetItemMatch {
  budgetItemId: string;
  budgetId: string;
  budgetName: string;
  itemName: string;
  category: string;
  estimatedPrice: string;
  quantity: string;
  unit: string;
  quantityPurchased: number;
  quantityRemaining: number;
}

interface BudgetLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchingItems: BudgetItemMatch[];
  transactionId: string;
  amount: string;
}

export function BudgetLinkDialog({
  open,
  onOpenChange,
  matchingItems,
  transactionId,
  amount,
}: BudgetLinkDialogProps) {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantityPurchased, setQuantityPurchased] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLink = async () => {
    if (!selectedItemId) {
      toast({
        title: "Select an item",
        description: "Please select which budget item to update",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('POST', '/api/quick-deals/link-to-budget', {
        transactionId,
        budgetItemId: selectedItemId,
        actualPrice: amount,
        quantityPurchased: parseFloat(quantityPurchased),
      });

      toast({
        title: "✅ Linked to budget",
        description: "Budget item updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/active'] });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const selectedItem = matchingItems.find(item => item.budgetItemId === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Budget Item Detected
          </DialogTitle>
          <DialogDescription>
            This purchase matches {matchingItems.length} item{matchingItems.length > 1 ? 's' : ''} in your budgets.
            Would you like to update a budget item?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={selectedItemId} onValueChange={setSelectedItemId}>
            {matchingItems.map((item) => (
              <div
                key={item.budgetItemId}
                className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value={item.budgetItemId} id={item.budgetItemId} />
                <label
                  htmlFor={item.budgetItemId}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.itemName}</p>
                    <Badge variant="outline" className="text-xs">
                      {item.budgetName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Est: {formatCurrency(parseFloat(item.estimatedPrice))}</span>
                    {item.quantity && (
                      <>
                        <span>•</span>
                        <span>{item.quantityRemaining} of {item.quantity} {item.unit || 'items'} left</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{item.category.replace(/_/g, ' ')}</p>
                </label>
              </div>
            ))}
          </RadioGroup>

          {selectedItem && selectedItem.quantity && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <Label htmlFor="quantity">
                How many did you buy? (Max: {selectedItem.quantityRemaining})
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedItem.quantityRemaining}
                value={quantityPurchased}
                onChange={(e) => setQuantityPurchased(e.target.value)}
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                {parseFloat(quantityPurchased) < selectedItem.quantityRemaining
                  ? `${selectedItem.quantityRemaining - parseFloat(quantityPurchased)} will remain on your list`
                  : 'This will complete the item'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedItemId || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Linking..." : "Update Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
