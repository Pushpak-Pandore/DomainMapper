import React from 'react';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Scan trends and statistics</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
        <p className="text-gray-500">Detailed analytics and reporting features are in development.</p>
      </div>
    </div>
  );
};

export default Analytics;