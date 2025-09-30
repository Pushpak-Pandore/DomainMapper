import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Shield, 
  Globe,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import api from '../services/api';

const Analytics = () => {
  const [stats, setStats] = useState({
    total_scans: 0,
    active_scans: 0,
    total_subdomains: 0,
    vulnerable_subdomains: 0
  });
  const [recentScans, setRecentScans] = useState([]);
  const [scanTrends, setScanTrends] = useState([]);
  const [topDomains, setTopDomains] = useState([]);
  const [vulnerabilityData, setVulnerabilityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch basic stats
      const [statsResponse, scansResponse] = await Promise.all([
        api.get('/api/stats'),
        api.get('/api/scans?limit=50')
      ]);
      
      setStats(statsResponse.data);
      setRecentScans(scansResponse.data.scans);

      // Process scan trends data
      const scansByDate = {};
      const subdomainsByDate = {};
      const vulnerabilitiesByDate = {};
      
      scansResponse.data.scans.forEach(scan => {
        const date = new Date(scan.started_at).toISOString().split('T')[0];
        
        scansByDate[date] = (scansByDate[date] || 0) + 1;
        
        if (scan.total_subdomains) {
          subdomainsByDate[date] = (subdomainsByDate[date] || 0) + scan.total_subdomains;
        }
        
        if (scan.results && scan.results.vulnerabilities) {
          vulnerabilitiesByDate[date] = (vulnerabilitiesByDate[date] || 0) + scan.results.vulnerabilities.length;
        }
      });

      // Create trend data
      const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const trendData = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString(),
        scans: scansByDate[date] || 0,
        subdomains: subdomainsByDate[date] || 0,
        vulnerabilities: vulnerabilitiesByDate[date] || 0
      }));

      setScanTrends(trendData);

      // Process top domains
      const domainCounts = {};
      scansResponse.data.scans.forEach(scan => {
        domainCounts[scan.domain] = (domainCounts[scan.domain] || 0) + 1;
      });

      const topDomainsData = Object.entries(domainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([domain, count]) => ({
          domain,
          scans: count
        }));

      setTopDomains(topDomainsData);

      // Process vulnerability distribution
      const vulnTypes = {
        'High': 0,
        'Medium': 0,
        'Low': 0,
        'Info': 0
      };

      scansResponse.data.scans.forEach(scan => {
        if (scan.results && scan.results.vulnerabilities) {
          scan.results.vulnerabilities.forEach(vuln => {
            const severity = vuln.severity || 'Info';
            const key = severity.charAt(0).toUpperCase() + severity.slice(1);
            if (vulnTypes[key] !== undefined) {
              vulnTypes[key]++;
            } else {
              vulnTypes['Info']++;
            }
          });
        }
      });

      const vulnData = Object.entries(vulnTypes).map(([severity, count]) => ({
        severity,
        count
      }));

      setVulnerabilityData(vulnData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const data = {
      stats,
      scanTrends,
      topDomains,
      vulnerabilityData,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domainmapper-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#6b7280'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive subdomain enumeration analytics</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={exportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Scans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_scans}</p>
              <p className="text-sm text-green-600">↗ +12% from last week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Globe className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Subdomains Found</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_subdomains.toLocaleString()}</p>
              <p className="text-sm text-green-600">↗ +8% from last week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Vulnerabilities</p>
              <p className="text-2xl font-bold text-gray-900">{stats.vulnerable_subdomains}</p>
              <p className="text-sm text-red-600">↑ +3% from last week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Scans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_scans}</p>
              <p className="text-sm text-gray-600">Currently running</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scan Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Activity Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scanTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="subdomains" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vulnerability Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vulnerability Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vulnerabilityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ severity, count, percent }) => `${severity}: ${count} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {vulnerabilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Domains & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Scanned Domains */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Most Scanned Domains</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topDomains}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="domain" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="scans" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Scan Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Scan Activity</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
            {recentScans.slice(0, 10).map((scan, index) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{scan.domain}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(scan.started_at).toLocaleDateString()} • {scan.total_subdomains} subdomains
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  scan.status === 'completed' ? 'bg-green-100 text-green-800' :
                  scan.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  scan.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {scan.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;