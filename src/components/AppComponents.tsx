import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Truck, BarChart3, Plus, ArrowLeft, Calendar, History, Trash2, Languages, Settings, Search, AlertTriangle, X, Check, MapPin, Navigation, Home, Warehouse } from 'lucide-react';
import { safeFormat } from '../lib/safeFormat';
import { ptBR, es, enUS } from 'date-fns/locale';
import { Work, Trip } from '../types';
import { useTranslation } from 'react-i18next';

const getLocale = (lng: string) => {
  if (lng.startsWith('es')) return es;
  if (lng.startsWith('en')) return enUS;
  return ptBR;
};

export const ConfirmationDialog: React.FC<{ 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", isDanger = true }) => {
  if (!isOpen) return null;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onCancel} 
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="bg-[#1f1f1f] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-10"
      >
        <div className="flex items-center gap-3 mb-4 text-orange-500">
          <AlertTriangle size={24} />
          <h3 id="confirm-dialog-title" className="text-xl font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          {message}
        </p>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 border border-white/5"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg ${
              isDanger ? 'bg-[#E50914] text-white shadow-[#E50914]/20' : 'bg-green-600 text-white shadow-green-600/20'
            }`}
          >
            <Check size={18} />
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode; title: string; onBack?: () => void }> = ({ children, title, onBack }) => {
  const { t, i18n } = useTranslation();
  
  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans">
      <header className="sticky top-0 z-50 bg-[#141414]/90 backdrop-blur-md px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors" id="back-button" type="button" aria-label={t('back_aria')}>
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-[#E50914] flex items-center gap-2">
            <Truck size={24} />
            {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            {[
              { code: 'pt', flag: '🇧🇷' },
              { code: 'es', flag: '🇪🇸' },
              { code: 'en', flag: '🇺🇸' }
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                aria-label={lang.code === 'pt' ? t('lang_pt_aria') : lang.code === 'es' ? t('lang_es_aria') : t('lang_en_aria')}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
                  i18n.language.startsWith(lang.code) 
                    ? 'bg-[#E50914] text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-sm">{lang.flag}</span>
                <span className="text-[10px] font-black uppercase">{lang.code}</span>
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="p-4 pb-24">
        {children}
      </main>
    </div>
  );
};

export const WorkCard: React.FC<{ work: Work; onClick: () => void; onDelete: (e: React.MouseEvent) => void }> = ({ work, onClick, onDelete }) => {
  const { t, i18n } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-[#1f1f1f] border p-4 rounded-xl mb-3 flex justify-between items-center group cursor-pointer transition-all shadow-lg ${
        work.is_finished ? 'border-green-500/40 bg-green-500/10' : 'border-white/5 hover:border-[#E50914]/50'
      }`}
      id={`work-${work.id}`}
    >
      <div className="flex flex-col flex-1 truncate mr-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white truncate">{work.name}</span>
          {work.is_finished && (
            <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest shrink-0">
              OK
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-500 uppercase font-medium mt-1">
          {t('created_at')}: {safeFormat(work.created_at, 'dd/MM/yy', { locale: getLocale(i18n.language) })}
        </span>
        {work.is_finished && work.finished_at && (
          <span className="text-[9px] text-green-500 font-bold uppercase tracking-tighter mt-0.5">
            {t('finished_at')}: {safeFormat(work.finished_at, 'dd/MM/yy', { locale: getLocale(i18n.language) })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={onDelete}
          className="p-3 text-white bg-red-600/20 hover:bg-red-600 border border-red-600/40 rounded-xl transition-all shadow-lg active:scale-90"
          id={`delete-work-${work.id}`}
        >
          <Trash2 size={20} />
        </button>
        <div className="p-3 rounded-xl bg-[#E50914] text-white shadow-lg shadow-[#E50914]/20">
          <Plus size={20} />
        </div>
      </div>
    </motion.div>
  );
};

export const TripHistory: React.FC<{ trips: Trip[] }> = ({ trips }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-4">
        <History size={16} /> {t('last_trips')}
      </h3>
      {trips.length === 0 ? (
        <div className="text-center py-8 text-gray-500 font-medium italic">
          {t('no_trips')}
        </div>
      ) : (
        [...trips].reverse().map((trip, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[#1f1f1f] p-4 rounded-lg flex justify-between items-center border-l-4 border-[#E50914] shadow-md border border-white/5"
            id={`trip-${trip.id}`}
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white font-mono text-lg font-bold">{t('trip_number')}{trips.length - idx}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                  trip.type === 'cleaning' ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {t(trip.type)}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {safeFormat(trip.timestamp, "eeee, dd 'de' MMMM", { locale: getLocale(i18n.language) })}
              </span>
              {trip.notes && (
                <p className="text-[10px] text-gray-500 italic mt-1 flex items-center gap-1">
                   <span className="uppercase font-bold text-[#E50914]/60">{t('trip_notes')}</span> {trip.notes}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[#E50914] font-bold text-xl drop-shadow-[0_0_5px_rgba(229,9,20,0.3)]">
                {safeFormat(trip.timestamp, 'HH:mm')}
              </span>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export const Nav: React.FC<{ active: 'home' | 'reports' | 'settings'; onChange: (v: 'home' | 'reports' | 'settings') => void }> = ({ active, onChange }) => {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-white/10 px-6 py-3 flex justify-around items-center z-50">
      <button
        type="button"
        aria-label={t('nav_home_aria')}
        aria-current={active === 'home' ? 'page' : undefined}
        onClick={() => onChange('home')}
        className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${active === 'home' ? 'text-[#E50914]' : 'text-gray-500'}`}
        id="nav-home"
      >
        <Truck size={24} />
        <span className="text-[10px] font-bold uppercase tracking-tighter">{t('works')}</span>
      </button>
      <button
        type="button"
        aria-label={t('nav_reports_aria')}
        aria-current={active === 'reports' ? 'page' : undefined}
        onClick={() => onChange('reports')}
        className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${active === 'reports' ? 'text-[#E50914]' : 'text-gray-500'}`}
        id="nav-reports"
      >
        <BarChart3 size={24} />
        <span className="text-[10px] font-bold uppercase tracking-tighter">{t('reports')}</span>
      </button>
      <button
        type="button"
        aria-label={t('nav_settings_aria')}
        aria-current={active === 'settings' ? 'page' : undefined}
        onClick={() => onChange('settings')}
        className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${active === 'settings' ? 'text-[#E50914]' : 'text-gray-500'}`}
        id="nav-settings"
      >
        <Settings size={24} />
        <span className="text-[10px] font-bold uppercase tracking-tighter">{t('settings')}</span>
      </button>
    </nav>
  );
};
