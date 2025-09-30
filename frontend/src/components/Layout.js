import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  BarChart3, 
  Settings, 
  Search,
  Shield,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocketContext } from '../providers/WebSocketProvider';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

const Layout = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { connectionStatus, isConnected } = useWebSocketContext();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'New Scan', href: '/new-scan', icon: Plus },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const currentPage = navigation.find(item => item.href === location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="ml-3 flex items-center">
                <Shield className="h-7 w-7 text-blue-600" />
                <div className="ml-2">
                  <h1 className="text-lg font-bold text-gray-900">DomainMapper</h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                <Activity className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`hidden sm:inline text-xs font-medium ${
                  isConnected ? 'text-green-700' : 'text-red-700'
                }`}>
                  {connectionStatus}
                </span>
              </div>
              
              {/* Quick actions */}
              <Link
                to="/new-scan"
                className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="absolute inset-0 bg-black bg-opacity-25" />
              </motion.div>
              
              {/* Menu Panel */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute top-full left-0 w-72 bg-white shadow-xl border-r border-gray-200 z-50"
              >
                <nav className="p-4 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`mr-4 h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">DomainMapper Pro</h1>
                <p className="text-sm text-gray-500">Advanced Subdomain Enumeration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Activity className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${
                  isConnected ? 'text-green-700' : 'text-red-700'
                }`}>
                  {connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <nav className="hidden lg:block w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
          <div className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8">
          {/* Breadcrumb for mobile */}
          <div className="lg:hidden mb-4">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link to="/" className="text-gray-500 hover:text-gray-700">
                    <Home className="h-4 w-4" />
                  </Link>
                </li>
                {currentPage && currentPage.href !== '/' && (
                  <li>
                    <div className="flex items-center">
                      <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-500 ml-1 md:ml-2 text-sm font-medium">
                        {currentPage.name}
                      </span>
                    </div>
                  </li>
                )}
              </ol>
            </nav>
          </div>
          
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <nav className="flex">
          {navigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex-1 flex flex-col items-center py-2 px-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Bottom padding for mobile navigation */}
      <div className="lg:hidden h-16" />
    </div>
  );
};

export default Layout;