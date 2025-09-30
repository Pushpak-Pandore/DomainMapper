import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  CommandLineIcon,
  KeyboardIcon
} from '@heroicons/react/24/outline';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

const KeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { shortcuts, getShortcutDescription } = useKeyboardShortcuts();

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true);
    const handleEscape = () => setIsOpen(false);
    
    window.addEventListener('show-shortcuts', handleShowShortcuts);
    window.addEventListener('escape-pressed', handleEscape);
    
    return () => {
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
      window.removeEventListener('escape-pressed', handleEscape);
    };
  }, []);

  const shortcutGroups = {
    'Navigation': ['ctrl+shift+d', 'ctrl+shift+n', 'ctrl+shift+a', 'ctrl+shift+s', 'alt+1', 'alt+2', 'alt+3', 'alt+4'],
    'Actions': ['ctrl+e', 'ctrl+k', 'f5', 'ctrl+shift+r'],
    'Interface': ['ctrl+shift+t', 'escape'],
    'Help': ['shift+?']
  };

  const formatShortcut = (shortcut) => {
    return shortcut
      .split('+')
      .map(key => {
        const keyMap = {
          'ctrl': '⌘',
          'alt': '⌥',
          'shift': '⇧',
          'meta': '⌘',
          'escape': 'Esc',
          '?': '?'
        };
        return keyMap[key] || key.toUpperCase();
      })
      .join(' + ');
  };

  return (
    <>
      {/* Keyboard shortcuts indicator */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors"
        title="Show keyboard shortcuts (Shift + ?)"
      >
        <KeyboardIcon className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CommandLineIcon className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Keyboard Shortcuts
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                <div className="grid gap-6 md:grid-cols-2">
                  {Object.entries(shortcutGroups).map(([groupName, groupShortcuts]) => (
                    <div key={groupName}>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        {groupName}
                      </h3>
                      <div className="space-y-2">
                        {groupShortcuts.map(shortcut => (
                          <div key={shortcut} className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {getShortcutDescription(shortcut)}
                            </span>
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs font-mono border border-gray-300 dark:border-gray-600">
                              {formatShortcut(shortcut)}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Tip: Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Esc</kbd> to close dialogs or <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Shift + ?</kbd> to show this help again.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default KeyboardShortcutsHelp;