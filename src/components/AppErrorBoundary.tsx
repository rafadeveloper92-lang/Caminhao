import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Evita ecrã em branco quando um erro de renderização não tratado ocorre;
 * mostra mensagem e permite recarregar a página.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AppErrorBoundary:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#141414] text-gray-200 p-6 font-sans flex flex-col gap-4">
          <p className="font-bold text-lg">Ocorreu um erro na aplicação.</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Pode recarregar a página para tentar de novo. Se o problema continuar, verifique se o ficheiro de cópia que importou é compatível com o RotaCam.
          </p>
          <pre className="text-xs text-red-300/90 whitespace-pre-wrap break-words bg-black/40 rounded-lg p-4 border border-white/10">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="self-start rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
