import { useState, useEffect, useCallback } from 'react';
import { ThemeContext } from './ThemeContext';

const STORAGE_KEY = 'theme-preference';
const THEME_VALUES = {
  LIGHT: 'light',
  DARK: 'dark',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEME_VALUES.LIGHT);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize theme from localStorage and system preference
  useEffect(() => {
    const initializeTheme = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) || THEME_VALUES.LIGHT;
        setTheme(stored);
        applyTheme(stored);
      } catch (error) {
        console.error('Failed to initialize theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    initializeTheme();
  }, []);

  // No system preference handling — only explicit light/dark modes

  const applyTheme = useCallback((themeToApply) => {
    const html = document.documentElement;
    const isDark = themeToApply === THEME_VALUES.DARK;

    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Update color-scheme CSS property for native elements
    html.style.colorScheme = themeToApply;
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === THEME_VALUES.LIGHT ? THEME_VALUES.DARK : THEME_VALUES.LIGHT;
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
      return newTheme;
    });
  }, []);

  // Apply theme whenever selected theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setThemeMode = useCallback((newTheme) => {
    if (!Object.values(THEME_VALUES).includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}`);
      return;
    }

    setTheme(newTheme);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [applyTheme]);

  const resolvedTheme = theme;

  const value = {
    theme,
    resolvedTheme,
    toggleTheme,
    setTheme: setThemeMode,
    isDark: theme === THEME_VALUES.DARK,
    isLight: theme === THEME_VALUES.LIGHT,
    isLoaded,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
