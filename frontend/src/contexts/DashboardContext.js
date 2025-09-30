import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [dashboardConfig, setDashboardConfig] = useState(() => {
    const saved = localStorage.getItem('domainmapper-dashboard-config');
    return saved ? JSON.parse(saved) : {
      layout: 'grid',
      widgets: {
        stats: { enabled: true, position: 0 },
        recentScans: { enabled: true, position: 1 },
        charts: { enabled: true, position: 2 },
        quickActions: { enabled: true, position: 3 }
      },
      theme: 'default',
      autoRefresh: 30000, // 30 seconds
      compactMode: false
    };
  });

  const [scanMetrics, setScanMetrics] = useState({
    totalScans: 0,
    activeScans: 0,
    totalSubdomains: 0,
    vulnerableSubdomains: 0,
    avgScanTime: 0,
    successRate: 0,
    topDomains: [],
    scanHistory: []
  });

  const updateDashboardConfig = (newConfig) => {
    setDashboardConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('domainmapper-dashboard-config', JSON.stringify(updated));
      return updated;
    });
  };

  const updateScanMetrics = (metrics) => {
    setScanMetrics(prev => ({ ...prev, ...metrics }));
  };

  const resetDashboard = () => {
    const defaultConfig = {
      layout: 'grid',
      widgets: {
        stats: { enabled: true, position: 0 },
        recentScans: { enabled: true, position: 1 },
        charts: { enabled: true, position: 2 },
        quickActions: { enabled: true, position: 3 }
      },
      theme: 'default',
      autoRefresh: 30000,
      compactMode: false
    };
    updateDashboardConfig(defaultConfig);
  };

  return (
    <DashboardContext.Provider value={{
      dashboardConfig,
      scanMetrics,
      updateDashboardConfig,
      updateScanMetrics,
      resetDashboard
    }}>
      {children}
    </DashboardContext.Provider>
  );
};