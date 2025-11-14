import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/contexts/dark-mode-context";

export function ThemeToggle() {
  const { isDark, toggleDark } = useDarkMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDark}
      data-testid="button-theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
