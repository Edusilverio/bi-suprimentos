import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const migrated = localStorage.getItem('theme-default-light-v1');
      const storedTheme = localStorage.getItem('theme') as Theme | null;

      if (!migrated) {
        localStorage.setItem('theme-default-light-v1', 'true');
        localStorage.setItem('theme', 'light');
        return 'light';
      }

      return storedTheme || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
}
