import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/financial-utils";
import type { Transaction } from "@shared/schema";
import { getCategoryById } from "@/lib/categories";
import { MapPin, Calendar, FileText, Mic, Heart } from "lucide-react";

interface TransactionDetailsDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsDialog({ transaction, open, onOpenChange }: TransactionDetailsDialogProps) {
  if (!transaction) return null;

  const amount = parseFloat(transaction.totalAmount);
  const isExpense = transaction.transactionType === 'expense';
  const category = transaction.category ? getCategoryById(transaction.category) : null;
  const dateStr = format(new Date(transaction.date), 'MMMM dd, yyyy');
  const amountStr = `${isExpense ? '-' : '+'}${formatCurrency(Math.abs(amount))}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-transaction-details">
        <DialogHeader>
          <DialogTitle className="text-2xl">Transaction Details</DialogTitle>
          <DialogDescription>
            {isExpense ? 'Expense' : 'Income'} transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Amount</div>
            <div className={`text-3xl font-bold ${isExpense ? 'text-destructive' : 'text-success'}`} data-testid="text-transaction-amount">
              {amountStr}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Description</div>
            <div className="text-base font-medium" data-testid="text-transaction-description">
              {transaction.description}
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="text-sm font-medium text-muted-foreground">Date</div>
              <div className="text-base" data-testid="text-transaction-date">{dateStr}</div>
            </div>
          </div>

          {/* Category */}
          {category && (
            <div className="flex items-start gap-3">
              <category.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="text-sm font-medium text-muted-foreground">Category</div>
                <div className="text-base" data-testid="text-transaction-category">{category.name}</div>
              </div>
            </div>
          )}

          {/* Location */}
          {transaction.locationName && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="text-sm font-medium text-muted-foreground">Location</div>
                <div className="text-base" data-testid="text-transaction-location">
                  {transaction.locationName}
                </div>
              </div>
            </div>
          )}

          {/* Notes/Reason */}
          {transaction.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="text-sm font-medium text-muted-foreground">Notes</div>
                <div className="text-base text-muted-foreground" data-testid="text-transaction-notes">
                  {transaction.notes}
                </div>
              </div>
            </div>
          )}

          {/* Contentment Level */}
          {transaction.contentmentLevel !== null && transaction.contentmentLevel !== undefined && (
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="text-sm font-medium text-muted-foreground">Contentment Level</div>
                <div className="text-base" data-testid="text-transaction-contentment">
                  {transaction.contentmentLevel}/10
                </div>
              </div>
            </div>
          )}

          {/* Audio Note */}
          {transaction.reasonAudioUrl && (
            <div className="flex items-start gap-3">
              <Mic className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="text-sm font-medium text-muted-foreground">Voice Note</div>
                <audio controls className="w-full mt-2" data-testid="audio-voice-note">
                  <source src={transaction.reasonAudioUrl} type="audio/webm" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <div className="text-base capitalize" data-testid="text-transaction-status">
              {transaction.status}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
