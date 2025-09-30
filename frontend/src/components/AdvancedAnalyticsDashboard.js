import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const generateMockAnalyticsData = (range) => {
  const days = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const scanHistory = [];
  const domainStats = [];
  const vulnerabilityTrends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    scanHistory.push({
      date: date.toISOString().split('T')[0],
      scans: Math.floor(Math.random() * 50) + 10,
      subdomains: Math.floor(Math.random() * 500) + 100,
      vulnerabilities: Math.floor(Math.random() * 20) + 2,
      avgDuration: Math.floor(Math.random() * 120) + 30
    });
  }

  const topDomains = [
    { domain: 'example.com', scans: 45, subdomains: 234, vulnerabilities: 3 },
    { domain: 'testsite.org', scans: 32, subdomains: 189, vulnerabilities: 7 },
    { domain: 'myapp.io', scans: 28, subdomains: 156, vulnerabilities: 2 },
    { domain: 'webapp.net', scans: 21, subdomains: 134, vulnerabilities: 5 },
    { domain: 'api.service.com', scans: 18, subdomains: 98, vulnerabilities: 1 }
  ];

  const vulnerabilityTypes = [
    { name: 'Subdomain Takeover', count: 12, severity: 'high' },
    { name: 'SSL Issues', count: 8, severity: 'medium' },
    { name: 'Open Ports', count: 24, severity: 'low' },
    { name: 'DNS Misconfig', count: 6, severity: 'medium' },
    { name: 'Exposed Services', count: 15, severity: 'high' }
  ];

  return {
    scanHistory,
    topDomains,
    vulnerabilityTypes,
    summary: {
      totalScans: scanHistory.reduce((sum, day) => sum + day.scans, 0),
      totalSubdomains: scanHistory.reduce((sum, day) => sum + day.subdomains, 0),
      totalVulnerabilities: scanHistory.reduce((sum, day) => sum + day.vulnerabilities, 0),
      avgScanDuration: Math.round(scanHistory.reduce((sum, day) => sum + day.avgDuration, 0) / scanHistory.length)
    }
  };
};

const AdvancedAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [chartType, setChartType] = useState('area');

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      // Simulate analytics data - in real app, this would fetch from backend
      const mockData = generateMockAnalyticsData(timeRange);
      return mockData;
    },
    staleTime: 60000 // 1 minute
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

  const chartVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  if (isLoading || !analyticsData || !analyticsData.summary || !analyticsData.scanHistory || !analyticsData.vulnerabilityTypes || !analyticsData.topDomains) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-80 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Advanced Analytics
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
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
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Chart Type:
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="area">Area</option>
              <option value="bar">Bar</option>
              <option value="line">Line</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Scans',
            value: analyticsData.summary.totalScans,
            icon: ChartBarIcon,
            color: 'blue',
            change: '+12%'
          },
          {
            title: 'Subdomains Found',
            value: analyticsData.summary.totalSubdomains.toLocaleString(),
            icon: GlobeAltIcon,
            color: 'green',
            change: '+8%'
          },
          {
            title: 'Vulnerabilities',
            value: analyticsData.summary.totalVulnerabilities,
            icon: ExclamationTriangleIcon,
            color: 'red',
            change: '-3%'
          },
          {
            title: 'Avg Scan Time',
            value: `${analyticsData.summary.avgScanDuration}s`,
            icon: ClockIcon,
            color: 'purple',
            change: '-15%'
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
                <div className={`flex items-center mt-2 text-sm ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  {stat.change}
                </div>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scan History Chart */}
        <motion.div
          {...chartVariants}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Scan Activity Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'area' && (
              <AreaChart data={analyticsData?.scanHistory ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="date" className="text-gray-600 dark:text-gray-400" />
                <YAxis className="text-gray-600 dark:text-gray-400" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="Scans"
                />
              </AreaChart>
            )}
            
            {chartType === 'bar' && (
              <BarChart data={analyticsData?.scanHistory ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="date" className="text-gray-600 dark:text-gray-400" />
                <YAxis className="text-gray-600 dark:text-gray-400" />
                <Tooltip />
                <Legend />
                <Bar dataKey="scans" fill="#3B82F6" name="Scans" />
              </BarChart>
            )}
            
            {chartType === 'line' && (
              <LineChart data={analyticsData.scanHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="date" className="text-gray-600 dark:text-gray-400" />
                <YAxis className="text-gray-600 dark:text-gray-400" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="scans"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Scans"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </motion.div>

        {/* Vulnerabilities Distribution */}
        <motion.div
          {...chartVariants}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vulnerability Types
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.vulnerabilityTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(analyticsData?.vulnerabilityTypes ?? []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Subdomain Discovery Trends */}
        <motion.div
          {...chartVariants}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Subdomain Discovery
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={analyticsData.scanHistory}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="date" className="text-gray-600 dark:text-gray-400" />
              <YAxis className="text-gray-600 dark:text-gray-400" />
              <Tooltip />
              <Legend />
              <Bar dataKey="subdomains" fill="#10B981" name="Subdomains Found" />
              <Line type="monotone" dataKey="vulnerabilities" stroke="#EF4444" name="Vulnerabilities" />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Domains Table */}
        <motion.div
          {...chartVariants}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Most Scanned Domains
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Domain</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Scans</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Subdomains</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Vuln</th>
                </tr>
              </thead>
              <tbody>
                {(analyticsData?.topDomains ?? []).map((domain, index) => (
                  <tr key={domain.domain} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3 text-sm text-gray-900 dark:text-white font-medium">
                      {domain.domain}
                    </td>
                    <td className="py-3 text-sm text-gray-600 dark:text-gray-300">
                      {domain.scans}
                    </td>
                    <td className="py-3 text-sm text-gray-600 dark:text-gray-300">
                      {domain.subdomains}
                    </td>
                    <td className="py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        domain.vulnerabilities > 5 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : domain.vulnerabilities > 0 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {domain.vulnerabilities}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;