import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Home,
  LayoutDashboard,
  Receipt,
  Wallet,
  PieChart,
  Target,
  TrendingUp,
  Scale,
  FileText,
  Settings,
  User,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  href: string;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home, href: "/home" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "transactions", label: "Transactions", icon: Receipt, href: "/transactions" },
  { id: "accounts", label: "Accounts", icon: Wallet, href: "/accounts" },
  { id: "budget", label: "Budget", icon: PieChart, href: "/budget" },
  { id: "goals", label: "Goals", icon: Target, href: "/goals" },
  { id: "cash-flow", label: "Cash Flow", icon: TrendingUp, href: "/cash-flow" },
  { id: "balance-sheet", label: "Balance Sheet", icon: Scale, href: "/balance-sheet" },
  { id: "profile", label: "Profile", icon: User, href: "/settings" },
];

export function FeatureIconsNav() {
  const [location] = useLocation();

  return (
    <div className="w-full" data-testid="feature-icons-nav">
      <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-1.5 sm:gap-2 pb-2 scrollbar-hide snap-x snap-mandatory">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.id} href={item.href}>
              <Button
                variant="ghost"
                className={`
                  flex-shrink-0 min-w-[72px] sm:min-w-[80px] h-auto flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 snap-start
                  hover-elevate active-elevate-2
                  ${isActive ? 'bg-accent text-accent-foreground' : ''}
                `}
                data-testid={`nav-icon-${item.id}`}
              >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">
                  {item.label}
                </span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
