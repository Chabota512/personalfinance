
import { Badge } from "@/components/ui/badge";
import { Clock, Check } from "lucide-react";

interface TransactionStatusBadgeProps {
  status: 'pending' | 'posted';
}

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <Check className="h-3 w-3" />
      Posted
    </Badge>
  );
}
