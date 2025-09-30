import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, formatDuration } from 'date-fns';

const ScanDurationTracker = ({ scanId, startTime, endTime, status, currentStep, progress = 0 }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);

  // Update current time every second for real-time duration
  useEffect(() => {
    if (status === 'running') {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Calculate estimated time remaining
  useEffect(() => {
    if (status === 'running' && progress > 0 && startTime) {
      const elapsed = (currentTime - new Date(startTime)) / 1000; // seconds
      const totalEstimated = (elapsed / progress) * 100;
      const remaining = totalEstimated - elapsed;
      setEstimatedTimeRemaining(Math.max(0, remaining));
    }
  }, [currentTime, progress, startTime, status]);

  const formatDurationSeconds = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getCurrentDuration = () => {
    if (!startTime) return 0;
    if (endTime) {
      return (new Date(endTime) - new Date(startTime)) / 1000;
    }
    return (currentTime - new Date(startTime)) / 1000;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'queued': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return PlayIcon;
      case 'completed': return CheckCircleIcon;
      case 'failed': return ExclamationCircleIcon;
      case 'queued': return ClockIcon;
      default: return ClockIcon;
    }
  };

  const StatusIcon = getStatusIcon();
  const duration = getCurrentDuration();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <motion.div
            animate={status === 'running' ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 2, repeat: status === 'running' ? Infinity : 0, ease: "linear" }}
          >
            <StatusIcon className={`h-5 w-5 ${getStatusColor()}`} />
          </motion.div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Scan Duration
          </h3>
        </div>
        <div className={`text-sm font-mono ${getStatusColor()}`}>
          {formatDurationSeconds(duration)}
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'running' && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {currentStep || 'Processing...'}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Time Details */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Started</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {startTime ? formatDistanceToNow(new Date(startTime), { addSuffix: true }) : 'Not started'}
          </p>
        </div>
        
        {status === 'running' && estimatedTimeRemaining !== null && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">ETA</p>
            <p className="font-medium text-blue-600">
              {formatDurationSeconds(estimatedTimeRemaining)}
            </p>
          </div>
        )}
        
        {endTime && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">Completed</p>
            <p className="font-medium text-green-600">
              {formatDistanceToNow(new Date(endTime), { addSuffix: true })}
            </p>
          </div>
        )}
      </div>

      {/* Performance Indicator */}
      {status === 'completed' && duration > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center space-x-2 text-xs">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
            <span className="text-green-700 dark:text-green-300">
              Performance: {duration < 60 ? 'Excellent' : duration < 300 ? 'Good' : 'Normal'}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Enhanced version with historical data and comparison
export const AdvancedScanDurationTracker = ({ 
  scanId, 
  startTime, 
  endTime, 
  status, 
  currentStep, 
  progress = 0,
  historicalData = [] 
}) => {
  const [showComparison, setShowComparison] = useState(false);
  
  const currentDuration = getCurrentDuration();
  const avgHistoricalDuration = historicalData.length > 0 
    ? historicalData.reduce((sum, scan) => sum + scan.duration, 0) / historicalData.length 
    : null;

  function getCurrentDuration() {
    if (!startTime) return 0;
    if (endTime) {
      return (new Date(endTime) - new Date(startTime)) / 1000;
    }
    return (new Date() - new Date(startTime)) / 1000;
  }

  const getPerformanceComparison = () => {
    if (!avgHistoricalDuration) return null;
    
    const ratio = currentDuration / avgHistoricalDuration;
    if (ratio < 0.8) return { status: 'faster', text: 'Faster than usual', color: 'text-green-600' };
    if (ratio > 1.2) return { status: 'slower', text: 'Slower than usual', color: 'text-amber-600' };
    return { status: 'normal', text: 'Normal speed', color: 'text-blue-600' };
  };

  const comparison = getPerformanceComparison();

  return (
    <div className="space-y-4">
      <ScanDurationTracker
        scanId={scanId}
        startTime={startTime}
        endTime={endTime}
        status={status}
        currentStep={currentStep}
        progress={progress}
      />
      
      {/* Historical Comparison */}
      {avgHistoricalDuration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Performance Analysis
            </h4>
            <motion.div
              animate={{ rotate: showComparison ? 180 : 0 }}
              className="text-gray-400"
            >
              ▼
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-3"
              >
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Current Duration</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDurationSeconds(currentDuration)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Avg Duration</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDurationSeconds(avgHistoricalDuration)}
                    </p>
                  </div>
                </div>
                
                {comparison && (
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <TrendingUpIcon className={`h-4 w-4 ${comparison.color}`} />
                    <span className={`text-xs font-medium ${comparison.color}`}>
                      {comparison.text}
                    </span>
                  </div>
                )}
                
                {/* Mini Chart */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Recent Scans</p>
                  <div className="flex items-end space-x-1 h-8">
                    {historicalData.slice(-10).map((scan, index) => {
                      const height = Math.max(4, (scan.duration / Math.max(...historicalData.map(s => s.duration))) * 32);
                      return (
                        <motion.div
                          key={scan.id || index}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}px` }}
                          transition={{ delay: index * 0.1 }}
                          className="w-2 bg-blue-200 dark:bg-blue-800 rounded-sm"
                          title={`${formatDurationSeconds(scan.duration)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

function formatDurationSeconds(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

export default ScanDurationTracker;