import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export const ThemeToggle = ({ className = '', showLabel = true }) => {
  const { theme, toggleTheme, resolvedTheme } = useTheme();

  const getIcon = () => {
    if (resolvedTheme === 'dark') {
      return <MoonIcon className="w-8 h-8 text-white" aria-hidden="true" />;
    }
    return <SunIcon className="w-8 h-8 text-white" aria-hidden="true" />;
  };

  const getLabel = () => {
    return theme === 'dark' ? 'Dark mode' : 'Light mode';
  };

  const getNextLabel = () => {
    return theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center relative group p-2 rounded-full bg-transparent border-0 shadow-none text-white transition-colors duration-200 hover:bg-red-900 dark:hover:bg-[#ffffff44] backdrop-blur-sm focus:outline-none ${className}`}
      aria-label={getNextLabel()}
      title={showLabel ? getLabel() : getNextLabel()}
      type="button"
    >
      <span className="transition-transform duration-200 inline-flex group-hover:scale-110">
        {getIcon()}
      </span>
      {showLabel && (
        <span className="text-sm font-medium hidden sm:inline">{getLabel()}</span>
      )}
    </button>
  );
};

export default ThemeToggle;
