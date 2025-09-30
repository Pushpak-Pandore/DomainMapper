import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Settings as SettingsIcon, 
  AlertCircle,
  DocumentDuplicateIcon,
  ClockIcon,
  SaveIcon,
  RefreshCwIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import useAutoSave from '../hooks/useAutoSave';
import { useRecentDomains } from '../components/RecentDomains';
import RecentDomainsSuggestions from '../components/RecentDomains';
import { HelpTooltip, InfoTooltip, WarningTooltip } from '../components/Tooltip';
import toast from 'react-hot-toast';

const NewScan = () => {
  const navigate = useNavigate();
  const { addRecentDomain } = useRecentDomains();
  
  const [formData, setFormData] = useState({
    domain: '',
    mode: 'both',
    threads: 50,
    enable_fingerprint: false,
    enable_threat: false,
    enable_takeover: false,
    enable_changes: false,
    enable_modern_enum: true,
    use_subfinder: true,
    use_assetfinder: true,
    use_amass: false,
    probe_http: true,
    vulnerability_scan: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [scanStarted, setScanStarted] = useState(false);

  // Auto-save functionality
  const {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    loadSavedData,
    clearSavedData,
    hasSavedData
  } = useAutoSave({
    data: formData,
    key: 'new_scan_form',
    delay: 1000,
    enabled: !scanStarted,
    showToasts: false
  });

  // Load saved data on mount
  useEffect(() => {
    if (hasSavedData()) {
      const saved = loadSavedData();
      if (saved && saved.domain) {
        setFormData(saved);
        toast.success('📥 Restored previous scan configuration');
      }
    }
  }, []);

  // Timer for scan duration estimation
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDomainSelect = (domain) => {
    setFormData(prev => ({ ...prev, domain }));
    toast.success(`🎯 Selected domain: ${domain}`);
  };

  const copyDomain = async (domain) => {
    try {
      await navigator.clipboard.writeText(domain);
      toast.success('📋 Domain copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy domain');
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${seconds}s`;
  };

  const getEstimatedDuration = () => {
    let baseTime = 30; // Base 30 seconds
    
    if (formData.mode === 'both') baseTime += 60;
    if (formData.enable_modern_enum) baseTime += 120;
    if (formData.use_amass) baseTime += 300; // Amass is slow
    if (formData.enable_fingerprint) baseTime += 60;
    if (formData.enable_threat) baseTime += 45;
    if (formData.enable_takeover) baseTime += 30;
    if (formData.vulnerability_scan) baseTime += 180;
    
    return Math.ceil(baseTime + (formData.threads / 10)); // More threads = slightly more time for coordination
  };

  const clearForm = () => {
    setFormData({
      domain: '',
      mode: 'both',
      threads: 50,
      enable_fingerprint: false,
      enable_threat: false,
      enable_takeover: false,
      enable_changes: false,
      enable_modern_enum: true,
      use_subfinder: true,
      use_assetfinder: true,
      use_amass: false,
      probe_http: true,
      vulnerability_scan: false
    });
    clearSavedData();
    toast.success('🗑️ Form cleared');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setScanStarted(true);
    setDuration(0);

    try {
      const response = await api.post('/api/scan', formData);
      
      // Add to recent domains
      addRecentDomain(formData.domain);
      
      // Clear auto-saved data since scan started
      clearSavedData();
      
      toast.success(`🚀 Scan started for ${formData.domain}`);
      navigate(`/scan/${response.data.scan_id}`);
    } catch (err) {
      setScanStarted(false);
      setError(err.response?.data?.detail || 'Failed to start scan');
      toast.error('Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Auto-save Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Subdomain Scan</h1>
          <p className="text-gray-600">Configure and start a new subdomain enumeration scan</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Auto-save Status */}
          <div className="flex items-center space-x-2">
            {isSaving ? (
              <div className="flex items-center text-blue-600">
                <RefreshCwIcon className="h-4 w-4 animate-spin mr-1" />
                <span className="text-sm">Saving...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center text-green-600">
                <SaveIcon className="h-4 w-4 mr-1" />
                <span className="text-sm">Auto-saved {Math.floor((Date.now() - lastSaved) / 1000)}s ago</span>
              </div>
            ) : null}
          </div>
          
          <button
            onClick={clearForm}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear form
          </button>
        </div>
      </div>

      {/* Recent Domains Suggestions */}
      <RecentDomainsSuggestions 
        onSelectDomain={handleDomainSelect}
        className="mb-6"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Indicator while loading */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800 font-medium">Starting scan for {formData.domain}...</span>
              </div>
              <div className="text-blue-600 font-mono">
                {formatDuration(duration)}
              </div>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              Estimated completion time: ~{Math.ceil(getEstimatedDuration() / 60)} minutes
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center"
          >
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </motion.div>
        )}

        {/* Basic Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Configuration</h2>
            <InfoTooltip content="Essential settings to configure your subdomain enumeration scan">
              <span className="text-sm text-gray-500">Required settings</span>
            </InfoTooltip>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <HelpTooltip content="Enter the target domain without protocol (e.g., example.com, not https://example.com)">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Domain *
                </label>
              </HelpTooltip>
              <div className="relative">
                <input
                  type="text"
                  name="domain"
                  value={formData.domain}
                  onChange={handleInputChange}
                  placeholder="example.com"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
                {formData.domain && (
                  <button
                    type="button"
                    onClick={() => copyDomain(formData.domain)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Copy domain"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <HelpTooltip content="Choose the enumeration strategy based on your needs:\n• Both: Comprehensive (Passive + Active)\n• Passive: Stealthy, uses public sources\n• Active: Faster, may leave traces\n• Modern: Latest tools with advanced features">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enumeration Mode
                </label>
              </HelpTooltip>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="both">🔍 Both (Passive + Active)</option>
                <option value="passive">🕵️ Passive Only</option>
                <option value="active">⚡ Active Only</option>
                <option value="modern">🚀 Modern Comprehensive</option>
              </select>
            </div>

            <div>
              <HelpTooltip content="Number of concurrent threads for scanning. More threads = faster but more resource intensive. Recommended: 50-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Threads ({formData.threads})
                </label>
              </HelpTooltip>
              <input
                type="range"
                name="threads"
                value={formData.threads}
                onChange={handleInputChange}
                min="1"
                max="200"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>50</span>
                <span>100</span>
                <span>200</span>
              </div>
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Estimated Duration
              </label>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-lg font-semibold text-blue-900">
                  ~{Math.ceil(getEstimatedDuration() / 60)} minutes
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  Based on selected features
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Enumeration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modern Enumeration Tools</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="enable_modern_enum"
                checked={formData.enable_modern_enum}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Enable Modern Enumeration</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="use_subfinder"
                checked={formData.use_subfinder}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={!formData.enable_modern_enum}
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Use Subfinder</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="use_assetfinder"
                checked={formData.use_assetfinder}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={!formData.enable_modern_enum}
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Use AssetFinder</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="use_amass"
                checked={formData.use_amass}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={!formData.enable_modern_enum}
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Use Amass (Slower)</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="probe_http"
                checked={formData.probe_http}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={!formData.enable_modern_enum}
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Probe HTTP Status</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="vulnerability_scan"
                checked={formData.vulnerability_scan}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={!formData.enable_modern_enum}
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Vulnerability Scanning</label>
            </div>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="enable_fingerprint"
                checked={formData.enable_fingerprint}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Technology Fingerprinting</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="enable_threat"
                checked={formData.enable_threat}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Threat Intelligence</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="enable_takeover"
                checked={formData.enable_takeover}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Subdomain Takeover Detection</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="enable_changes"
                checked={formData.enable_changes}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Change Detection</label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.domain}
            className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Scan
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewScan;