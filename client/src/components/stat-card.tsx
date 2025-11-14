import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  description?: string;
}

export function StatCard({ title, value, icon: Icon, trend, description }: StatCardProps) {
  const testId = `stat-${title.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <Card className="hover-elevate" data-testid={testId}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground" data-testid={`${testId}-title`}>{title}</p>
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
        </div>
        
        <div className="space-y-1 sm:space-y-2">
          <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground" data-testid={`${testId}-value`}>
            {value}
          </p>
          
          {trend && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              {description && (
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
