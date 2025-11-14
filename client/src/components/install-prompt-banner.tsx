
import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

export function InstallPromptBanner() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) return null;

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsDismissed(true);
    }
  };

  return (
    <Card className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 shadow-lg border-primary/20 bg-card">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install App</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Add PersonalFinance Pro to your home screen for quick access and offline support
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleInstall}>
              Install Now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsDismissed(true)}>
              Maybe Later
            </Button>
          </div>
        </div>
        <button 
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-muted rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
