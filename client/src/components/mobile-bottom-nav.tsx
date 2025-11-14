import { Home, BarChart3, Target, PieChart, Receipt } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Budget", url: "/budget", icon: PieChart },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "More", url: "/dashboard", icon: BarChart3 },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t border-border md:hidden safe-area-bottom"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location === item.url;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                "hover-elevate active-elevate-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              data-testid={`bottom-nav-${item.title.toLowerCase()}`}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-body-xs font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
