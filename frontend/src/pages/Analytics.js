import React from 'react';
import SimpleAnalyticsDashboard from '../components/SimpleAnalyticsDashboard';
import ErrorBoundary from '../components/ErrorBoundary';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <ErrorBoundary showReload={true}>
        <SimpleAnalyticsDashboard />
      </ErrorBoundary>
    </div>
  );
};

export default Analytics;