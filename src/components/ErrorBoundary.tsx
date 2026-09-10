import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: ''
  };

  public static getDerivedStateFromError(_: Error): State {
    return {
      hasError: true,
      errorId: `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AURA ErrorBoundary] Caught frontend runtime exception:', error, errorInfo);
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        console.error('Error in ErrorBoundary onError handler:', e);
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndRestart = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen w-full bg-[#070913] text-white flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0e1122]/90 backdrop-blur-2xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-white">Something went wrong</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected interface error occurred. Your personal data and matches remain completely secure.
              </p>
              <div className="inline-block px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-500">
                Reference ID: {this.state.errorId}
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-fuchsia-950/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearAndRestart}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Local Cache & Restart</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>AURA 18+ Privacy & Security Guard</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
