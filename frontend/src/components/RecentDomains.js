import React, { useState, useEffect } from 'react';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const RecentDomainsSuggestions = ({ onSelectDomain, className = "" }) => {
  const [recentDomains, setRecentDomains] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadRecentDomains();
  }, []);

  const loadRecentDomains = () => {
    try {
      const saved = localStorage.getItem('recent_domains');
      if (saved) {
        const domains = JSON.parse(saved);
        setRecentDomains(domains.slice(0, 8)); // Show only last 8
      }
    } catch (error) {
      console.warn('Failed to load recent domains:', error);
    }
  };

  const addRecentDomain = (domain) => {
    try {
      const saved = localStorage.getItem('recent_domains');
      let domains = saved ? JSON.parse(saved) : [];
      
      // Remove if already exists
      domains = domains.filter(d => d.domain !== domain);
      
      // Add to beginning
      domains.unshift({
        domain,
        timestamp: new Date().toISOString(),
        scanCount: (domains.find(d => d.domain === domain)?.scanCount || 0) + 1
      });
      
      // Keep only last 20 domains
      domains = domains.slice(0, 20);
      
      localStorage.setItem('recent_domains', JSON.stringify(domains));
      setRecentDomains(domains.slice(0, 8));
    } catch (error) {
      console.warn('Failed to save recent domain:', error);
    }
  };

  const removeRecentDomain = (domainToRemove) => {
    try {
      const updated = recentDomains.filter(d => d.domain !== domainToRemove);
      localStorage.setItem('recent_domains', JSON.stringify(updated));
      setRecentDomains(updated);
      toast.success('Domain removed from recent list');
    } catch (error) {
      console.warn('Failed to remove recent domain:', error);
    }
  };

  const clearAllRecent = () => {
    try {
      localStorage.removeItem('recent_domains');
      setRecentDomains([]);
      toast.success('Cleared all recent domains');
    } catch (error) {
      console.warn('Failed to clear recent domains:', error);
    }
  };

  const handleSelectDomain = (domain) => {
    onSelectDomain(domain);
    addRecentDomain(domain);
    setShowSuggestions(false);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = now - past;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Export the addRecentDomain function so it can be used elsewhere
  React.useImperativeHandle(React.createRef(), () => ({
    addRecentDomain
  }));

  if (recentDomains.length === 0) return null;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Recent Domains</h3>
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              {recentDomains.length}
            </span>
          </div>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showSuggestions ? 'Hide' : 'Show'}
          </button>
        </div>

        {showSuggestions && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentDomains.map((item, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all"
                  onClick={() => handleSelectDomain(item.domain)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.domain}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                      {item.scanCount > 1 && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          {item.scanCount} scans
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentDomain(item.domain);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                    title="Remove from recent"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <button
                onClick={clearAllRecent}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear all
              </button>
              <span className="text-xs text-gray-500">
                Click on a domain to reuse it
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for using recent domains functionality
export const useRecentDomains = () => {
  const addRecentDomain = (domain) => {
    try {
      const saved = localStorage.getItem('recent_domains');
      let domains = saved ? JSON.parse(saved) : [];
      
      // Remove if already exists
      domains = domains.filter(d => d.domain !== domain);
      
      // Add to beginning
      domains.unshift({
        domain,
        timestamp: new Date().toISOString(),
        scanCount: (domains.find(d => d.domain === domain)?.scanCount || 0) + 1
      });
      
      // Keep only last 20 domains
      domains = domains.slice(0, 20);
      
      localStorage.setItem('recent_domains', JSON.stringify(domains));
    } catch (error) {
      console.warn('Failed to save recent domain:', error);
    }
  };

  const getRecentDomains = () => {
    try {
      const saved = localStorage.getItem('recent_domains');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load recent domains:', error);
      return [];
    }
  };

  return { addRecentDomain, getRecentDomains };
};

export default RecentDomainsSuggestions;