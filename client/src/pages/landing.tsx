
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, Target, DollarSign, BarChart3, Shield } from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-primary rounded-lg">
              <Wallet className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              PersonalFinance Pro
            </h1>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Professional Accounting for Personal Wealth
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Take control of your finances with double-entry bookkeeping, 
            intelligent budgeting, and AI-powered insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-6xl mx-auto">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Double-Entry Bookkeeping</h3>
              <p className="text-muted-foreground">
                Track every penny with professional accounting precision. 
                See exactly where your money comes from and where it goes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-accent/10 rounded-lg w-fit">
                <Target className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Smart Budgeting</h3>
              <p className="text-muted-foreground">
                Create detailed budgets, track spending in real-time, 
                and get alerts when you're approaching limits.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-purple-500/10 rounded-lg w-fit">
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold">AI-Powered Insights</h3>
              <p className="text-muted-foreground">
                Get personalized savings recommendations and financial 
                guidance powered by artificial intelligence.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-green-500/10 rounded-lg w-fit">
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold">Financial Analytics</h3>
              <p className="text-muted-foreground">
                Visualize your financial health with comprehensive 
                reports, charts, and trend analysis.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-blue-500/10 rounded-lg w-fit">
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your financial data is encrypted and stored securely. 
                We never share your information with third parties.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-orange-500/10 rounded-lg w-fit">
                <Target className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold">Goal Tracking</h3>
              <p className="text-muted-foreground">
                Set financial goals and track your progress. 
                Stay motivated with visual progress indicators.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20 space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to Master Your Finances?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of users who have taken control of their financial future.
          </p>
          <Link href="/auth">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Your Journey Today
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
