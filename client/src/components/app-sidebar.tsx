import { Home, Wallet, Receipt, PieChart, BarChart3, Target, LogOut, FileText, Shield, BookOpen, User, CreditCard, Package, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Budget", url: "/budget", icon: PieChart },
];

const toolsMenuItems = [
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Accounts", url: "/accounts", icon: Wallet },
  { title: "Debts", url: "/debts", icon: CreditCard },
  { title: "Items", url: "/items", icon: Package },
  { title: "Learn", url: "/learn", icon: BookOpen },
];

const advancedMenuItems: Array<{ title: string; url: string; icon: any }> = [];

const reportsItems = [
  { title: "Balance Sheet", url: "/balance-sheet", icon: BarChart3 },
  { title: "Cash Flow", url: "/cash-flow", icon: BarChart3 },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [advancedMode, setAdvancedMode] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const { logout } = useAuth();
  const { setOpenMobile, openMobile, isMobile } = useSidebar();

  useEffect(() => {
    setAdvancedMode(localStorage.getItem('advancedMode') === 'true');
  }, []);

  const handleSignOut = async () => {
    await logout();
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay with blur - matches dialog style for both desktop and mobile */}
      {openMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={() => setOpenMobile(false)}
          aria-hidden="true"
          data-state={openMobile ? "open" : "closed"}
        />
      )}

      <Sidebar collapsible="offcanvas" className="backdrop-blur-xl bg-sidebar/80 border-r border-sidebar-border/50 min-w-fit z-50">
      <SidebarHeader className="border-b border-sidebar-border/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary/90 rounded backdrop-blur-sm">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="md:block hidden">
              <h1 className="font-semibold text-sm text-sidebar-foreground whitespace-nowrap">PersonalFinance Pro</h1>
              <p className="text-xs text-sidebar-foreground/50 whitespace-nowrap">Professional Accounting</p>
            </div>
            <div className="md:hidden block">
              <h1 className="font-semibold text-xs text-sidebar-foreground whitespace-nowrap">PF Pro</h1>
            </div>
          </div>
          <SidebarTrigger className="h-7 w-7" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                    className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                  >
                    <Link href={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                    className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                  >
                    <Link href={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/profile"}
                  data-testid="nav-profile"
                  className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                >
                  <Link href="/profile" onClick={handleNavClick}>
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/settings"}
                  data-testid="nav-settings"
                  className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                >
                  <Link href="/settings" onClick={handleNavClick}>
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/privacy"}
                  data-testid="nav-privacy"
                  className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                >
                  <Link href="/privacy" onClick={handleNavClick}>
                    <Shield className="h-4 w-4" />
                    <span>Privacy</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/terms"}
                  data-testid="nav-terms"
                  className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                >
                  <Link href="/terms" onClick={handleNavClick}>
                    <FileText className="h-4 w-4" />
                    <span>Terms</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {advancedMode && (
          <>
            <SidebarGroup className="py-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  {advancedMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={`nav-${item.title.toLowerCase()}`}
                        className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                      >
                        <Link href={item.url} onClick={handleNavClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="py-1">
              <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1 text-xs whitespace-nowrap">
                    <span className="text-sidebar-foreground/70">Reports</span>
                    <ChevronRight className={`h-3 w-3 transition-transform ${reportsOpen ? 'rotate-90' : ''}`} />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {reportsItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === item.url}
                            data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                            className="h-8 text-xs px-2 py-1 whitespace-nowrap"
                          >
                            <Link href={item.url} onClick={handleNavClick}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </>
        )}

        </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/30 backdrop-blur-md bg-sidebar/80 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} data-testid="button-signout" className="h-7 text-xs px-2 py-1 whitespace-nowrap">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}