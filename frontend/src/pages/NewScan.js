import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import api from '../services/api';

const NewScan = () => {
  const navigate = useNavigate();
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/scan', formData);
      navigate(`/scan/${response.data.scan_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Subdomain Scan</h1>
        <p className="text-gray-600">Configure and start a new subdomain enumeration scan</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Basic Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Domain *
              </label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                placeholder="example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enumeration Mode
              </label>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="both">Both (Passive + Active)</option>
                <option value="passive">Passive Only</option>
                <option value="active">Active Only</option>
                <option value="modern">Modern Comprehensive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Threads
              </label>
              <input
                type="number"
                name="threads"
                value={formData.threads}
                onChange={handleInputChange}
                min="1"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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