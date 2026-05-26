import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(1);
  const timers = useRef<Map<number, number>>(new Map());

  const remove = useCallback((id: number) => {
    const handle = timers.current.get(id);
    if (handle) window.clearTimeout(handle);
    timers.current.delete(id);
    setItems((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = seq.current++;
      setItems((prev) => [...prev, { id, message, variant }]);
      const handle = window.setTimeout(() => remove(id), 3200);
      timers.current.set(id, handle);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show: (message, variant = 'info') => push(message, variant),
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-stretch gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto mx-auto w-full max-w-md"
            >
              <div
                className={[
                  'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md',
                  item.variant === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-50',
                  item.variant === 'error' && 'border-red-500/25 bg-red-500/10 text-red-50',
                  item.variant === 'info' && 'border-white/10 bg-[#1f1f1f]/95 text-white',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="status"
                aria-live="polite"
              >
                <div className="mt-0.5">
                  {item.variant === 'success' && <CheckCircle2 className="text-emerald-300" size={18} />}
                  {item.variant === 'error' && <AlertTriangle className="text-red-300" size={18} />}
                  {item.variant === 'info' && <Info className="text-blue-300" size={18} />}
                </div>
                <p className="flex-1 text-sm font-semibold leading-snug">{item.message}</p>
                <button
                  type="button"
                  className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                  onClick={() => remove(item.id)}
                  aria-label={t('close_toast')}
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
