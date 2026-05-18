/**
 * TypeScript type definitions for the theme system
 * Use these if you convert your project to TypeScript
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  // Current theme preference
  theme: ThemeMode;
  
  // What theme is actually being used (resolved)
  resolvedTheme: ResolvedTheme;
  
  // Convenience boolean
  isDark: boolean;
  isLight: boolean;
  
  // Has theme loaded from storage
  isLoaded: boolean;
  
  // Cycle theme: light -> dark -> auto -> light
  toggleTheme: () => void;
  
  // Set specific theme
  setTheme: (theme: ThemeMode) => void;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export interface ThemeAwareCardProps {
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'muted';
  className?: string;
}
