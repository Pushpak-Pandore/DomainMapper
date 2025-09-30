import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  CodeBracketIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const EnhancedExportModal = ({ isOpen, onClose, data, scanInfo = null }) => {
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [includeStatistics, setIncludeStatistics] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportFormats = [
    {
      key: 'json',
      name: 'JSON',
      description: 'Structured data format',
      icon: CodeBracketIcon,
      extension: 'json',
      mimeType: 'application/json'
    },
    {
      key: 'csv',
      name: 'CSV',
      description: 'Excel-compatible spreadsheet',
      icon: TableCellsIcon,
      extension: 'csv',
      mimeType: 'text/csv'
    },
    {
      key: 'html',
      name: 'HTML Report',
      description: 'Rich formatted report',
      icon: DocumentTextIcon,
      extension: 'html',
      mimeType: 'text/html'
    },
    {
      key: 'pdf',
      name: 'PDF Report',
      description: 'Printable document',
      icon: DocumentChartBarIcon,
      extension: 'pdf',
      mimeType: 'application/pdf'
    }
  ];

  const generateStatistics = (data) => {
    if (!data || data.length === 0) return {};

    const stats = {
      totalRecords: data.length,
      uniqueDomains: new Set(data.map(item => item.domain || item.subdomain?.split('.').slice(-2).join('.'))).size,
      liveSubdomains: data.filter(item => item.url || item.http_status).length,
      vulnerableSubdomains: data.filter(item => item.takeover_vulnerable || item.threat_score > 5).length,
      topSources: {},
      statusDistribution: {},
      threatLevels: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Calculate source distribution
    data.forEach(item => {
      if (item.source) {
        stats.topSources[item.source] = (stats.topSources[item.source] || 0) + 1;
      }
      
      if (item.http_status) {
        stats.statusDistribution[item.http_status] = (stats.statusDistribution[item.http_status] || 0) + 1;
      }
      
      if (item.threat_score) {
        if (item.threat_score > 7) stats.threatLevels.high++;
        else if (item.threat_score > 3) stats.threatLevels.medium++;
        else stats.threatLevels.low++;
      }
    });

    return stats;
  };

  const exportToJSON = (data, stats) => {
    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        format: 'json',
        tool: 'DomainMapper Pro v2.0',
        includeStatistics,
        includeCharts
      },
      ...(scanInfo && { scanInfo }),
      ...(includeStatistics && { statistics: stats }),
      data: data
    };

    return JSON.stringify(exportData, null, 2);
  };

  const exportToCSV = (data, stats) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape values containing commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    );

    let csv = csvHeaders + '\n' + csvRows.join('\n');

    // Add statistics as comments at the top if requested
    if (includeStatistics && stats) {
      const statsComments = [
        `# Export generated on ${new Date().toLocaleString()}`,
        `# Total records: ${stats.totalRecords}`,
        `# Unique domains: ${stats.uniqueDomains}`,
        `# Live subdomains: ${stats.liveSubdomains}`,
        `# Vulnerable subdomains: ${stats.vulnerableSubdomains}`,
        `# Tool: DomainMapper Pro v2.0`,
        ''
      ].join('\n');
      csv = statsComments + csv;
    }

    return csv;
  };

  const exportToHTML = (data, stats) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DomainMapper Pro Export Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f1f5f9; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #3b82f6; }
        .stat-number { font-size: 24px; font-weight: bold; color: #1e293b; }
        .stat-label { color: #64748b; font-size: 14px; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f8fafc; font-weight: 600; color: #374151; }
        .vulnerable { background-color: #fef2f2; color: #dc2626; }
        .live { background-color: #f0fdf4; color: #16a34a; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🗺️ DomainMapper Pro</div>
            <h1>Export Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            ${scanInfo ? `<p><strong>Scan:</strong> ${scanInfo.domain || 'Multiple Domains'}</p>` : ''}
        </div>
        
        ${includeStatistics && stats ? `
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${stats.totalRecords.toLocaleString()}</div>
                <div class="stat-label">Total Records</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.uniqueDomains}</div>
                <div class="stat-label">Unique Domains</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.liveSubdomains}</div>
                <div class="stat-label">Live Subdomains</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.vulnerableSubdomains}</div>
                <div class="stat-label">Vulnerable</div>
            </div>
        </div>
        ` : ''}

        <h2>Data Records</h2>
        <table>
            <thead>
                <tr>
                    ${Object.keys(data[0] || {}).map(key => `<th>${key}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map(row => `
                <tr class="${
                  row.takeover_vulnerable ? 'vulnerable' : row.url ? 'live' : ''
                }">
                    ${Object.values(row).map(value => `<td>${value || '-'}</td>`).join('')}
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Report generated by DomainMapper Pro v2.0</p>
            <p>Advanced Subdomain Enumeration Platform</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  };

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

      const stats = includeStatistics ? generateStatistics(data) : null;
      let content, mimeType, filename;

      const selectedFormatInfo = exportFormats.find(f => f.key === selectedFormat);
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = scanInfo?.domain 
        ? `${scanInfo.domain}_${timestamp}` 
        : `domainmapper_export_${timestamp}`;

      switch (selectedFormat) {
        case 'json':
          content = exportToJSON(data, stats);
          mimeType = selectedFormatInfo.mimeType;
          filename = `${baseFilename}.${selectedFormatInfo.extension}`;
          break;
        case 'csv':
          content = exportToCSV(data, stats);
          mimeType = selectedFormatInfo.mimeType;
          filename = `${baseFilename}.${selectedFormatInfo.extension}`;
          break;
        case 'html':
          content = exportToHTML(data, stats);
          mimeType = selectedFormatInfo.mimeType;
          filename = `${baseFilename}.${selectedFormatInfo.extension}`;
          break;
        case 'pdf':
          toast.error('PDF export is coming soon!');
          return;
        default:
          throw new Error('Invalid export format');
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportProgress(100);
      
      setTimeout(() => {
        toast.success(`Exported ${data.length} records to ${selectedFormat.toUpperCase()}`);
        onClose();
        setIsExporting(false);
        setExportProgress(0);
      }, 500);

    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ArrowDownTrayIcon className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Enhanced Export
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  disabled={isExporting}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-96">
              {/* Export Info */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>{data?.length || 0} records</strong> ready for export
                  {scanInfo && (
                    <span className="block mt-1">
                      from scan: <strong>{scanInfo.domain || scanInfo.scan_id}</strong>
                    </span>
                  )}
                </p>
              </div>

              {/* Format Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Export Format
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {exportFormats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.key}
                        onClick={() => setSelectedFormat(format.key)}
                        disabled={isExporting || format.key === 'pdf'}
                        className={`
                          relative p-4 border rounded-lg text-left transition-all
                          ${selectedFormat === format.key
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          }
                          ${format.key === 'pdf' ? 'opacity-50 cursor-not-allowed' : ''}
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`h-5 w-5 ${
                            selectedFormat === format.key
                              ? 'text-blue-600'
                              : 'text-gray-500'
                          }`} />
                          <div>
                            <p className={`font-medium ${
                              selectedFormat === format.key
                                ? 'text-blue-900 dark:text-blue-100'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {format.name}
                              {format.key === 'pdf' && <span className="text-xs text-amber-600 ml-1">(Soon)</span>}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format.description}
                            </p>
                          </div>
                        </div>
                        {selectedFormat === format.key && (
                          <div className="absolute top-2 right-2">
                            <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Export Options
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeStatistics}
                      onChange={(e) => setIncludeStatistics(e.target.checked)}
                      disabled={isExporting}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Include statistics and summary
                    </span>
                  </label>
                  
                  <label className="flex items-center opacity-50 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      disabled={true}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Include charts and graphs <span className="text-xs text-amber-600">(Coming Soon)</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Progress */}
              {isExporting && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Exporting...
                    </span>
                    <span className="text-sm text-gray-500">
                      {exportProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${exportProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  disabled={isExporting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || !data || data.length === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isExporting ? (
                    <>
                      <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Export Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnhancedExportModal;