import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  Globe,
  Server,
  Shield,
  Target
} from 'lucide-react';
import { scanService } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';

const ScanDetails = () => {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchScanDetails();
  }, [scanId]);

  useEffect(() => {
    let interval;
    if (scan?.status === 'running' || scan?.status === 'queued') {
      interval = setInterval(fetchScanDetails, 3000); // Refresh every 3 seconds
    }
    return () => clearInterval(interval);
  }, [scan?.status, scanId]);

  const fetchScanDetails = async () => {
    try {
      const response = await scanService.getScanStatus(scanId);
      setScan(response.data);
    } catch (error) {
      console.error('Error fetching scan details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchScanDetails();
  };

  const handleDownloadReport = async (format) => {
    try {
      const response = await scanService.downloadReport(scanId, format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${scan.domain}_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-success-500" />;
      case 'running':
        return <Activity className="h-6 w-6 text-primary-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-danger-500" />;
      case 'queued':
        return <Clock className="h-6 w-6 text-warning-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-lg text-gray-600">Loading scan details...</span>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Scan not found</h3>
        <p className="mt-1 text-sm text-gray-500">The scan you're looking for doesn't exist.</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <ArrowLeft className="-ml-1 mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const subdomains = scan.results?.subdomains || [];
  const liveSubdomains = Object.keys(scan.results?.http_status || {}).filter(
    sub => scan.results.http_status[sub]
  ).length;
  const vulnerableSubdomains = Object.values(scan.results?.takeover_vulnerable || {}).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getStatusIcon(scan.status)}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{scan.domain}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(scan.status)}`}>
                  {scan.status}
                </span>
                <span className="text-sm text-gray-500">
                  Started {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}
                </span>
                {scan.completed_at && (
                  <span className="text-sm text-gray-500">
                    • Completed {formatDistanceToNow(new Date(scan.completed_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {scan.status === 'completed' && (
              <div className="relative">
                <select
                  onChange={(e) => e.target.value && handleDownloadReport(e.target.value)}
                  className="appearance-none bg-primary-600 text-white px-4 py-2 pr-8 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Download Report
                  </option>
                  <option value="html">HTML Report</option>
                  <option value="json">JSON Report</option>
                  <option value="csv">CSV Report</option>
                  <option value="pdf">PDF Report</option>
                </select>
                <Download className="absolute right-2 top-2.5 h-4 w-4 text-white pointer-events-none" />
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {scan.status === 'running' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{scan.current_step || 'Processing...'}</span>
              <span>{scan.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${scan.progress || 0}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Subdomains" value={scan.total_subdomains || 0} icon={Globe} color="bg-blue-500" />
        <StatCard title="Live Subdomains" value={liveSubdomains} icon={Activity} color="bg-green-500" />
        <StatCard title="Vulnerable" value={vulnerableSubdomains} icon={AlertTriangle} color="bg-red-500" />
        <StatCard title="Passive Found" value={scan.results?.passive_count || 0} icon={Search} color="bg-purple-500" />
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: Globe },
              { id: 'subdomains', name: 'Subdomains', icon: Target },
              { id: 'technologies', name: 'Technologies', icon: Server },
              { id: 'security', name: 'Security', icon: Shield },
            ].map((tab) => {
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

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab scan={scan} />}
          {activeTab === 'subdomains' && <SubdomainsTab subdomains={subdomains} copyToClipboard={copyToClipboard} />}
          {activeTab === 'technologies' && <TechnologiesTab scan={scan} />}
          {activeTab === 'security' && <SecurityTab scan={scan} />}
        </div>
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

const OverviewTab = ({ scan }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Configuration</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Mode</dt>
              <dd className="text-sm text-gray-900 capitalize">{scan.mode}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Threads</dt>
              <dd className="text-sm text-gray-900">{scan.config?.threads || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Started</dt>
              <dd className="text-sm text-gray-900">{format(new Date(scan.started_at), 'PPpp')}</dd>
            </div>
            {scan.completed_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Completed</dt>
                <dd className="text-sm text-gray-900">{format(new Date(scan.completed_at), 'PPpp')}</dd>
              </div>
            )}
          </dl>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Results Summary</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Subdomains</dt>
              <dd className="text-sm text-gray-900">{scan.total_subdomains || 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Passive Results</dt>
              <dd className="text-sm text-gray-900">{scan.results?.passive_count || 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Active Results</dt>
              <dd className="text-sm text-gray-900">{scan.results?.active_count || 0}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

const SubdomainsTab = ({ subdomains, copyToClipboard }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const filteredSubdomains = subdomains.filter(sub =>
    sub.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSubdomains.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubdomains = filteredSubdomains.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search subdomains..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <span className="text-sm text-gray-500">
          {filteredSubdomains.length} of {subdomains.length} subdomains
        </span>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {paginatedSubdomains.map((subdomain, index) => (
          <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <span className="font-mono text-sm">{subdomain}</span>
            <button
              onClick={() => copyToClipboard(subdomain)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const TechnologiesTab = ({ scan }) => {
  const technologies = scan.results?.technologies || {};
  const httpStatus = scan.results?.http_status || {};
  
  const subdomainsWithTech = Object.keys(technologies).filter(sub => 
    technologies[sub]?.server || technologies[sub]?.cms?.length > 0
  );

  return (
    <div className="space-y-6">
      {subdomainsWithTech.length === 0 ? (
        <div className="text-center py-8">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No technology data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Enable fingerprinting in scan configuration to see technology information.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {subdomainsWithTech.map(subdomain => (
            <div key={subdomain} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-mono text-sm font-medium">{subdomain}</h4>
                {httpStatus[subdomain] && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    httpStatus[subdomain] >= 200 && httpStatus[subdomain] < 300
                      ? 'bg-success-100 text-success-800'
                      : httpStatus[subdomain] >= 400
                      ? 'bg-danger-100 text-danger-800'
                      : 'bg-warning-100 text-warning-800'
                  }`}>
                    HTTP {httpStatus[subdomain]}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                {technologies[subdomain]?.server && (
                  <div>
                    <span className="font-medium text-gray-700">Server:</span>
                    <span className="ml-2 text-gray-600">{technologies[subdomain].server}</span>
                  </div>
                )}
                {technologies[subdomain]?.cms?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">CMS/Framework:</span>
                    <span className="ml-2 text-gray-600">{technologies[subdomain].cms.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SecurityTab = ({ scan }) => {
  const takeovers = scan.results?.takeover_vulnerable || {};
  const threatScores = scan.results?.threat_scores || {};
  
  const vulnerableSubdomains = Object.keys(takeovers).filter(sub => takeovers[sub]);
  const suspiciousSubdomains = Object.keys(threatScores).filter(sub => threatScores[sub] > 50);

  return (
    <div className="space-y-6">
      {/* Subdomain Takeover */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
          Subdomain Takeover Vulnerabilities
        </h3>
        {vulnerableSubdomains.length === 0 ? (
          <div className="bg-success-50 border border-success-200 rounded-md p-4">
            <p className="text-sm text-success-800">No takeover vulnerabilities detected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {vulnerableSubdomains.map(subdomain => (
              <div key={subdomain} className="bg-danger-50 border border-danger-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-danger-800">{subdomain}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                    Vulnerable
                  </span>
                </div>
                {scan.results?.cnames?.[subdomain] && (
                  <p className="mt-1 text-xs text-danger-700">
                    CNAME: {scan.results.cnames[subdomain]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Threat Intelligence */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Shield className="mr-2 h-5 w-5 text-orange-500" />
          Threat Intelligence
        </h3>
        {suspiciousSubdomains.length === 0 ? (
          <div className="bg-success-50 border border-success-200 rounded-md p-4">
            <p className="text-sm text-success-800">No suspicious activity detected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suspiciousSubdomains.map(subdomain => (
              <div key={subdomain} className="bg-warning-50 border border-warning-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-warning-800">{subdomain}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                    Threat Score: {threatScores[subdomain]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanDetails;