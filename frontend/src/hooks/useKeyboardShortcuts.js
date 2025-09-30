import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((event) => {
    // Prevent shortcuts when typing in form fields
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable
    ) {
      return;
    }

    // Handle different key combinations
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'n':
          event.preventDefault();
          navigate('/new-scan');
          toast.success('⌨️ Opening New Scan');
          break;
        case 'd':
          event.preventDefault();
          navigate('/');
          toast.success('⌨️ Opening Dashboard');
          break;
        case 'a':
          event.preventDefault();
          navigate('/analytics');
          toast.success('⌨️ Opening Analytics');
          break;
        case 's':
          event.preventDefault();
          navigate('/settings');
          toast.success('⌨️ Opening Settings');
          break;
        case 'k':
          event.preventDefault();
          // Focus on search input if available
          const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="search"]');
          if (searchInput) {
            searchInput.focus();
            toast.success('⌨️ Search activated');
          }
          break;
        case 'e':
          event.preventDefault();
          // Trigger export if available
          const exportButton = document.querySelector('button:contains("Export"), [aria-label*="export"], [title*="Export"]');
          if (exportButton) {
            exportButton.click();
            toast.success('⌨️ Export triggered');
          }
          break;
        default:
          break;
      }
    } else {
      // Handle single key shortcuts
      switch (event.key) {
        case 'Escape':
          // Close modals, clear filters, etc.
          event.preventDefault();
          // Close any open modals
          const modalCloseButton = document.querySelector('[aria-label="Close"], button[aria-label*="close"]');
          if (modalCloseButton) {
            modalCloseButton.click();
          }
          // Clear global search if available
          const globalSearchInput = document.querySelector('input[placeholder*="Search all"]');
          if (globalSearchInput && globalSearchInput.value) {
            globalSearchInput.value = '';
            globalSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
            toast.success('⌨️ Cleared search');
          }
          break;
        case 'F5':
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            // Let browser handle refresh
            return;
          }
          // Custom refresh action
          event.preventDefault();
          window.location.reload();
          break;
        case '?':
          event.preventDefault();
          showKeyboardShortcutsHelp();
          break;
        default:
          break;
      }
    }
  }, [navigate]);

  const showKeyboardShortcutsHelp = () => {
    toast(
      <div className="text-sm">
        <div className="font-semibold mb-2">⌨️ Keyboard Shortcuts</div>
        <div className="space-y-1 text-xs">
          <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+N</kbd> New Scan</div>
          <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+D</kbd> Dashboard</div>
          <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+A</kbd> Analytics</div>
          <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+S</kbd> Settings</div>
          <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+K</kbd> Search</div>
          <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+E</kbd> Export</div>
          <div><kbd className="bg-gray-200 px-1 rounded">Esc</kbd> Close/Clear</div>
          <div><kbd className="bg-gray-200 px-1 rounded">?</kbd> Show help</div>
        </div>
      </div>,
      {
        duration: 6000,
        position: 'top-center',
        style: {
          background: '#f8fafc',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
        },
      }
    );
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    showKeyboardShortcutsHelp,
  };
};

export default useKeyboardShortcuts;