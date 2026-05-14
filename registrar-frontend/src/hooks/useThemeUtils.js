import { useTheme } from '../context/ThemeContext';

/**
 * Hook to conditionally render elements or CSS classes based on theme
 * Useful for components that need theme-aware styling
 */
export const useThemeValue = (lightValue, darkValue) => {
  const { isDark } = useTheme();
  return isDark ? darkValue : lightValue;
};

/**
 * Hook to get theme-aware colors
 * Useful for charts, dynamically colored elements
 */
export const useThemeColors = () => {
  const { isDark } = useTheme();
  
  return {
    primary: isDark ? '#3b82f6' : '#1e40af',
    secondary: isDark ? '#64748b' : '#475569',
    background: isDark ? '#0f172a' : '#ffffff',
    surface: isDark ? '#1e293b' : '#f1f5f9',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textSecondary: isDark ? '#cbd5e1' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    success: isDark ? '#22c55e' : '#16a34a',
    error: isDark ? '#ef4444' : '#dc2626',
    warning: isDark ? '#f59e0b' : '#d97706',
  };
};

/**
 * Hook to detect if theme has loaded
 * Useful for preventing flash of incorrect theme
 */
export const useThemeLoaded = () => {
  const { isLoaded } = useTheme();
  return isLoaded;
};

export default useTheme;
