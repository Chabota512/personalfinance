import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MobilePageShellProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  scrollable?: boolean;
  noPadding?: boolean;
}

export function MobilePageShell({
  children,
  className,
  compact = true,
  scrollable = true,
  noPadding = false,
}: MobilePageShellProps) {
  return (
    <div
      className={cn(
        "mobile-page",
        !noPadding && (compact ? "mobile-compact" : "page-shell"),
        scrollable && "overflow-y-auto",
        "md:min-h-0",
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: "xs" | "sm" | "md";
}

export function MobileSection({
  children,
  className,
  spacing = "sm",
}: MobileSectionProps) {
  const spaceClass = {
    xs: "mobile-space-xs",
    sm: "mobile-space-sm",
    md: "mobile-space-md",
  }[spacing];

  return (
    <div className={cn(spaceClass, className)}>
      {children}
    </div>
  );
}
