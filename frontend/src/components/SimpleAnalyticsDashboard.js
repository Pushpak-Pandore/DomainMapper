import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const SimpleAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch analytics data with safer error handling
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/analytics?time_range=${timeRange}`);
        return response.data;
      } catch (error) {
        console.error('Analytics API error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 60000
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <div className="text-sm text-gray-500">
            Loading...
          </div>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analytics Dashboard
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Failed to Load Analytics
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            Unable to fetch analytics data. Error: {error.message}
          </p>
        </div>
      </div>
    );
  }

  // Safe data extraction with defaults
  const summary = analyticsData?.summary || {};
  const totalScans = summary.totalScans || 0;
  const totalSubdomains = summary.totalSubdomains || 0;
  const totalVulnerabilities = summary.totalVulnerabilities || 0;
  const avgScanDuration = summary.avgScanDuration || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your subdomain enumeration activities
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Range:
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Scans
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalScans}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Subdomains Found
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalSubdomains.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Vulnerabilities
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalVulnerabilities}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Avg Scan Time
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {avgScanDuration}s
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Analytics Data
        </h3>
        <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
          Showing analytics for {timeRange.replace('h', ' hours').replace('d', ' days')}. 
          Data is automatically refreshed every 5 minutes.
        </p>
        {analyticsData?.generated_at && (
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
            Last updated: {new Date(analyticsData.generated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default SimpleAnalyticsDashboard;