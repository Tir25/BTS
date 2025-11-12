import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '../utils/logger';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('ui-theme');
    if (stored === 'light' || stored === 'dark') return stored as Theme;
  } catch (error) {
    logger.warn('Failed to read persisted theme, falling back to system preference.', 'theme-context', { error });
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyThemeClass(theme);
    try {
      localStorage.setItem('ui-theme', theme);
    } catch (error) {
      logger.warn('Failed to persist theme preference.', 'theme-context', { error });
    }
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const stored = localStorage.getItem('ui-theme');
      if (stored !== 'light' && stored !== 'dark') {
        setThemeState(media.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

