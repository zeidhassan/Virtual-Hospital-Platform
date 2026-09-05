import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export const ThemeContext = createContext(null);

const getStoredTheme = () => {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
};

// Single source of truth for the app's theme. index.html applies the saved
// theme synchronously before first paint (no flash); this provider owns the
// state afterwards so every component reads/toggles the same value instead
// of each page carrying its own copy of the toggle logic.
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore (private browsing, storage disabled, etc.) */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
