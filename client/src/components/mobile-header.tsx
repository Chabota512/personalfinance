import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notification-center";
import { useLocation, Link } from "wouter";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route configuration for page headers
const routeConfig: Record<string, { title: string; description: string; breadcrumbs: Array<{ label: string; href: string }> }> = {
  "/home": {
    title: "Home",
    description: "Your financial overview",
    breadcrumbs: [{ label: "Home", href: "/home" }],
  },
  "/dashboard": {
    title: "Dashboard",
    description: "Comprehensive financial insights",
    breadcrumbs: [{ label: "Dashboard", href: "/dashboard" }],
  },
  "/budget": {
    title: "Budgets",
    description: "Manage your spending limits and track progress",
    breadcrumbs: [{ label: "Budgets", href: "/budget" }],
  },
  "/goals": {
    title: "Goals",
    description: "Track your financial goals",
    breadcrumbs: [{ label: "Goals", href: "/goals" }],
  },
  "/transactions": {
    title: "Transactions",
    description: "View and manage all transactions",
    breadcrumbs: [{ label: "Transactions", href: "/transactions" }],
  },
  "/accounts": {
    title: "Accounts",
    description: "Manage your financial accounts",
    breadcrumbs: [{ label: "Accounts", href: "/accounts" }],
  },
  "/debts": {
    title: "Debts",
    description: "Track and manage your debts",
    breadcrumbs: [{ label: "Debts", href: "/debts" }],
  },
  "/items": {
    title: "Items",
    description: "Your shopping items catalog",
    breadcrumbs: [{ label: "Items", href: "/items" }],
  },
  "/learn": {
    title: "Learn",
    description: "Financial education resources",
    breadcrumbs: [{ label: "Learn", href: "/learn" }],
  },
  "/profile": {
    title: "Profile",
    description: "Manage your profile",
    breadcrumbs: [{ label: "Profile", href: "/profile" }],
  },
  "/settings": {
    title: "Settings",
    description: "App settings and preferences",
    breadcrumbs: [{ label: "Settings", href: "/settings" }],
  },
};

export function MobileHeader() {
  const [location] = useLocation();
  const config = routeConfig[location];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border md:bg-card/80 safe-area-top">
      {/* Mobile view - touch-optimized header with proper safe-area */}
      <div className="flex md:hidden items-center justify-between min-h-[48px] px-4 py-2">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="touch-target" />
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <ThemeToggle />
        </div>
      </div>

      {/* Desktop view - full header with breadcrumbs and title */}
      {config && (
        <div className="hidden md:block bg-background/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 border-b border-border/30">
          <div className="container max-w-7xl mx-auto px-4 py-2">
            {/* Single row with all icons and breadcrumbs */}
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Breadcrumbs */}
              <div className="flex-1 min-w-0">
                {config.breadcrumbs.length > 0 && (
                  <Breadcrumb>
                    <BreadcrumbList className="text-xs">
                      <BreadcrumbItem>
                        <SidebarTrigger className="h-3 w-3" />
                      </BreadcrumbItem>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link href="/home">
                            <Home className="h-3 w-3" />
                          </Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {config.breadcrumbs.map((crumb, index) => (
                        <div key={crumb.href} className="flex items-center gap-1.5">
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            {index === config.breadcrumbs.length - 1 ? (
                              <BreadcrumbPage className="text-xs">{crumb.label}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link href={crumb.href} className="text-xs">{crumb.label}</Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </div>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                )}
                {config.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {config.description}
                  </p>
                )}
              </div>

              {/* Right side - Icons */}
              <div className="flex items-center gap-2">
                <NotificationCenter />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}