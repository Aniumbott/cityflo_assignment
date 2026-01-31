import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme-mode';

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getSystemPreference();
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  });

  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(mode));

  // Apply dark class to <html> element
  useEffect(() => {
    const r = resolveTheme(mode);
    setResolved(r);
    document.documentElement.classList.toggle('dark', r === 'dark');
  }, [mode]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function handler() {
      const r = resolveTheme('system');
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
    }
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, newMode);
    setModeState(newMode);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
