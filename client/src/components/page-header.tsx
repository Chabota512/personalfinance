
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBack?: boolean;
  backUrl?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  showBack = false,
  backUrl,
  breadcrumbs = [],
  actions,
}: PageHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backUrl) {
      setLocation(backUrl);
    } else {
      window.history.back();
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container max-w-7xl mx-auto px-4 py-4">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="flex-shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
