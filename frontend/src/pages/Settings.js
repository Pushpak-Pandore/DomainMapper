import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure DomainMapper Pro preferences</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <SettingsIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Coming Soon</h3>
        <p className="text-gray-500">Configuration options will be available in a future update.</p>
      </div>
    </div>
  );
};

export default Settings;