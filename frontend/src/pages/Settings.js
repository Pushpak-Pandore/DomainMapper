import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Database,
  Shield,
  Clock,
  Bell,
  User,
  Palette
} from 'lucide-react';
import api from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    // General Settings
    defaultScanMode: 'both',
    defaultThreads: 50,
    autoSaveResults: true,
    
    // API Settings
    apiTimeout: 30,
    maxRetries: 3,
    
    // Security Settings
    enableThreatIntel: false,
    enableVulnScanning: false,
    
    // Notification Settings
    emailNotifications: false,
    scanCompleteNotification: true,
    
    // Display Settings
    theme: 'light',
    resultsPerPage: 50,
    showSourceInfo: true,
    
    // Advanced Settings
    enableScheduler: true,
    maxConcurrentScans: 3,
    dataRetentionDays: 30
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      // In a real implementation, this would save to backend
      // await api.post('/api/settings', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      defaultScanMode: 'both',
      defaultThreads: 50,
      autoSaveResults: true,
      apiTimeout: 30,
      maxRetries: 3,
      enableThreatIntel: false,
      enableVulnScanning: false,
      emailNotifications: false,
      scanCompleteNotification: true,
      theme: 'light',
      resultsPerPage: 50,
      showSourceInfo: true,
      enableScheduler: true,
      maxConcurrentScans: 3,
      dataRetentionDays: 30
    });
    setSaved(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure DomainMapper Pro preferences</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-400"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-700">Settings saved successfully!</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <SettingsIcon className="h-5 w-5 text-gray-500 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Scan Mode
              </label>
              <select
                value={settings.defaultScanMode}
                onChange={(e) => handleChange('defaultScanMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                <option value="passive">Passive Only</option>
                <option value="active">Active Only</option>
                <option value="both">Both (Passive + Active)</option>
                <option value="modern">Modern Comprehensive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Thread Count
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={settings.defaultThreads}
                onChange={(e) => handleChange('defaultThreads', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoSave"
              checked={settings.autoSaveResults}
              onChange={(e) => handleChange('autoSaveResults', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="autoSave" className="ml-2 text-sm text-gray-700">
              Automatically save scan results
            </label>
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <Database className="h-5 w-5 text-gray-500 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">API Settings</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Timeout (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.apiTimeout}
                onChange={(e) => handleChange('apiTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Retry Attempts
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={settings.maxRetries}
                onChange={(e) => handleChange('maxRetries', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <Shield className="h-5 w-5 text-gray-500 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="threatIntel"
              checked={settings.enableThreatIntel}
              onChange={(e) => handleChange('enableThreatIntel', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="threatIntel" className="ml-2 text-sm text-gray-700">
              Enable threat intelligence by default
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="vulnScanning"
              checked={settings.enableVulnScanning}
              onChange={(e) => handleChange('enableVulnScanning', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="vulnScanning" className="ml-2 text-sm text-gray-700">
              Enable vulnerability scanning by default
            </label>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <Palette className="h-5 w-5 text-gray-500 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">Display Settings</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Results per Page
              </label>
              <select
                value={settings.resultsPerPage}
                onChange={(e) => handleChange('resultsPerPage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showSource"
              checked={settings.showSourceInfo}
              onChange={(e) => handleChange('showSourceInfo', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="showSource" className="ml-2 text-sm text-gray-700">
              Show source information for subdomains
            </label>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <Clock className="h-5 w-5 text-gray-500 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">Advanced Settings</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Concurrent Scans
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxConcurrentScans}
                onChange={(e) => handleChange('maxConcurrentScans', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Retention (days)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={settings.dataRetentionDays}
                onChange={(e) => handleChange('dataRetentionDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableScheduler"
              checked={settings.enableScheduler}
              onChange={(e) => handleChange('enableScheduler', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="enableScheduler" className="ml-2 text-sm text-gray-700">
              Enable scheduled scans
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;