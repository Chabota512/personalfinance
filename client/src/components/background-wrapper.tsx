import { useDarkMode } from "@/contexts/dark-mode-context";
const lightBg = '/backgrounds/light-mode-bg.jpg';
const darkBg = '/backgrounds/dark-mode-bg.jpg';

export function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  const { isDark } = useDarkMode();

  return (
    <div className="relative min-h-screen">
      <div 
        className="fixed inset-0 z-0 transition-opacity duration-500"
        style={{
          backgroundImage: `url(${isDark ? darkBg : lightBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: 'hsl(var(--background))',
        }}
      />
      <div className="fixed inset-0 z-0 bg-background/20" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}