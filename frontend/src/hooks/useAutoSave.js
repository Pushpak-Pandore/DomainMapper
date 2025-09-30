import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const useAutoSave = ({
  data,
  saveFunction,
  delay = 2000,
  key = 'autoSave',
  enabled = true,
  showToasts = true,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load saved data from localStorage on mount
  useEffect(() => {
    if (!enabled) return;
    
    try {
      const savedData = localStorage.getItem(`autosave_${key}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.timestamp) {
          setLastSaved(new Date(parsed.timestamp));
        }
      }
    } catch (error) {
      console.warn('Failed to load autosaved data:', error);
    }
  }, [key, enabled]);

  // Save data to localStorage and/or server
  const saveData = useCallback(async () => {
    if (!data || !enabled) return;

    setIsSaving(true);
    try {
      // Save to localStorage
      const savePayload = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`autosave_${key}`, JSON.stringify(savePayload));
      
      // Save to server if function provided
      if (saveFunction) {
        await saveFunction(data);
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      if (showToasts) {
        toast.success('💾 Auto-saved', {
          duration: 2000,
          position: 'bottom-right',
          style: {
            background: '#10B981',
            color: 'white',
            fontSize: '14px',
          },
        });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      if (showToasts) {
        toast.error('Failed to auto-save', {
          duration: 3000,
          position: 'bottom-right',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [data, saveFunction, key, enabled, showToasts]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !data) return;

    setHasUnsavedChanges(true);
    
    const timeoutId = setTimeout(() => {
      saveData();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [data, delay, enabled, saveData]);

  // Load saved data
  const loadSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(`autosave_${key}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (showToasts) {
          toast.success('📥 Loaded saved data', {
            duration: 3000,
            position: 'bottom-right',
          });
        }
        return parsed.data;
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
      if (showToasts) {
        toast.error('Failed to load saved data');
      }
    }
    return null;
  }, [key, showToasts]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(`autosave_${key}`);
      setLastSaved(null);
      setHasUnsavedChanges(false);
      if (showToasts) {
        toast.success('🗑️ Cleared saved data');
      }
    } catch (error) {
      console.error('Failed to clear saved data:', error);
    }
  }, [key, showToasts]);

  // Force save
  const forceSave = useCallback(() => {
    saveData();
  }, [saveData]);

  // Check if saved data exists
  const hasSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(`autosave_${key}`);
      return !!savedData;
    } catch {
      return false;
    }
  }, [key]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    loadSavedData,
    clearSavedData,
    forceSave,
    hasSavedData,
    saveData,
  };
};

export default useAutoSave;