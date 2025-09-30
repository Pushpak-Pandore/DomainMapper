import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import ScanDetails from './pages/ScanDetails';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
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
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </Router>
      </WebSocketProvider>
    </ReactQueryProvider>
  );
}

export default App;