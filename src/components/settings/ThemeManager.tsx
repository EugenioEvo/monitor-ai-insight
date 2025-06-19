
import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

export const ThemeManager = () => {
  const { settings } = useSettings();

  useEffect(() => {
    const theme = settings.general.theme;
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      root.classList.add(theme);
    }
  }, [settings.general.theme]);

  return null;
};
