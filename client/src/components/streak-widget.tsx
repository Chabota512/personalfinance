import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  totalDaysInBudget: number;
  lastBudgetCheckDate: string | null;
}

export function StreakWidget() {
  const { data: streak } = useQuery<UserStreak>({
    queryKey: ['/api/streaks'],
  });

  if (!streak) {
    return null;
  }

  const { currentStreak, longestStreak, totalDaysInBudget } = streak;
  const isOnStreak = currentStreak > 0;

  return (
    <Card className="overflow-hidden" data-testid="streak-widget">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isOnStreak ? "bg-primary/10" : "bg-muted"
            )}>
              <Flame className={cn(
                "h-6 w-6",
                isOnStreak ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold tabular-nums" data-testid="text-current-streak">
                  {currentStreak}
                </p>
                <span className="text-sm text-muted-foreground">
                  {currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-3 w-3 text-warning" />
                <p className="text-lg font-semibold tabular-nums" data-testid="text-longest-streak">
                  {longestStreak}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Best</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <p className="text-lg font-semibold tabular-nums" data-testid="text-total-days">
                  {totalDaysInBudget}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {isOnStreak && (
          <div className="mt-3 flex items-center justify-between p-2 bg-success/10 rounded-md">
            <p className="text-xs font-medium text-success">
              Keep it up! Stay in budget today to continue your streak.
            </p>
            {currentStreak >= 7 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {currentStreak >= 30 ? 'Legendary!' : currentStreak >= 14 ? 'Amazing!' : 'On Fire!'}
              </Badge>
            )}
          </div>
        )}

        {!isOnStreak && totalDaysInBudget > 0 && (
          <div className="mt-3 p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              Start a new streak by staying within budget today!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
