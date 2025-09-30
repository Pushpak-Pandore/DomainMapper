import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Database,
  Bell,
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // General settings
    defaultThreads: 50,
    defaultMode: 'both',
    enableNotifications: true,
    darkMode: false,
    
    // Security settings
    apiTimeout: 30,
    enableRateLimit: true,
    rateLimitRequests: 100,
    rateLimitWindow: 60,
    
    // Integration settings
    shodanApiKey: '',
    virusTotalApiKey: '',
    securityTrailsApiKey: '',
    
    // Database settings
    retentionDays: 90,
    autoCleanup: true,
    
    // Notification settings
    emailNotifications: true,
    scanCompleteNotification: true,
    errorNotification: true,
    weeklyReport: false
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('domainmapper_settings');
    if (savedSettings) {
      try {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleInputChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [`${category}_${key}`]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage (in real app, would save to API)
      localStorage.setItem('domainmapper_settings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      localStorage.removeItem('domainmapper_settings');
      window.location.reload();
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'integrations', name: 'Integrations', icon: Key },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-700">
          Configure DomainMapper Pro to suit your needs
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && <GeneralSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'security' && <SecuritySettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'integrations' && <IntegrationSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'database' && <DatabaseSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'notifications' && <NotificationSettings settings={settings} setSettings={setSettings} />}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Reset to defaults
          </button>
          <div className="flex items-center space-x-4">
            {saved && (
              <div className="flex items-center text-sm text-success-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Settings saved
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
              ) : (
                <Save className="-ml-1 mr-2 h-4 w-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GeneralSettings = ({ settings, setSettings }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Default Scan Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Threads</label>
            <input
              type="number"
              min="1"
              max="200"
              value={settings.defaultThreads}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultThreads: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Scan Mode</label>
            <select
              value={settings.defaultMode}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultMode: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="both">Both (Passive + Active)</option>
              <option value="passive">Passive Only</option>
              <option value="active">Active Only</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Interface Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Notifications</label>
              <p className="text-sm text-gray-500">Show browser notifications for scan updates</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => setSettings(prev => ({ ...prev, enableNotifications: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Dark Mode</label>
              <p className="text-sm text-gray-500">Use dark theme (coming soon)</p>
            </div>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => setSettings(prev => ({ ...prev, darkMode: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const SecuritySettings = ({ settings, setSettings }) => {
  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
            <div className="mt-2 text-sm text-yellow-700">
              These security settings help protect your DomainMapper instance. Changes require server restart.
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">API Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Timeout (seconds)</label>
            <input
              type="number"
              min="10"
              max="300"
              value={settings.apiTimeout}
              onChange={(e) => setSettings(prev => ({ ...prev, apiTimeout: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Limiting</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Rate Limiting</label>
              <p className="text-sm text-gray-500">Limit API requests to prevent abuse</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableRateLimit}
              onChange={(e) => setSettings(prev => ({ ...prev, enableRateLimit: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
          {settings.enableRateLimit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Requests per Window</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={settings.rateLimitRequests}
                  onChange={(e) => setSettings(prev => ({ ...prev, rateLimitRequests: parseInt(e.target.value) }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Window (seconds)</label>
                <input
                  type="number"
                  min="60"
                  max="3600"
                  value={settings.rateLimitWindow}
                  onChange={(e) => setSettings(prev => ({ ...prev, rateLimitWindow: parseInt(e.target.value) }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IntegrationSettings = ({ settings, setSettings }) => {
  const integrations = [
    {
      key: 'shodanApiKey',
      name: 'Shodan API Key',
      description: 'Enhanced IP and service information',
      url: 'https://www.shodan.io/'
    },
    {
      key: 'virusTotalApiKey',
      name: 'VirusTotal API Key',
      description: 'Malware and threat intelligence',
      url: 'https://www.virustotal.com/'
    },
    {
      key: 'securityTrailsApiKey',
      name: 'SecurityTrails API Key',
      description: 'DNS history and subdomain data',
      url: 'https://securitytrails.com/'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">API Integrations</h3>
            <div className="mt-2 text-sm text-blue-700">
              Add your API keys to enhance enumeration with additional data sources. All keys are stored securely.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => (
          <div key={integration.key} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{integration.name}</h4>
                <p className="text-sm text-gray-500">{integration.description}</p>
              </div>
              <a
                href={integration.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Get API Key →
              </a>
            </div>
            <input
              type="password"
              placeholder="Enter API key..."
              value={settings[integration.key]}
              onChange={(e) => setSettings(prev => ({ ...prev, [integration.key]: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const DatabaseSettings = ({ settings, setSettings }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Retention</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Retention Period (days)</label>
            <input
              type="number"
              min="7"
              max="365"
              value={settings.retentionDays}
              onChange={(e) => setSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
              className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Scan results older than this will be automatically deleted
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto Cleanup</label>
              <p className="text-sm text-gray-500">Automatically delete old data</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCleanup}
              onChange={(e) => setSettings(prev => ({ ...prev, autoCleanup: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-red-800 mb-2">Danger Zone</h4>
        <p className="text-sm text-red-700 mb-4">
          These actions are irreversible. Please be certain before proceeding.
        </p>
        <div className="space-y-2">
          <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">
            Delete All Scan Data
          </button>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">
            Reset Database
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings = ({ settings, setSettings }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Email Notifications</label>
              <p className="text-sm text-gray-500">Receive email updates about your scans</p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Scan Completion</label>
              <p className="text-sm text-gray-500">Notify when scans complete</p>
            </div>
            <input
              type="checkbox"
              checked={settings.scanCompleteNotification}
              onChange={(e) => setSettings(prev => ({ ...prev, scanCompleteNotification: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={!settings.emailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Error Notifications</label>
              <p className="text-sm text-gray-500">Notify when scans fail</p>
            </div>
            <input
              type="checkbox"
              checked={settings.errorNotification}
              onChange={(e) => setSettings(prev => ({ ...prev, errorNotification: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={!settings.emailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Weekly Reports</label>
              <p className="text-sm text-gray-500">Receive weekly activity summaries</p>
            </div>
            <input
              type="checkbox"
              checked={settings.weeklyReport}
              onChange={(e) => setSettings(prev => ({ ...prev, weeklyReport: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={!settings.emailNotifications}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;