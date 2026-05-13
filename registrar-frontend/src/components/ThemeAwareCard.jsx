import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeUtils';

/**
 * Example component showing advanced theme usage
 * This demonstrates conditional rendering, theme-aware colors, and accessibility
 */
export const ThemeAwareCard = ({ 
  title, 
  children, 
  variant = 'default',
  className = '' 
}) => {
  const { isDark, theme, resolvedTheme } = useTheme();
  const colors = useThemeColors();

  const variantStyles = {
    default: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    elevated: 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-lg',
    muted: 'bg-gray-100 dark:bg-slate-950 border-gray-300 dark:border-slate-700',
  };

  return (
    <div
      className={`
        p-6 rounded-lg border transition-all duration-200
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>
      <div className="text-gray-700 dark:text-gray-300">
        {children}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
        Current theme: <strong>{theme}</strong> 
        {theme === 'auto' && ` (resolved: ${resolvedTheme})`}
      </div>
    </div>
  );
};

export default ThemeAwareCard;
