import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Download, 
  ExternalLink,
  AlertTriangle,
  Shield,
  Activity,
  Globe
} from 'lucide-react';
import api from '../services/api';

const ScanDetails = () => {
  const { scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (scanId) {
      fetchScanDetails();
      const interval = setInterval(() => {
        fetchScanDetails();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [scanId]);

  const fetchScanDetails = async () => {
    try {
      const response = await api.get(`/api/scan/${scanId}`);
      setScan(response.data);
      
      // Stop polling if scan is completed or failed
      if (response.data.status === 'completed' || response.data.status === 'failed') {
        // Could clear interval here if needed
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch scan details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'running':
        return <Clock className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'queued':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
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

  const downloadReport = async (format) => {
    try {
      const response = await api.get(`/api/scan/${scanId}/report/${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${scan.domain}_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Scan</h2>
        <p className="text-gray-600 mb-4">{error || 'Scan not found'}</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{scan.domain}</h1>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon(scan.status)}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(scan.status)}`}>
                {scan.status}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-sm text-gray-600">
                Started {new Date(scan.started_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        
        {scan.status === 'completed' && (
          <div className="flex space-x-2">
            <button
              onClick={() => downloadReport('html')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              HTML
            </button>
            <button
              onClick={() => downloadReport('json')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {scan.status === 'running' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Scan Progress</h3>
            <span className="text-sm text-gray-600">{scan.progress}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${scan.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Globe className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Subdomains</p>
              <p className="text-2xl font-bold text-gray-900">{scan.total_subdomains}</p>
            </div>
          </div>
        </div>

        {scan.results && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Live Subdomains</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {scan.results.live_subdomains ? Object.keys(scan.results.live_subdomains).length : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Vulnerabilities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {scan.results.vulnerabilities ? scan.results.vulnerabilities.length : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Takeover Risk</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {scan.results.takeover_vulnerable ? 
                      Object.values(scan.results.takeover_vulnerable).filter(Boolean).length : 0}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Results */}
      {scan.results && scan.results.subdomains && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Discovered Subdomains</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="divide-y divide-gray-200">
              {scan.results.subdomains.slice(0, 100).map((subdomain, index) => (
                <div key={index} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-900">{subdomain}</span>
                    {scan.results.sources && scan.results.sources[subdomain] && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {scan.results.sources[subdomain]}
                      </span>
                    )}
                    {scan.results.live_subdomains && scan.results.live_subdomains[subdomain] && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">
                        Live
                      </span>
                    )}
                    {scan.results.takeover_vulnerable && scan.results.takeover_vulnerable[subdomain] && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                        Vulnerable
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://${subdomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
              {scan.results.subdomains.length > 100 && (
                <div className="px-6 py-4 text-center text-gray-500">
                  Showing first 100 of {scan.results.subdomains.length} subdomains.
                  Download full report for complete results.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vulnerabilities */}
      {scan.results && scan.results.vulnerabilities && scan.results.vulnerabilities.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Vulnerabilities</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {scan.results.vulnerabilities.map((vuln, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{vuln.title || vuln.type}</h3>
                    <p className="text-sm text-gray-600 mt-1">{vuln.description}</p>
                    {vuln.url && (
                      <p className="text-sm text-gray-500 mt-1 font-mono">{vuln.url}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    vuln.severity === 'high' ? 'bg-red-100 text-red-800' :
                    vuln.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {vuln.severity || 'Unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanDetails;