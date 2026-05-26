import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { ToastProvider } from './components/ToastStack';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function BootstrappedApp() {
  const { ready, error } = useDatabase();

  if (error) {
    return (
      <div className="min-h-screen bg-[#141414] text-red-300 p-6 font-sans">
        <p className="font-bold mb-2">Não foi possível abrir o banco local.</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#141414] text-gray-400 flex items-center justify-center p-6 font-sans text-sm">
        Carregando banco local (SQLite)…
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ToastProvider>
        <DatabaseProvider>
          <BootstrappedApp />
        </DatabaseProvider>
      </ToastProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
