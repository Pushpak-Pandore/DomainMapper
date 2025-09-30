import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { DashboardProvider } from './contexts/DashboardContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import ScanDetails from './pages/ScanDetails';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';

function App() {

  return (
    <ThemeProvider>
      <DashboardProvider>
        <ReactQueryProvider>
          <WebSocketProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/new-scan" element={<NewScan />} />
                  <Route path="/scan/:scanId" element={<ScanDetails />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--toast-bg)',
                    color: 'var(--toast-color)',
                    border: '1px solid var(--toast-border)',
                  },
                  success: {
                    style: {
                      background: '#10B981',
                      color: '#ffffff',
                    },
                  },
                  error: {
                    style: {
                      background: '#EF4444',
                      color: '#ffffff',
                    },
                  },
                  loading: {
                    style: {
                      background: '#3B82F6',
                      color: '#ffffff',
                    },
                  },
                }}
              />
              <KeyboardShortcutsHelp />
            </Router>
          </WebSocketProvider>
        </ReactQueryProvider>
      </DashboardProvider>
    </ThemeProvider>
  );
}

export default App;