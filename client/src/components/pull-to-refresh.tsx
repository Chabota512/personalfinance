import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { LoaderCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  enabled?: boolean;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80,
  enabled = true 
}: PullToRefreshProps) {
  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorRotation = (pullDistance / threshold) * 180;
  const shouldShowSpinner = isRefreshing || pullDistance >= threshold;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull-to-refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-200 z-50"
        style={{
          height: `${Math.min(pullDistance, threshold + 20)}px`,
          opacity: indicatorOpacity,
        }}
      >
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 shadow-sm">
          {shouldShowSpinner ? (
            <LoaderCircle 
              className="h-4 w-4 text-primary pull-refresh-spinner" 
            />
          ) : (
            <LoaderCircle 
              className="h-4 w-4 text-primary transition-transform duration-200" 
              style={{ transform: `rotate(${indicatorRotation}deg)` }}
            />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Content with top padding when pulling */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isRefreshing ? threshold / 2 : Math.min(pullDistance * 0.5, threshold / 2)}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
