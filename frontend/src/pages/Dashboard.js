import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Calendar,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { scanService } from '../services/api';
import { formatDistanceToNow, format } from 'date-fns';

const Dashboard = () => {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scansResponse, statsResponse] = await Promise.all([
        scanService.listScans({ limit: 50 }),
        scanService.getStats()
      ]);
      setScans(scansResponse.data.scans);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'running':
        return <Activity className="h-5 w-5 text-primary-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-danger-500" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-warning-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'running':
        return 'bg-primary-100 text-primary-800';
      case 'failed':
        return 'bg-danger-100 text-danger-800';
      case 'queued':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredScans = scans.filter(scan => {
    const matchesSearch = scan.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || scan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-lg text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and manage your subdomain enumeration scans
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/new-scan"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            New Scan
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Scans"
          value={stats.total_scans || 0}
          icon={Target}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Scans"
          value={stats.active_scans || 0}
          icon={Activity}
          color="bg-green-500"
        />
        <StatCard
          title="Total Subdomains"
          value={stats.total_subdomains || 0}
          icon={Search}
          color="bg-purple-500"
        />
        <StatCard
          title="Vulnerable"
          value={stats.vulnerable_subdomains || 0}
          icon={AlertTriangle}
          color="bg-red-500"
        />
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search domains..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
            <button
              onClick={fetchData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scans Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Scans
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Your latest subdomain enumeration scans
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredScans.length === 0 ? (
            <li className="px-4 py-12 text-center">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scans found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new scan.
              </p>
              <div className="mt-6">
                <Link
                  to="/new-scan"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  New Scan
                </Link>
              </div>
            </li>
          ) : (
            filteredScans.map((scan) => (
              <ScanItem key={scan._id} scan={scan} getStatusIcon={getStatusIcon} getStatusColor={getStatusColor} />
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`inline-flex items-center justify-center p-3 ${color} rounded-md shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScanItem = ({ scan, getStatusIcon, getStatusColor }) => {
  return (
    <li>
      <Link
        to={`/scan/${scan._id}`}
        className="block hover:bg-gray-50 transition duration-150 ease-in-out"
      >
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getStatusIcon(scan.status)}
              <div className="ml-4">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-primary-600 truncate">
                    {scan.domain}
                  </p>
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(scan.status)}`}>
                    {scan.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  <span>
                    Started {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}
                  </span>
                  {scan.completed_at && (
                    <span className="mx-2">•</span>
                  )}
                  {scan.completed_at && (
                    <span>
                      Completed {formatDistanceToNow(new Date(scan.completed_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center">
              {scan.status === 'running' && (
                <div className="mr-4">
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scan.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{scan.progress || 0}%</span>
                  </div>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {scan.total_subdomains ? `${scan.total_subdomains} subdomains` : '—'}
                </p>
                <p className="text-sm text-gray-500">
                  {scan.mode} scan
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
};

export default Dashboard;