import React from 'react';
import AdvancedAnalyticsDashboard from '../components/AdvancedAnalyticsDashboard';
import ErrorBoundary from '../components/ErrorBoundary';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <ErrorBoundary showReload={true}>
        <AdvancedAnalyticsDashboard />
      </ErrorBoundary>
    </div>
  );
};

export default Analytics;