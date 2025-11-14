import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Bell, X, AlertTriangle, CheckCircle, Info, Flame, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id?: string;
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  budgetId?: string;
  category?: string;
  percentUsed?: number;
}

export function NotificationCenter() {
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });
  const { toast } = useToast();
  
  // Swipe gesture state
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const deleteMutation = useMutation({
    mutationFn: async ({ notificationId, skipToast }: { notificationId: string; skipToast?: boolean }) => {
      await apiRequest('DELETE', `/api/notifications/${notificationId}`);
      return { notificationId, skipToast };
    },
    onSuccess: ({ notificationId, skipToast }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // Show undo toast if not skipping
      if (!skipToast) {
        toast({
          title: "Notification dismissed",
          description: "Swipe dismissed the notification",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive"
      });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/notifications/clear-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Notifications cleared",
        description: "All notifications have been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear notifications",
        variant: "destructive"
      });
    }
  });

  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ notificationId, skipToast: true });
  };

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipedId(notificationId);
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipedId) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;
    
    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
      e.preventDefault();
      // Only allow left swipe (negative offset)
      if (deltaX < 0) {
        setSwipeOffset(Math.max(deltaX, -100));
      }
    }
  };

  const handleTouchEnd = () => {
    if (!swipedId) return;
    
    // If swiped far enough, delete the notification with toast feedback
    if (swipeOffset < -60) {
      deleteMutation.mutate({ notificationId: swipedId, skipToast: false });
    }
    
    // Reset swipe state
    setSwipedId(null);
    setSwipeOffset(0);
    isSwiping.current = false;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'medium':
        return <Info className="h-4 w-4 text-primary" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-destructive bg-destructive/5';
      case 'high':
        return 'border-l-warning bg-warning/5';
      case 'medium':
        return 'border-l-primary bg-primary/5';
      case 'low':
        return 'border-l-success bg-success/5';
      default:
        return 'border-l-muted';
    }
  };

  const hasUnreadNotifications = notifications.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {hasUnreadNotifications && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" data-testid="notification-popover">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <Badge variant="secondary" data-testid="notification-count">
                      {notifications.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={clearAllMutation.isPending}
                      data-testid="button-clear-all-notifications"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center" data-testid="no-notifications">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-medium text-foreground">
                    No notifications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id || index}
                      className="relative overflow-hidden"
                      data-testid={`notification-${index}`}
                    >
                      {/* Swipe background - shown when swiping */}
                      {swipedId === notification.id && swipeOffset < 0 && (
                        <div className="absolute inset-0 bg-destructive flex items-center justify-end pr-6">
                          <Trash2 className="h-5 w-5 text-destructive-foreground" />
                        </div>
                      )}
                      
                      {/* Notification content */}
                      <div
                        className={cn(
                          "border-l-4 p-4 hover-elevate transition-all relative bg-background",
                          getSeverityColor(notification.severity)
                        )}
                        style={{
                          transform: swipedId === notification.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                          transition: isSwiping.current ? 'none' : 'transform 0.3s ease-out'
                        }}
                        onTouchStart={(e) => notification.id && handleTouchStart(e, notification.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getSeverityIcon(notification.severity)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {notification.message}
                            </p>
                            {notification.percentUsed && (
                              <div className="flex items-center gap-2 pt-1">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full transition-all",
                                      notification.percentUsed >= 100
                                        ? "bg-destructive"
                                        : notification.percentUsed >= 75
                                        ? "bg-warning"
                                        : "bg-primary"
                                    )}
                                    style={{ width: `${Math.min(notification.percentUsed, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium tabular-nums text-foreground">
                                  {notification.percentUsed}%
                                </span>
                              </div>
                            )}
                          </div>
                          {notification.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => handleDelete(notification.id!, e)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-notification-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
