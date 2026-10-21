import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="card crm-alert-card alert-error p-4 m-4 text-center">
          <div className="d-flex justify-content-center mb-3">
            <AlertTriangle size={36} color="#ef4444" />
          </div>
          <h4 className="fw-bold mb-2">{this.props.fallbackTitle || 'Something went wrong while loading this section.'}</h4>
          <p className="text-muted mb-3">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            className="btn btn-primary d-inline-flex align-items-center gap-2"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RotateCcw size={16} />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
