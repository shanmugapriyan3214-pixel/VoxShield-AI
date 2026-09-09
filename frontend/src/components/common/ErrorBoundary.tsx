import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error securely without exposing sensitive secrets
    console.error('VoxShield Error Boundary caught error:', error.message, errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.state = { hasError: false, errorMessage: '' };
    try {
      this.setState({ hasError: false, errorMessage: '' });
    } catch {}
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="bg-cyber-surface border-2 border-cyber-crimson rounded-3xl p-6 sm:p-8 shadow-crimson-glow space-y-4 my-4 max-w-2xl mx-auto animate-fade-in">
          <div className="flex items-center gap-3 text-cyber-crimson">
            <div className="p-3 rounded-2xl bg-cyber-crimson/20 border border-cyber-crimson">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyber-crimson font-bold">
                SUBSYSTEM FAULT ISOLATION
              </div>
              <h3 className="text-base font-bold text-cyber-text font-mono">
                {this.props.fallbackTitle || 'Component Error Intercepted'}
              </h3>
            </div>
          </div>

          <p className="text-xs font-mono text-cyber-muted leading-relaxed">
            {this.props.fallbackMessage ||
              'A localized interface exception was caught by VoxShield AI Error Boundary. The core platform security invariants remain active.'}
          </p>

          <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border text-xs font-mono text-cyber-crimson select-all overflow-x-auto">
            {this.state.errorMessage}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="py-2.5 px-4 rounded-xl bg-cyber-cyan hover:bg-cyan-300 text-cyber-bg font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-cyan-glow transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recover Component</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="py-2.5 px-4 rounded-xl bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-xs font-mono text-cyber-muted hover:text-cyber-text font-bold uppercase tracking-wider transition-all"
            >
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
