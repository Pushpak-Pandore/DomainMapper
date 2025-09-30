import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Download,
  WifiIcon,
  ExclamationTriangleIcon
} from 'lucide-react';
import api from '../services/api';
import { useWebSocketContext } from '../providers/WebSocketProvider';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { connectionStatus, isConnected, subscribeToDashboard } = useWebSocketContext();

  // React Query for stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await api.get('/api/stats');
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });

  // React Query for recent scans
  const { data: scansData, isLoading: scansLoading, error: scansError } = useQuery({
    queryKey: ['scans', { limit: 10 }],
    queryFn: async () => {
      const response = await api.get('/api/scans?limit=10');
      return response.data;
    },
    staleTime: 10000, // 10 seconds
  });

  // Subscribe to dashboard updates
  useEffect(() => {
    if (isConnected) {
      subscribeToDashboard();
    }
  }, [isConnected, subscribeToDashboard]);

  // Listen for dashboard updates
  useEffect(() => {
    const handleDashboardUpdate = () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['stats']);
      queryClient.invalidateQueries(['scans']);
    };

    window.addEventListener('dashboardUpdate', handleDashboardUpdate);
    return () => window.removeEventListener('dashboardUpdate', handleDashboardUpdate);
  }, [queryClient]);

  const downloadReport = async (scanId, domain) => {
    try {
      const response = await api.get(`/api/scan/${scanId}/report/json`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${domain}_report.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (statsLoading || scansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (statsError || scansError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading dashboard data
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Please check your connection and try refreshing the page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const recentScans = scansData?.scans || [];

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your subdomain enumeration activities</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Real-time Connection Status */}
          <div className="flex items-center space-x-2">
            <WifiIcon className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {connectionStatus}
            </span>
          </div>
          <Link
            to="/new-scan"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Scan
          </Link>
        </div>
      </div>

      {/* Stats Cards with Real-time Updates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Search className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Scans</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_scans || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Scans</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.active_scans || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Subdomains</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_subdomains?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Vulnerable</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.vulnerable_subdomains || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Scans</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentScans.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No scans yet</p>
              <p className="text-gray-400">Start your first subdomain enumeration</p>
              <Link
                to="/new-scan"
                className="inline-flex items-center mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Scan
              </Link>
            </div>
          ) : (
            recentScans.map((scan) => (
              <div key={scan._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(scan.status)}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{scan.domain}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(scan.status)}`}>
                          {scan.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {scan.total_subdomains} subdomains
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(scan.started_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/scan/${scan._id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {scan.status === 'completed' && (
                      <button 
                        onClick={() => downloadReport(scan._id, scan.domain)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Download Report"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {scan.status === 'running' && scan.progress !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span>{scan.progress}%</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${scan.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;