import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Auto-reload on stale bundle/chunk import failures
    const errorStr = String(error?.message || error);
    if (
      errorStr.includes('Failed to fetch dynamically imported module') ||
      errorStr.includes('Failed to load module script') ||
      errorStr.includes('Loading chunk') ||
      errorStr.includes('chunk')
    ) {
      console.warn("Chunk/module load error detected. Automatically reloading page...");
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-red-50 p-8 rounded-xl border border-red-100 max-w-lg text-center shadow-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong.</h2>
            <p className="text-red-600 mb-6 text-sm">
              An unexpected error occurred in this section. Our team has been notified.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
            >
              Refresh Page
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 text-left p-4 bg-white/50 rounded overflow-x-auto text-xs text-red-900 border border-red-200">
                <p className="font-bold mb-1">{this.state.error.toString()}</p>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
