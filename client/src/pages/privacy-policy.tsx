
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicyPage() {
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
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <h2>Your Privacy Matters</h2>
          <p>
            FinanceFlow is committed to protecting your financial privacy. This policy explains how we collect, use, and protect your personal information.
          </p>

          <h3>Information We Collect</h3>
          <ul>
            <li><strong>Financial Data:</strong> Transaction details, account balances, budgets, and goals you enter</li>
            <li><strong>Usage Data:</strong> How you interact with the app to improve our service</li>
            <li><strong>Device Information:</strong> Basic device and browser information for compatibility</li>
          </ul>

          <h3>How We Use Your Data</h3>
          <ul>
            <li><strong>AI Insights:</strong> Your transaction data is processed by Google Gemini AI to provide personalized financial insights. This processing happens securely and your data is not used to train AI models.</li>
            <li><strong>Local Storage:</strong> Most of your data is stored locally in your browser and on our secure servers</li>
            <li><strong>Analytics:</strong> We analyze usage patterns to improve the app experience</li>
          </ul>

          <h3>Data Storage & Security</h3>
          <ul>
            <li>All financial data is encrypted in transit and at rest</li>
            <li>We use industry-standard security practices to protect your information</li>
            <li>Your data is stored on secure servers with regular backups</li>
            <li>We never sell or share your personal financial data with third parties</li>
          </ul>

          <h3>Voice Notes</h3>
          <p>
            If you use voice notes for transaction descriptions, audio is processed using your browser's speech-to-text capability or sent securely to our servers for transcription. Audio files are not permanently stored.
          </p>

          <h3>Your Rights</h3>
          <ul>
            <li>Access your data at any time</li>
            <li>Export your data in standard formats</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Opt out of AI-powered insights</li>
          </ul>

          <h3>Third-Party Services</h3>
          <p>
            We use the following third-party services:
          </p>
          <ul>
            <li><strong>Google Gemini AI:</strong> For generating financial insights (optional feature)</li>
            <li><strong>Neon Database:</strong> For secure data storage</li>
          </ul>

          <h3>Children's Privacy</h3>
          <p>
            FinanceFlow is not intended for users under 13 years of age. We do not knowingly collect information from children.
          </p>

          <h3>Changes to This Policy</h3>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by updating the "Last updated" date.
          </p>

          <h3>Contact Us</h3>
          <p>
            If you have questions about this privacy policy or your data, please contact us through the app settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
