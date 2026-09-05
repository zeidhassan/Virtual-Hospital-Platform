import { Component } from 'react';

// Catches a render-time crash anywhere below it (the Avatar null-name bug
// fixed earlier this project is exactly the shape of error this exists
// for) so one bad component blanks a fallback screen instead of the whole
// app going white with no way back.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-muted px-6">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
            <p className="text-sm text-text-secondary">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
