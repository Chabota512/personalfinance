import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Receipt, Target, PieChart, X } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function QuickActionFAB() {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: "Add Transaction", icon: Receipt, href: "/transactions", color: "bg-chart-1 hover:bg-chart-1/90" },
    { label: "New Goal", icon: Target, href: "/goals", color: "bg-success hover:bg-success/90" },
    { label: "Create Budget", icon: PieChart, href: "/budget", color: "bg-chart-2 hover:bg-chart-2/90" },
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
          data-testid="fab-backdrop"
        />
      )}

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50" style={{ position: 'fixed' }}>
        {/* Action Buttons */}
        {open && (
          <div className="absolute bottom-16 sm:bottom-20 right-0 flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-4 duration-200">
            {actions.map((action, i) => (
              <Link key={i} href={action.href}>
                <Button
                  size="lg"
                  className={cn(
                    action.color,
                    "text-white shadow-lg gap-2 min-w-[180px] justify-start",
                    "animate-in slide-in-from-bottom-2 fade-in",
                    "hover-elevate active-elevate-2"
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => setOpen(false)}
                  data-testid={`fab-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl fab",
            "bg-primary hover:bg-primary/90",
            "transition-transform duration-200",
            open && "rotate-45"
          )}
          onClick={() => setOpen(!open)}
          data-testid="quick-action-fab"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>
    </>
  );
}