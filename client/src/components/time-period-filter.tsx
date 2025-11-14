import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type TimePeriod = "today" | "week" | "month" | "year" | "all";

interface TimePeriodFilterProps {
  value: TimePeriod;
  onValueChange: (period: TimePeriod) => void;
  className?: string;
  compact?: boolean;
}

export function TimePeriodFilter({ value, onValueChange, className, compact = false }: TimePeriodFilterProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as TimePeriod)} className={className}>
      <TabsList data-testid="time-period-filter">
        <TabsTrigger 
          value="today" 
          data-testid="filter-today"
          className={cn(compact && "text-xs")}
        >
          Today
        </TabsTrigger>
        <TabsTrigger 
          value="week" 
          data-testid="filter-week"
          className={cn(compact && "text-xs")}
        >
          Week
        </TabsTrigger>
        <TabsTrigger 
          value="month" 
          data-testid="filter-month"
          className={cn(compact && "text-xs")}
        >
          Month
        </TabsTrigger>
        <TabsTrigger 
          value="year" 
          data-testid="filter-year"
          className={cn(compact && "text-xs")}
        >
          Year
        </TabsTrigger>
        <TabsTrigger 
          value="all" 
          data-testid="filter-all"
          className={cn(compact && "text-xs")}
        >
          All
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

// Helper function to calculate date range from period
export function getDateRangeFromPeriod(period: TimePeriod): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now); // Current time
  let startDate = new Date(now);

  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      // Start of current week (Sunday)
      const day = now.getDay();
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      // Start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      // Start of current year
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
      // Set to a very early date (10 years ago should cover most cases)
      startDate = new Date(now.getFullYear() - 10, 0, 1);
      break;
  }

  return { startDate, endDate };
}
