import { useTheme } from '../context/ThemeContext';
import { useThemeColors, useThemeLoaded } from '../hooks/useThemeUtils';

/**
 * Complete example component demonstrating all dark mode features
 * Shows best practices for creating theme-aware components
 */
export const ThemeShowcase = () => {
  const { theme, resolvedTheme, isDark, isLight, toggleTheme, setTheme, isLoaded } = useTheme();
  const colors = useThemeColors();
  const themeLoaded = useThemeLoaded();

  if (!themeLoaded) {
    return <div>Loading theme...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Dark Mode Showcase
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This component demonstrates all dark mode features
        </p>
      </div>

      {/* Theme Status */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatusCard
          label="Current Theme"
          value={theme}
          color="bg-blue-100 dark:bg-blue-900"
        />
        <StatusCard
          label="Resolved Theme"
          value={resolvedTheme}
          color="bg-purple-100 dark:bg-purple-900"
        />
        <StatusCard
          label="Mode"
          value={isDark ? 'Dark' : 'Light'}
          color={isDark ? 'bg-slate-100 dark:bg-slate-800' : 'bg-yellow-100 dark:bg-yellow-900'}
        />
      </div>

      {/* Control Buttons */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Theme Controls
        </h2>
        <div className="flex flex-wrap gap-3">
          <ThemeButton
            label="Light"
            isActive={theme === 'light'}
            onClick={() => setTheme('light')}
          />
          <ThemeButton
            label="Dark"
            isActive={theme === 'dark'}
            onClick={() => setTheme('dark')}
          />
          <ThemeButton
            label="Auto"
            isActive={theme === 'auto'}
            onClick={() => setTheme('auto')}
          />
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            Toggle Theme
          </button>
        </div>
      </div>

      {/* Color Palette */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Theme-Aware Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ColorSwatch name="Primary" color={colors.primary} />
          <ColorSwatch name="Secondary" color={colors.secondary} />
          <ColorSwatch name="Success" color={colors.success} />
          <ColorSwatch name="Error" color={colors.error} />
          <ColorSwatch name="Warning" color={colors.warning} />
        </div>
      </div>

      {/* Component Examples */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Styled Components
        </h2>
        
        <div className="space-y-4">
          {/* Card with border */}
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 transition-colors duration-200">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Card with Border
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              This card demonstrates border transitions
            </p>
          </div>

          {/* Elevated card */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 shadow-sm dark:shadow-lg transition-colors duration-200">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Elevated Card
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              This card has shadows that adapt to the theme
            </p>
          </div>

          {/* Badge examples */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-full text-sm transition-colors duration-200">
              Info
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-full text-sm transition-colors duration-200">
              Success
            </span>
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 rounded-full text-sm transition-colors duration-200">
              Warning
            </span>
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-full text-sm transition-colors duration-200">
              Error
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusCard = ({ label, value, color }) => (
  <div className={`${color} rounded-lg p-4 transition-colors duration-200`}>
    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
      {value}
    </p>
  </div>
);

const ThemeButton = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg font-medium transition-all
      ${
        isActive
          ? 'bg-blue-500 text-white shadow-lg'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
      }
    `}
  >
    {label}
  </button>
);

const ColorSwatch = ({ name, color }) => (
  <div className="flex flex-col items-center">
    <div
      className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700 mb-2 transition-colors duration-200"
      style={{ backgroundColor: color }}
    />
    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{name}</p>
  </div>
);

export default ThemeShowcase;
