import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, TrendingUp, Award, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/queryClient";

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userApiData } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const res = await fetchApi("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string }) => {
      const res = await fetchApi("/api/users/me", {
        method: "PUT",
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
      setEditing(false);
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

  const handleUpdateProfile = () => {
    const updates: { email?: string; password?: string } = {};

    if (email && email !== userApiData?.email) {
      updates.email = email;
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords don't match",
          variant: "destructive",
        });
        return;
      }
      if (newPassword.length < 6) {
        toast({
          title: "Error",
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
        description: "No changes to save",
      });
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const stats = {
    accountsManaged: 8,
    transactionsLogged: 247,
    goalsAchieved: 2,
    daysActive: 45,
    savingsRate: 18.5,
    streak: 12
  };

  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ['/api/achievements'],
  });

  if (!userApiData) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div>
          <h1 className="text-display-xl md:text-display-2xl font-bold text-foreground">Your Profile</h1>
          <p className="text-body-md text-muted-foreground">
            Manage your account and track your financial journey
          </p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-2xl">
                  {userApiData.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{userApiData.username}</h2>
              <p className="text-sm text-muted-foreground">{userApiData.email}</p>
              {userApiData.username === 'demo' && (
                <div className="mt-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  Demo Mode
                </div>
              )}
            </div>

            <Separator />

            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={userApiData.email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="New email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    <Lock className="h-4 w-4 inline mr-2" />
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>

                {newPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpdateProfile} 
                    className="flex-1"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditing(false);
                      setEmail("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Member since {new Date(userApiData.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span>{stats.daysActive} days active</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="h-4 w-4 text-gold" />
                    <span>{stats.streak} day streak 🔥</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              </>
            )}

            <Separator />

            {/* Export Data Section */}
            <div className="space-y-2">
              <h3 className="font-semibold">Export Data</h3>
              <p className="text-sm text-muted-foreground">
                Download all your financial data
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetchApi('/api/export/json');
                      const data = await response.json();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      toast({ title: "Data exported successfully" });
                    } catch (error: any) {
                      toast({ title: "Export failed", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  Export as JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetchApi('/api/export/csv');
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      toast({ title: "CSV exported successfully" });
                    } catch (error: any) {
                      toast({ title: "Export failed", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetchApi('/api/export/pdf');
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.txt`;
                      a.click();
                      toast({ title: "Report exported successfully" });
                    } catch (error: any) {
                      toast({ title: "Export failed", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  Export Report
                </Button>
              </div>
            </div>

            <Button variant="destructive" className="w-full" onClick={logout}>
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Stats & Achievements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Your Financial Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Accounts</p>
                  <p className="text-2xl font-bold">{stats.accountsManaged}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{stats.transactionsLogged}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Goals Achieved</p>
                  <p className="text-2xl font-bold">{stats.goalsAchieved}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Savings Rate</p>
                  <p className="text-2xl font-bold">{stats.savingsRate}%</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Active Streak</p>
                  <p className="text-2xl font-bold">{stats.streak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {achievementsLoading ? (
                  <div>Loading achievements...</div>
                ) : achievements.length === 0 ? (
                  <div>No achievements yet.</div>
                ) : (
                  achievements.map((achievement: any, i: number) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${
                        achievement.earned ? 'bg-success/10 border-success/20' : 'bg-muted/30 border-border opacity-60'
                      }`}
                    >
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <p className="font-semibold text-sm">{achievement.title}</p>
                      {achievement.description && (
                        <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}