
import { createContext, useContext, useState, useEffect } from "react";

interface AccessibilityContextType {
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'x-large';
  reducedMotion: boolean;
  toggleHighContrast: () => void;
  setFontSize: (size: 'normal' | 'large' | 'x-large') => void;
  toggleReducedMotion: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('highContrast') === 'true';
  });
  const [fontSize, setFontSizeState] = useState<'normal' | 'large' | 'x-large'>(() => {
    return (localStorage.getItem('fontSize') as any) || 'normal';
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    const stored = localStorage.getItem('reducedMotion');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('highContrast', String(highContrast));

    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('fontSize', fontSize);

    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    localStorage.setItem('reducedMotion', String(reducedMotion));
  }, [highContrast, fontSize, reducedMotion]);

  const toggleHighContrast = () => setHighContrast(!highContrast);
  const setFontSize = (size: 'normal' | 'large' | 'x-large') => setFontSizeState(size);
  const toggleReducedMotion = () => setReducedMotion(!reducedMotion);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        fontSize,
        reducedMotion,
        toggleHighContrast,
        setFontSize,
        toggleReducedMotion,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
