import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import * as React from "react";
import { DarkModeProvider } from "./contexts/dark-mode-context";
import { AccessibilityProvider } from "./components/accessibility-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { MobileHeader } from "./components/mobile-header";
import { MobileBottomNav } from "./components/mobile-bottom-nav";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/error-boundary";
import type { UserPreferences } from "@shared/schema";
import { BackgroundWrapper } from "./components/background-wrapper";

const InstallPromptBanner = React.lazy(() => import("./components/install-prompt-banner").then(m => ({ default: m.InstallPromptBanner })));
const PushNotificationHandler = React.lazy(() => import("./components/push-notification-handler").then(m => ({ default: m.PushNotificationHandler })));

// Lazy load pages for better performance
const Landing = React.lazy(() => import("./pages/landing"));
const Home = React.lazy(() => import("./pages/home"));
const Auth = React.lazy(() => import("./pages/auth"));
const Dashboard = React.lazy(() => import("./pages/dashboard"));
const Transactions = React.lazy(() => import("./pages/transactions"));
const Accounts = React.lazy(() => import("./pages/accounts"));
const Budget = React.lazy(() => import("./pages/budget"));
const BudgetWizard = React.lazy(() => import("./pages/budget-wizard"));
const BudgetExecution = React.lazy(() => import("./pages/budget-execution"));
const Goals = React.lazy(() => import("./pages/goals"));
const BalanceSheet = React.lazy(() => import("./pages/balance-sheet"));
const CashFlow = React.lazy(() => import("./pages/cash-flow"));
const Profile = React.lazy(() => import("./pages/profile"));
const Settings = React.lazy(() => import("./pages/settings"));
const Learn = React.lazy(() => import("./pages/learn"));
const LessonViewer = React.lazy(() => import("./pages/lesson-viewer"));
const Items = React.lazy(() => import("./pages/items"));
const Debts = React.lazy(() => import("./pages/debts"));
const DebtDetail = React.lazy(() => import("./pages/debt-detail"));
const DebtDashboard = React.lazy(() => import("./pages/debt-dashboard"));
const Onboarding = React.lazy(() => import("./pages/onboarding"));
const PrivacyPolicy = React.lazy(() => import("./pages/privacy-policy"));
const TermsOfService = React.lazy(() => import("./pages/terms-of-service"));
const NotFound = React.lazy(() => import("./pages/not-found"));

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [currentLocation] = useLocation();
  const [, setLocation] = useLocation();

  // Fetch user preferences to check onboarding status
  const { data: preferences, isLoading: prefsLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/users/preferences"],
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: 0,
    gcTime: 0, // Don't cache at all
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (!isLoading && !prefsLoading && user && preferences) {
      const isOnboardingPage = currentLocation === "/onboarding";
      if (!preferences.hasCompletedOnboarding && !isOnboardingPage) {
        setLocation("/onboarding");
      }
    }
  }, [user, isLoading, prefsLoading, preferences, currentLocation, setLocation]);

  if (isLoading || prefsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect logic for root path - send authenticated users to home
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath === '/' && !isLoading && user) {
      setLocation('/home');
    }
  }, [user, isLoading, setLocation]);

  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/home" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={Transactions} />} />
      <Route path="/accounts" component={() => <ProtectedRoute component={Accounts} />} />
      <Route path="/budget" component={() => <ProtectedRoute component={Budget} />} />
      <Route path="/budget/new" component={() => <ProtectedRoute component={BudgetWizard} />} />
      <Route path="/budget-wizard" component={() => <ProtectedRoute component={BudgetWizard} />} />
      <Route path="/budgets/:budgetId/shop" component={() => <ProtectedRoute component={BudgetExecution} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
      <Route path="/balance-sheet" component={() => <ProtectedRoute component={BalanceSheet} />} />
      <Route path="/cash-flow" component={() => <ProtectedRoute component={CashFlow} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/learn" component={() => <ProtectedRoute component={Learn} />} />
      <Route path="/learn/:lessonId" component={() => <ProtectedRoute component={LessonViewer} />} />
      <Route path="/items" component={() => <ProtectedRoute component={Items} />} />
      <Route path="/debts/:id" component={() => <ProtectedRoute component={DebtDetail} />} />
      <Route path="/debts" component={() => <ProtectedRoute component={Debts} />} />
      <Route path="/debt-dashboard" component={() => <ProtectedRoute component={DebtDashboard} />} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route component={NotFound} />
    </Switch>
    </React.Suspense>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentLocation] = useLocation();

  const isAuthPage = currentLocation === "/auth";
  const isLandingPage = currentLocation === "/";
  const isPublicPage = currentLocation === "/privacy" || currentLocation === "/terms";

  // Redirect to landing page if not logged in and on a protected route
  useEffect(() => {
    if (!isLoading && !user && !isAuthPage && !isPublicPage && !isLandingPage) {
      setLocation("/");
    }
  }, [user, isLoading, currentLocation, isAuthPage, isPublicPage, isLandingPage, setLocation]);

  if (isAuthPage || isPublicPage || isLandingPage) {
    return <Router />;
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <BackgroundWrapper>
      <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:pt-0">
            <Router />
          </main>
          <MobileBottomNav />
        </div>
      </SidebarProvider>
    </BackgroundWrapper>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DarkModeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <React.Suspense fallback={null}>
                <PushNotificationHandler />
                <InstallPromptBanner />
              </React.Suspense>
              <AppContent />
              <Toaster />
            </AuthProvider>
          </AccessibilityProvider>
        </DarkModeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;