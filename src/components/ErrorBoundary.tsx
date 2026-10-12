import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw, Smartphone, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoToAdmin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  private handleGoToMonitored = () => {
    if (typeof window !== 'undefined') {
      window.location.href = window.location.origin + window.location.pathname + '?conectar=1';
    }
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch {}
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Recuperação de Acesso</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ocorreu uma instabilidade ao carregar a interface no navegador do celular.
              </p>
            </div>

            <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800/80 text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-28">
              {this.state.error?.message || 'Erro inesperado de execução'}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recarregar Aplicativo</span>
              </button>

              <button
                onClick={this.handleGoToAdmin}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4 text-indigo-400" />
                <span>Abrir Painel do Administrador (Pai)</span>
              </button>

              <button
                onClick={this.handleGoToMonitored}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Abrir Modo Celular Conectado (Filho)</span>
              </button>

              <button
                onClick={this.handleResetStorage}
                className="w-full py-2 bg-transparent hover:bg-slate-800 text-slate-500 hover:text-slate-300 font-medium text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar cache local e restaurar padrões</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
