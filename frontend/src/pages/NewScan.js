import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Settings,
  Globe,
  Zap,
  Shield,
  Search,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { scanService } from '../services/api';

const NewScan = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    domain: '',
    mode: 'both',
    wordlist: '',
    threads: 50,
    enable_fingerprint: false,
    enable_threat: false,
    enable_takeover: false,
    enable_changes: false,
    sources: []
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableSources = [
    { id: 'crtsh', name: 'crt.sh', description: 'Certificate Transparency Logs' },
    { id: 'alienvault', name: 'AlienVault OTX', description: 'Threat Intelligence' },
    { id: 'threatcrowd', name: 'ThreatCrowd', description: 'Community Threat Data' },
    { id: 'wayback', name: 'Wayback Machine', description: 'Internet Archive' },
    { id: 'hackertarget', name: 'HackerTarget', description: 'Security Tools API' },
    { id: 'rapiddns', name: 'RapidDNS', description: 'DNS Records Database' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSourceToggle = (sourceId) => {
    setFormData(prev => ({
      ...prev,
      sources: prev.sources.includes(sourceId)
        ? prev.sources.filter(id => id !== sourceId)
        : [...prev.sources, sourceId]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.domain.trim()) {
      newErrors.domain = 'Domain is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(formData.domain.trim())) {
      newErrors.domain = 'Please enter a valid domain (e.g., example.com)';
    }
    
    if (formData.threads < 1 || formData.threads > 200) {
      newErrors.threads = 'Threads must be between 1 and 200';
    }
    
    if ((formData.mode === 'active' || formData.mode === 'both') && !formData.wordlist.trim()) {
      // Optional: we can use default wordlist on backend
      // newErrors.wordlist = 'Wordlist is required for active scanning';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    try {
      const scanData = {
        ...formData,
        domain: formData.domain.trim().toLowerCase(),
        sources: formData.sources.length > 0 ? formData.sources : null
      };
      
      const response = await scanService.createScan(scanData);
      
      // Navigate to scan details page
      navigate(`/scan/${response.data.scan_id}`);
    } catch (error) {
      console.error('Error creating scan:', error);
      setErrors({ submit: error.response?.data?.detail || 'Failed to create scan. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Subdomain Scan</h1>
        <p className="mt-2 text-sm text-gray-700">
          Configure and start a new subdomain enumeration scan
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Basic Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain */}
            <div className="md:col-span-2">
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                Target Domain *
              </label>
              <input
                type="text"
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                  errors.domain
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
                placeholder="example.com"
              />
              {errors.domain && <p className="mt-1 text-sm text-red-600">{errors.domain}</p>}
            </div>
            
            {/* Scan Mode */}
            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1">
                Scan Mode
              </label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="both">Both (Passive + Active)</option>
                <option value="passive">Passive Only</option>
                <option value="active">Active Only</option>
              </select>
            </div>
            
            {/* Threads */}
            <div>
              <label htmlFor="threads" className="block text-sm font-medium text-gray-700 mb-1">
                Threads
              </label>
              <input
                type="number"
                id="threads"
                name="threads"
                min="1"
                max="200"
                value={formData.threads}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                  errors.threads
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
              />
              {errors.threads && <p className="mt-1 text-sm text-red-600">{errors.threads}</p>}
            </div>
            
            {/* Wordlist - only show if active mode */}
            {(formData.mode === 'active' || formData.mode === 'both') && (
              <div className="md:col-span-2">
                <label htmlFor="wordlist" className="block text-sm font-medium text-gray-700 mb-1">
                  Wordlist Path
                  <span className="text-gray-500 text-xs ml-1">(optional - uses default if empty)</span>
                </label>
                <input
                  type="text"
                  id="wordlist"
                  name="wordlist"
                  value={formData.wordlist}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="wordlists/custom.txt"
                />
              </div>
            )}
          </div>
        </div>

        {/* Advanced Features */}
        <div className="bg-white shadow rounded-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Advanced Features
            </h2>
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </button>
          </div>
          
          {showAdvanced && (
            <div className="mt-6 space-y-4">
              {/* Feature Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureToggle
                  id="enable_fingerprint"
                  name="enable_fingerprint"
                  checked={formData.enable_fingerprint}
                  onChange={handleInputChange}
                  icon={Search}
                  title="Technology Fingerprinting"
                  description="Detect web technologies, servers, and frameworks"
                />
                <FeatureToggle
                  id="enable_threat"
                  name="enable_threat"
                  checked={formData.enable_threat}
                  onChange={handleInputChange}
                  icon={Shield}
                  title="Threat Intelligence"
                  description="Enrich results with threat intelligence data"
                />
                <FeatureToggle
                  id="enable_takeover"
                  name="enable_takeover"
                  checked={formData.enable_takeover}
                  onChange={handleInputChange}
                  icon={AlertTriangle}
                  title="Takeover Detection"
                  description="Scan for subdomain takeover vulnerabilities"
                />
                <FeatureToggle
                  id="enable_changes"
                  name="enable_changes"
                  checked={formData.enable_changes}
                  onChange={handleInputChange}
                  icon={Activity}
                  title="Change Detection"
                  description="Compare with previous scans to detect changes"
                />
              </div>

              {/* Passive Sources Selection */}
              {(formData.mode === 'passive' || formData.mode === 'both') && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Passive Sources
                    <span className="text-gray-500 text-xs ml-1">(leave empty for all sources)</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableSources.map(source => (
                      <div key={source.id} className="flex items-center">
                        <input
                          id={source.id}
                          type="checkbox"
                          checked={formData.sources.includes(source.id)}
                          onChange={() => handleSourceToggle(source.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={source.id} className="ml-3 block">
                          <span className="text-sm font-medium text-gray-700">{source.name}</span>
                          <span className="block text-xs text-gray-500">{source.description}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {errors.submit}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Activity className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Creating Scan...
              </>
            ) : (
              <>
                <Play className="-ml-1 mr-2 h-4 w-4" />
                Start Scan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const FeatureToggle = ({ id, name, checked, onChange, icon: Icon, title, description }) => {
  return (
    <div className="relative flex items-start">
      <div className="flex items-center h-5">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
      </div>
      <div className="ml-3">
        <label htmlFor={id} className="flex items-center cursor-pointer">
          <Icon className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
};

export default NewScan;