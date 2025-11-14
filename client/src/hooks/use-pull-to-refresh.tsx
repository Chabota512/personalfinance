import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from './use-mobile';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: PullToRefreshOptions) {
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !isMobile) return;

    const wrapper = containerRef.current;
    if (!wrapper) return;

    // Find the nearest scrollable parent (MobilePageShell)
    let container: HTMLElement | null = wrapper.parentElement;
    while (container) {
      const overflow = window.getComputedStyle(container).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') {
        break;
      }
      container = container.parentElement;
    }

    if (!container) return;

    let startY = 0;
    let currentY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if we're at the top of the scroll container
      if (container.scrollTop === 0 && !isRefreshing) {
        startY = e.touches[0].clientY;
        touchStartY.current = startY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      // Only pull down (positive diff) and when at top
      if (diff > 0 && container.scrollTop === 0) {
        // Prevent default scroll behavior
        e.preventDefault();
        
        // Apply resistance to pull distance
        const distance = Math.min(diff / resistance, threshold * 1.5);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      isPulling = false;

      // Trigger refresh if pulled beyond threshold
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Pull to refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Snap back
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isMobile, isRefreshing, onRefresh, pullDistance, threshold, resistance]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
  };
}
