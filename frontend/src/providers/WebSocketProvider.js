import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [clientId] = useState(() => uuidv4());
  const [scanSubscriptions, setScanSubscriptions] = useState(new Set());
  const [isDashboardSubscribed, setIsDashboardSubscribed] = useState(false);
  const [scanUpdates, setScanUpdates] = useState({});
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Determine WebSocket URL
  const wsUrl = React.useMemo(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    let wsProtocol = 'ws://';
    
    // Use secure WebSocket if the page is served over HTTPS
    if (window.location.protocol === 'https:' || backendUrl.startsWith('https://')) {
      wsProtocol = 'wss://';
    }
    
    // Extract host from backend URL
    const urlParts = backendUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}${urlParts}/ws/${clientId}`;
  }, [clientId]);

  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastConnectionTime, setLastConnectionTime] = useState(null);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(wsUrl, {
    onOpen: () => {
      console.log('WebSocket connection opened');
      setConnectionAttempts(0);
      setLastConnectionTime(new Date());
      toast.success('Real-time updates connected', { duration: 2000 });
    },
    onClose: (closeEvent) => {
      console.log('WebSocket connection closed:', closeEvent.code, closeEvent.reason);
      if (closeEvent.code !== 1000) { // Not a normal closure
        toast.error('Real-time updates disconnected', { duration: 3000 });
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setConnectionAttempts(prev => prev + 1);
      if (connectionAttempts < 5) {
        toast.error(`Connection error (attempt ${connectionAttempts + 1}/5)`, { duration: 2000 });
      } else {
        toast.error('Connection failed after multiple attempts', { duration: 5000 });
      }
    },
    shouldReconnect: (closeEvent) => {
      // Reconnect unless it was a normal closure or too many failed attempts
      return closeEvent.code !== 1000 && connectionAttempts < 10;
    },
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber) => {
      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attemptNumber), 30000);
      const jitter = Math.random() * 1000;
      return baseDelay + jitter;
    },
    retryOnError: true,
    onReconnectStop: (numAttempts) => {
      toast.error(`Failed to reconnect after ${numAttempts} attempts`, { duration: 5000 });
    }
  });

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastJsonMessage) {
      console.log('WebSocket message:', lastJsonMessage);
      
      const { type, scan_id } = lastJsonMessage;

      switch (type) {
        case 'scan_progress':
          setScanUpdates(prev => ({
            ...prev,
            [scan_id]: {
              ...prev[scan_id],
              progress: lastJsonMessage.progress,
              step: lastJsonMessage.step,
              subdomains_found: lastJsonMessage.subdomains_found,
              timestamp: lastJsonMessage.timestamp
            }
          }));
          break;

        case 'subdomain_discovered':
          setScanUpdates(prev => ({
            ...prev,
            [scan_id]: {
              ...prev[scan_id],
              newSubdomain: {
                subdomain: lastJsonMessage.subdomain,
                source: lastJsonMessage.source,
                timestamp: lastJsonMessage.timestamp
              }
            }
          }));
          
          // Show toast notification for new subdomain
          toast.success(`New subdomain: ${lastJsonMessage.subdomain}`, {
            duration: 2000,
            position: 'bottom-right'
          });
          break;

        case 'scan_completed':
          setScanUpdates(prev => ({
            ...prev,
            [scan_id]: {
              ...prev[scan_id],
              completed: true,
              total_subdomains: lastJsonMessage.total_subdomains,
              summary: lastJsonMessage.summary,
              timestamp: lastJsonMessage.timestamp
            }
          }));
          
          toast.success(`Scan completed! Found ${lastJsonMessage.total_subdomains} subdomains`, {
            duration: 5000
          });
          break;

        case 'scan_error':
          setScanUpdates(prev => ({
            ...prev,
            [scan_id]: {
              ...prev[scan_id],
              error: lastJsonMessage.error,
              timestamp: lastJsonMessage.timestamp
            }
          }));
          
          toast.error(`Scan failed: ${lastJsonMessage.error}`);
          break;

        case 'dashboard_update':
          // Trigger dashboard refresh
          window.dispatchEvent(new CustomEvent('dashboardUpdate'));
          break;

        case 'analytics_update':
          // Trigger analytics refresh
          window.dispatchEvent(new CustomEvent('analyticsUpdate', {
            detail: lastJsonMessage
          }));
          break;

        case 'subscription_confirmed':
          console.log(`Subscribed to scan: ${scan_id}`);
          break;

        case 'dashboard_subscription_confirmed':
          console.log('Subscribed to dashboard updates');
          break;

        case 'pong':
          console.log('WebSocket ping/pong received');
          break;
      }
    }
  }, [lastJsonMessage]);

  // Subscribe to scan updates
  const subscribeToScan = useCallback((scanId) => {
    if (readyState === ReadyState.OPEN && !scanSubscriptions.has(scanId)) {
      sendJsonMessage({
        type: 'subscribe_scan',
        scan_id: scanId
      });
      setScanSubscriptions(prev => new Set([...prev, scanId]));
    }
  }, [readyState, sendJsonMessage, scanSubscriptions]);

  // Subscribe to dashboard updates
  const subscribeToDashboard = useCallback(() => {
    if (readyState === ReadyState.OPEN && !isDashboardSubscribed) {
      sendJsonMessage({
        type: 'subscribe_dashboard'
      });
      setIsDashboardSubscribed(true);
    }
  }, [readyState, sendJsonMessage, isDashboardSubscribed]);

  // Send ping to keep connection alive
  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      const interval = setInterval(() => {
        sendJsonMessage({ type: 'ping' });
      }, 30000); // Ping every 30 seconds

      return () => clearInterval(interval);
    }
  }, [readyState, sendJsonMessage]);

  const connectionStatus = React.useMemo(() => {
    switch (readyState) {
      case ReadyState.CONNECTING:
        return 'Connecting';
      case ReadyState.OPEN:
        return 'Connected';
      case ReadyState.CLOSING:
        return 'Closing';
      case ReadyState.CLOSED:
        return 'Closed';
      case ReadyState.UNINSTANTIATED:
        return 'Uninstantiated';
      default:
        return 'Unknown';
    }
  }, [readyState]);

  const value = {
    clientId,
    connectionStatus,
    isConnected: readyState === ReadyState.OPEN,
    subscribeToScan,
    subscribeToDashboard,
    scanUpdates,
    setScanUpdates,
    sendJsonMessage
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};