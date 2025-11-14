
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfServicePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => setLocation('/settings')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Settings
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <h2>Agreement to Terms</h2>
          <p>
            By accessing and using FinanceFlow, you agree to be bound by these Terms of Service and all applicable laws and regulations.
          </p>

          <h3>Use of Service</h3>
          <p>
            FinanceFlow is a personal finance management tool designed to help you track expenses, create budgets, and gain financial insights.
          </p>

          <h4>You agree to:</h4>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Keep your account credentials secure</li>
            <li>Use the service for lawful purposes only</li>
            <li>Not attempt to compromise the security of the service</li>
          </ul>

          <h3>Financial Information Disclaimer</h3>
          <p>
            <strong>Important:</strong> FinanceFlow provides tools and AI-powered insights to help you manage your finances, but:
          </p>
          <ul>
            <li>We are not financial advisors and do not provide professional financial advice</li>
            <li>AI insights are suggestions based on your spending patterns, not professional recommendations</li>
            <li>You are responsible for all financial decisions you make</li>
            <li>Always consult with a qualified financial professional for important financial decisions</li>
          </ul>

          <h3>Data Accuracy</h3>
          <p>
            While we strive to provide accurate calculations and insights, you are responsible for:
          </p>
          <ul>
            <li>Verifying all financial data entered into the app</li>
            <li>Regularly reconciling your accounts</li>
            <li>Maintaining backup records of important financial information</li>
          </ul>

          <h3>Intellectual Property</h3>
          <p>
            The FinanceFlow service, including all content, features, and functionality, is owned by us and protected by copyright, trademark, and other intellectual property laws.
          </p>

          <h3>Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, FinanceFlow shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
          </p>

          <h3>Service Availability</h3>
          <p>
            We strive to provide reliable service, but:
          </p>
          <ul>
            <li>We do not guarantee uninterrupted access</li>
            <li>We may modify or discontinue features with notice</li>
            <li>We may perform maintenance that temporarily affects availability</li>
          </ul>

          <h3>User Content</h3>
          <p>
            You retain ownership of all financial data you enter into FinanceFlow. By using the service, you grant us permission to process this data to provide the service and AI insights.
          </p>

          <h3>Account Termination</h3>
          <p>
            You may close your account at any time. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>

          <h3>Changes to Terms</h3>
          <p>
            We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
          </p>

          <h3>Governing Law</h3>
          <p>
            These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
          </p>

          <h3>Contact</h3>
          <p>
            Questions about these terms? Contact us through the app settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
