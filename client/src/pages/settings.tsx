import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/dark-mode-context";
import { useAccessibility } from "@/components/accessibility-provider";
import { 
  User, 
  Palette, 
  Download, 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Eye, 
  Type,
  Zap,
  FileJson,
  FileText,
  FileSpreadsheet
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDark, toggleDark } = useDarkMode();
  const { highContrast, fontSize, reducedMotion, toggleHighContrast, setFontSize, toggleReducedMotion } = useAccessibility();

  // Profile state
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences state
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [goalReminders, setGoalReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [savingsRecommendations, setSavingsRecommendations] = useState(true);
  
  // Alert preferences state
  const [showInsufficientFundsWarning, setShowInsufficientFundsWarning] = useState(true);
  const [showBudgetOverspendWarning, setShowBudgetOverspendWarning] = useState(true);
  const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(true);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState("100");

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
  });

  // Fetch user preferences
  const { data: preferences } = useQuery({
    queryKey: ["/api/users/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/users/preferences", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const data = await res.json();
      // Set notification states from preferences
      if (data.settings) {
        setBudgetAlerts(data.settings.budgetAlerts ?? true);
        setGoalReminders(data.settings.goalReminders ?? true);
        setWeeklyReport(data.settings.weeklyReport ?? false);
        setSavingsRecommendations(data.settings.savingsRecommendations ?? true);
      }
      // Set alert preferences from database fields
      setShowInsufficientFundsWarning(data.showInsufficientFundsWarning ?? true);
      setShowBudgetOverspendWarning(data.showBudgetOverspendWarning ?? true);
      setShowLowBalanceWarning(data.showLowBalanceWarning ?? true);
      setLowBalanceThreshold(data.lowBalanceThreshold ?? "100");
      return data;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string }) => {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (settings: any) => {
      const res = await fetch("/api/users/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/preferences"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = () => {
    const updates: { email?: string; password?: string } = {};

    if (email && email !== userData?.email) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
      updates.email = email;
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure both passwords are the same",
          variant: "destructive",
        });
        return;
      }
      if (newPassword.length < 6) {
        toast({
          title: "Password too short",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        return;
      }
      updates.password = newPassword;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: "No changes",
        description: "Please make changes before saving",
      });
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const handleSaveNotifications = () => {
    updatePreferencesMutation.mutate({
      budgetAlerts,
      goalReminders,
      weeklyReport,
      savingsRecommendations,
      showInsufficientFundsWarning,
      showBudgetOverspendWarning,
      showLowBalanceWarning,
      lowBalanceThreshold,
    });
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const res = await fetch(`/api/export/${format}`, { 
        credentials: "include" 
      });
      
      if (!res.ok) throw new Error(`Export failed`);

      if (format === 'json') {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Export successful",
        description: `Your data has been exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div>
          <h1 className="text-display-xl md:text-display-2xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-body-md text-muted-foreground">
            Manage your account preferences and settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2" data-testid="tab-appearance">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2" data-testid="tab-notifications">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2" data-testid="tab-data">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your email and password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={userData?.username || ""}
                    disabled
                    className="bg-muted"
                    data-testid="input-username"
                  />
                  <p className="text-sm text-muted-foreground">
                    Username cannot be changed
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={userData?.email || "Enter new email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                  />
                  <p className="text-sm text-muted-foreground">
                    Current: {userData?.email}
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Change Password</h3>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>

                <Button
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme & Display
                </CardTitle>
                <CardDescription>
                  Customize how the app looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isDark ? "Using dark theme" : "Using light theme"}
                    </p>
                  </div>
                  <Switch
                    checked={isDark}
                    onCheckedChange={toggleDark}
                    data-testid="switch-dark-mode"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      High Contrast
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch
                    checked={highContrast}
                    onCheckedChange={toggleHighContrast}
                    data-testid="switch-high-contrast"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="font-size" className="text-base flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Font Size
                  </Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger id="font-size" data-testid="select-font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="x-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Adjust text size for better readability
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Reduced Motion
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch
                    checked={reducedMotion}
                    onCheckedChange={toggleReducedMotion}
                    data-testid="switch-reduced-motion"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what updates you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when approaching budget limits
                    </p>
                  </div>
                  <Switch
                    checked={budgetAlerts}
                    onCheckedChange={setBudgetAlerts}
                    data-testid="switch-budget-alerts"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Goal Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminders about your financial goals progress
                    </p>
                  </div>
                  <Switch
                    checked={goalReminders}
                    onCheckedChange={setGoalReminders}
                    data-testid="switch-goal-reminders"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly spending summary
                    </p>
                  </div>
                  <Switch
                    checked={weeklyReport}
                    onCheckedChange={setWeeklyReport}
                    data-testid="switch-weekly-report"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Savings Recommendations</Label>
                    <p className="text-sm text-muted-foreground">
                      AI-powered tips to save money
                    </p>
                  </div>
                  <Switch
                    checked={savingsRecommendations}
                    onCheckedChange={setSavingsRecommendations}
                    data-testid="switch-savings-recommendations"
                  />
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-semibold mb-4">Transaction Alerts</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Insufficient Funds Warning</Label>
                        <p className="text-sm text-muted-foreground">
                          Warn when making a purchase without enough balance
                        </p>
                      </div>
                      <Switch
                        checked={showInsufficientFundsWarning}
                        onCheckedChange={setShowInsufficientFundsWarning}
                        data-testid="switch-insufficient-funds-warning"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Budget Overspend Warning</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when a transaction would exceed budget limits
                        </p>
                      </div>
                      <Switch
                        checked={showBudgetOverspendWarning}
                        onCheckedChange={setShowBudgetOverspendWarning}
                        data-testid="switch-budget-overspend-warning"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Low Balance Notification</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify when account balance falls below threshold
                          </p>
                        </div>
                        <Switch
                          checked={showLowBalanceWarning}
                          onCheckedChange={setShowLowBalanceWarning}
                          data-testid="switch-low-balance-warning"
                        />
                      </div>
                      {showLowBalanceWarning && (
                        <div className="space-y-2 ml-0">
                          <Label htmlFor="low-balance-threshold">Threshold Amount ($)</Label>
                          <Input
                            id="low-balance-threshold"
                            type="number"
                            step="0.01"
                            min="0"
                            value={lowBalanceThreshold}
                            onChange={(e) => setLowBalanceThreshold(e.target.value)}
                            className="max-w-xs"
                            data-testid="input-low-balance-threshold"
                          />
                          <p className="text-xs text-muted-foreground">
                            You'll be notified when your balance drops below this amount
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveNotifications}
                  disabled={updatePreferencesMutation.isPending}
                  data-testid="button-save-notifications"
                >
                  {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Export Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Your Data
                </CardTitle>
                <CardDescription>
                  Download your financial data in various formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 border rounded-lg hover-elevate">
                    <div className="flex gap-3">
                      <FileJson className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold">Complete Data (JSON)</h3>
                        <p className="text-sm text-muted-foreground">
                          Export all your data including accounts, transactions, budgets, and goals
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('json')}
                      data-testid="button-export-json"
                    >
                      Download
                    </Button>
                  </div>

                  <div className="flex items-start justify-between p-4 border rounded-lg hover-elevate">
                    <div className="flex gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold">Transactions (CSV)</h3>
                        <p className="text-sm text-muted-foreground">
                          Export transaction history for spreadsheet analysis
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv')}
                      data-testid="button-export-csv"
                    >
                      Download
                    </Button>
                  </div>

                  <div className="flex items-start justify-between p-4 border rounded-lg hover-elevate">
                    <div className="flex gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold">Financial Report (Text)</h3>
                        <p className="text-sm text-muted-foreground">
                          Generate a comprehensive financial summary report
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('pdf')}
                      data-testid="button-export-pdf"
                    >
                      Download
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Data Privacy
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your financial data is stored securely and never shared with third parties. 
                    You can export your data at any time and delete your account from the Profile tab.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
