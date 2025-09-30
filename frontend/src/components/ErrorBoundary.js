import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Analytics Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Analytics Error
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Something went wrong loading the analytics dashboard. Please try refreshing the page.
              </p>
              {this.props.showReload && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-800 dark:text-red-200 px-3 py-1 rounded text-sm"
                >
                  Reload Page
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;