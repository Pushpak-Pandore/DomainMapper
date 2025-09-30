import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts = {
    // Navigation shortcuts
    'ctrl+shift+d': () => {
      navigate('/');
      toast.success('Navigated to Dashboard', { duration: 2000 });
    },
    'ctrl+shift+n': () => {
      navigate('/new-scan');
      toast.success('Navigated to New Scan', { duration: 2000 });
    },
    'ctrl+shift+a': () => {
      navigate('/analytics');
      toast.success('Navigated to Analytics', { duration: 2000 });
    },
    'ctrl+shift+s': () => {
      navigate('/settings');
      toast.success('Navigated to Settings', { duration: 2000 });
    },
    
    // Utility shortcuts
    'f5': () => {
      window.location.reload();
    },
    'ctrl+shift+r': () => {
      window.location.reload();
    },
    'escape': () => {
      // Close modals, clear selections, etc.
      const event = new CustomEvent('escape-pressed');
      window.dispatchEvent(event);
    },
    
    // Search and filter shortcuts
    'ctrl+k': (e) => {
      e.preventDefault();
      const searchInput = document.querySelector('input[type="text"], input[placeholder*="search" i], input[placeholder*="filter" i]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
        toast.success('Search focused', { duration: 1500 });
      }
    },
    
    // Export shortcuts
    'ctrl+e': () => {
      const event = new CustomEvent('export-data');
      window.dispatchEvent(event);
      toast.success('Exporting data...', { duration: 2000 });
    },
    
    // Theme toggle
    'ctrl+shift+t': () => {
      const event = new CustomEvent('toggle-theme');
      window.dispatchEvent(event);
    },
    
    // Help shortcut
    'shift+?': () => {
      const event = new CustomEvent('show-shortcuts');
      window.dispatchEvent(event);
    },
    
    // Quick actions
    'alt+1': () => navigate('/'),
    'alt+2': () => navigate('/new-scan'),
    'alt+3': () => navigate('/analytics'),
    'alt+4': () => navigate('/settings')
  };

  const getKeyString = (event) => {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    // Handle special keys
    if (event.key === 'Escape') parts.push('escape');
    else if (event.key === 'F5') parts.push('f5');
    else if (event.key === '?') parts.push('?');
    else parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  };

  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs (except for specific shortcuts)
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.contentEditable === 'true'
    ) {
      // Allow certain shortcuts even in input fields
      const allowedInInputs = ['escape', 'f5', 'ctrl+shift+r'];
      const keyString = getKeyString(event);
      if (!allowedInInputs.includes(keyString)) {
        return;
      }
    }

    const keyString = getKeyString(event);
    const shortcut = shortcuts[keyString];
    
    if (shortcut) {
      event.preventDefault();
      shortcut(event);
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: Object.keys(shortcuts),
    getShortcutDescription: (key) => {
      const descriptions = {
        'ctrl+shift+d': 'Navigate to Dashboard',
        'ctrl+shift+n': 'Navigate to New Scan',
        'ctrl+shift+a': 'Navigate to Analytics',
        'ctrl+shift+s': 'Navigate to Settings',
        'f5': 'Refresh page',
        'ctrl+shift+r': 'Force refresh',
        'escape': 'Close modals/clear selections',
        'ctrl+k': 'Focus search',
        'ctrl+e': 'Export data',
        'ctrl+shift+t': 'Toggle theme',
        'shift+?': 'Show shortcuts help',
        'alt+1': 'Dashboard',
        'alt+2': 'New Scan',
        'alt+3': 'Analytics',
        'alt+4': 'Settings'
      };
      return descriptions[key] || 'Unknown shortcut';
    }
  };
};

export default useKeyboardShortcuts;