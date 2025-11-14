import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center bg-[#0000009e]">
        <div className="p-4 bg-muted rounded-full mb-4">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button onClick={onAction} data-testid="button-empty-state-action">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
