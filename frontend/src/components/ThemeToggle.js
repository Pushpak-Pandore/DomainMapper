import React from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
        hover:bg-gray-50 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        transition-all duration-200
        ${className}
      `}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <div className="flex items-center space-x-2">
        <motion.div
          key={theme}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          {isDark ? (
            <SunIcon className="h-5 w-5 text-yellow-500" />
          ) : (
            <MoonIcon className="h-5 w-5 text-blue-600" />
          )}
        </motion.div>
        
        {showLabel && (
          <span className="text-sm font-medium">
            {isDark ? 'Light' : 'Dark'}
          </span>
        )}
      </div>
    </motion.button>
  );
};

// Advanced Theme Selector with system preference
export const AdvancedThemeSelector = () => {
  const { theme, setLightTheme, setDarkTheme } = useTheme();
  const [systemTheme, setSystemTheme] = React.useState('system');

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (systemTheme === 'system') {
        if (e.matches) {
          setDarkTheme();
        } else {
          setLightTheme();
        }
      }
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [systemTheme, setLightTheme, setDarkTheme]);

  const themes = [
    { key: 'light', name: 'Light', icon: SunIcon },
    { key: 'dark', name: 'Dark', icon: MoonIcon },
    { key: 'system', name: 'System', icon: ComputerDesktopIcon }
  ];

  return (
    <div className="flex items-center space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themes.map(({ key, name, icon: Icon }) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSystemTheme(key);
            if (key === 'light') setLightTheme();
            if (key === 'dark') setDarkTheme();
            if (key === 'system') {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              prefersDark ? setDarkTheme() : setLightTheme();
            }
          }}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all
            ${
              (key === 'system' && systemTheme === 'system') ||
              (key === theme && systemTheme !== 'system')
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          <Icon className="h-4 w-4" />
          <span>{name}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default ThemeToggle;