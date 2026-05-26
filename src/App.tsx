import React, { useEffect, useRef, useState } from 'react';
import * as store from './services/sqliteRepo';
import { Work, Trip, WorkCompletion, Setting, Store } from './types';
import { Layout, WorkCard, TripHistory, Nav, ConfirmationDialog } from './components/AppComponents';
import { Plus, Package, Calendar, Truck, Search, Trash2, History, AlertTriangle, MapPin, Navigation, Home, Warehouse, Lock, Edit2, Download, Upload, ShoppingBag } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useDatabase } from './context/DatabaseContext';
import { useToast } from './components/ToastStack';
import { playTripRegisteredChime } from './audio/tripChime';
import { getSoundsEnabled, setSoundsEnabled } from './lib/soundsSettings';

const getLocale = (lng: string) => {
  if (lng.startsWith('es')) return es;
  if (lng.startsWith('en')) return enUS;
  return ptBR;
};

export default function App() {
  const { t, i18n } = useTranslation();
  const { ready, revision, refresh } = useDatabase();
  const toast = useToast();
  const importBackupRef = useRef<HTMLInputElement>(null);
  const [soundsOn, setSoundsOn] = useState(() => getSoundsEnabled());

  const [view, setView] = useState<'home' | 'reports' | 'work-details' | 'settings'>('home');

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    void (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        sub = await App.addListener('backButton', () => {
          const v = viewRef.current;
          if (v === 'work-details') {
            setView('home');
            return;
          }
          if (v === 'reports' || v === 'settings') {
            setView('home');
          }
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      sub?.remove();
    };
  }, []);
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkGatePassword, setNewWorkGatePassword] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editedPassword, setEditedPassword] = useState('');
  const [showAddWork, setShowAddWork] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [works, setWorks] = useState<Work[]>([]);
  const [allTripsReport, setAllTripsReport] = useState<Trip[]>([]);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [completionHistory, setCompletionHistory] = useState<WorkCompletion[]>([]);
  const [warehouseSetting, setWarehouseSetting] = useState<Setting | null>(null);
  const [homeSetting, setHomeSetting] = useState<Setting | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [stores, setStores] = useState<Store[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreNotes, setNewStoreNotes] = useState('');
  const [showAddStore, setShowAddStore] = useState(false);

  const filteredWorks = works.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    if (!ready) return;
    void store.getAllWorks().then(setWorks);
  }, [ready, revision]);

  useEffect(() => {
    if (!ready) return;
    void store.getAllTrips().then(setAllTripsReport);
  }, [ready, revision]);

  useEffect(() => {
    if (!ready) return;
    if (selectedWorkId == null) {
      setSelectedWork(null);
      return;
    }
    void store.getWorkById(selectedWorkId).then(setSelectedWork);
  }, [ready, revision, selectedWorkId]);

  useEffect(() => {
    if (!ready || selectedWorkId == null) {
      setCompletionHistory([]);
      return;
    }
    void store.getCompletionsForWork(selectedWorkId).then(setCompletionHistory);
  }, [ready, revision, selectedWorkId]);

  useEffect(() => {
    if (!ready) return;
    void store.getSetting('warehouse').then(setWarehouseSetting);
  }, [ready, revision]);

  useEffect(() => {
    if (!ready) return;
    void store.getSetting('home').then(setHomeSetting);
  }, [ready, revision]);

  useEffect(() => {
    if (!ready || selectedWorkId == null) {
      setTrips([]);
      return;
    }
    void store.getTripsForWork(selectedWorkId).then(setTrips);
  }, [ready, revision, selectedWorkId]);

  useEffect(() => {
    if (!ready) return;
    void store.getAllStores().then(setStores);
  }, [ready, revision]);

  async function addWork() {
    if (!newWorkName.trim()) return;
    try {
      await store.addWork({
        name: newWorkName,
        gate_password: newWorkGatePassword,
        created_at: new Date().toISOString(),
        is_finished: false,
      });
      setNewWorkName('');
      setNewWorkGatePassword('');
      setShowAddWork(false);
      refresh();
    } catch (error) {
      console.error('Failed to add work:', error);
    }
  }

  async function updateGatePassword() {
    if (!selectedWorkId) return;
    try {
      await store.updateWork(selectedWorkId, { gate_password: editedPassword });
      setIsEditingPassword(false);
      refresh();
    } catch (error) {
      console.error('Failed to update gate password:', error);
    }
  }

  const [showTripTypePicker, setShowTripTypePicker] = useState(false);

  const [tripNotes, setTripNotes] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  async function getGeoLocation(): Promise<{ lat: number, lng: number } | null> {
    setIsLoadingLocation(true);
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.error(t('geo_not_supported'));
        setIsLoadingLocation(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLoadingLocation(false);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location", error);
          toast.error(t('geo_error'));
          setIsLoadingLocation(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function saveWorkLocation() {
    if (!selectedWorkId) return;
    const loc = await getGeoLocation();
    if (!loc) return;

    try {
      await store.updateWork(selectedWorkId, { lat: loc.lat, lng: loc.lng });
      toast.success(t('location_saved'));
      refresh();
    } catch (error) {
      console.error("Failed to save location", error);
    }
  }

  async function saveSpecialLocation(id: 'warehouse' | 'home') {
    const loc = await getGeoLocation();
    if (!loc) return;

    try {
      await store.putSetting({
        id,
        lat: loc.lat,
        lng: loc.lng,
        updated_at: new Date().toISOString(),
      });
      toast.success(t('location_saved'));
      refresh();
    } catch (error) {
      console.error("Failed to save special location", error);
    }
  }

  function handleNavigate(lat: number, lng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  }

  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  async function addTrip(type: 'cleaning' | 'delivery') {
    if (!selectedWorkId) return;
    try {
      await store.addTrip({
        work_id: selectedWorkId,
        timestamp: new Date().toISOString(),
        type,
        notes: tripNotes,
      });
      setTripNotes('');
      setShowTripTypePicker(false);
      refresh();
      void playTripRegisteredChime();
      toast.success(t('toast_trip_registered'));
    } catch (error) {
      console.error('Failed to add trip:', error);
      toast.error(t('import_failed'));
    }
  }

  async function toggleWorkStatus() {
    if (!selectedWorkId || !selectedWork) return;
    try {
      const isFinishing = !selectedWork.is_finished;
      const now = new Date().toISOString();
      
      await store.updateWork(selectedWorkId, {
        is_finished: isFinishing,
        finished_at: isFinishing ? now : undefined,
      });

      if (isFinishing) {
        await store.addCompletion({
          work_id: selectedWorkId,
          timestamp: now,
        });
      }
      refresh();
    } catch (error) {
      console.error('Failed to toggle work status:', error);
    }
  }

  async function deleteWork(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: t('delete_confirm'),
      message: t('delete_confirm_desc') || 'Tem certeza que deseja excluir esta obra e todos os seus registros? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await store.deleteWorkCascade(id);
          if (selectedWorkId === id) setView('home');
          closeConfirm();
          refresh();
        } catch (error) {
          console.error('Failed to delete work:', error);
          closeConfirm();
        }
      }
    });
  }

  async function clearAllTrips() {
    setConfirmDialog({
      isOpen: true,
      title: t('clear_trips'),
      message: t('clear_confirm'),
      onConfirm: async () => {
        try {
          await store.clearTripsAndCompletions();
          closeConfirm();
          refresh();
          // Pequeno delay para o usuário ver que limpou antes de um feedback visual se necessário
        } catch (error) {
          console.error('Failed to clear trips:', error);
          closeConfirm();
        }
      }
    });
  }

  async function clearAllData() {
    setConfirmDialog({
      isOpen: true,
      title: t('clear_data'),
      message: t('clear_works_confirm'),
      onConfirm: async () => {
        try {
          await store.clearAllData();
          setView('home');
          closeConfirm();
          refresh();
        } catch (error) {
          console.error('Failed to clear data:', error);
          closeConfirm();
        }
      }
    });
  }

  const renderHome = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest">{t('your_works')}</h2>
          <button 
            onClick={() => setShowAddWork(true)}
            className="bg-[#E50914] hover:bg-[#b00710] text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg"
            id="btn-new-work"
          >
            <Plus size={18} /> {t('new_work')}
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#E50914] transition-colors" size={18} />
          <input 
            type="text"
            placeholder={t('search_placeholder')}
            className="w-full bg-[#1f1f1f] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#E50914]/30 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <AnimatePresence>
        {showAddWork && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-[#1f1f1f] p-4 rounded-xl border border-[#E50914]/30 shadow-2xl">
              <input 
                autoFocus
                placeholder={t('work_placeholder')}
                className="w-full bg-[#141414] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#E50914] mb-3"
                value={newWorkName}
                onChange={(e) => setNewWorkName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWork()}
              />
              <div className="space-y-1 mb-4">
                <label className="text-[10px] text-gray-500 font-black uppercase ml-1">{t('gate_password_label')}</label>
                <input 
                  placeholder={t('gate_password_placeholder')}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#E50914]"
                  value={newWorkGatePassword}
                  onChange={(e) => setNewWorkGatePassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={addWork}
                  className="bg-[#E50914] text-white px-4 py-2 rounded-lg font-bold flex-1 active:scale-95 transition-all"
                >
                  {t('save')}
                </button>
                <button 
                  onClick={() => setShowAddWork(false)}
                  className="bg-gray-800 text-gray-300 px-4 py-2 rounded-lg font-bold active:scale-95 transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-2">
        {filteredWorks.length === 0 ? (
          <div className="text-center p-12 bg-[#1f1f1f] rounded-2xl border border-dashed border-white/10 text-gray-400">
            <Package className="mx-auto mb-3 opacity-20" size={48} />
            <p>{t('no_works')}</p>
            <p className="text-xs mt-2">{t('click_plus')}</p>
          </div>
        ) : (
          filteredWorks.map(work => (
            <WorkCard 
              key={work.id} 
              work={work} 
              onClick={() => {
                setSelectedWorkId(work.id!);
                setView('work-details');
              }}
              onDelete={(e) => deleteWork(e, work.id!)}
            />
          ))
        )}
      </div>
    </div>
  );

  const renderWorkDetails = () => (
    <div className="space-y-6">
      <div className="bg-[#1f1f1f] p-6 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
           <Truck size={120} />
        </div>
        
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4 truncate pr-4">{selectedWork?.name}</h2>
        
        {/* Senha do Portão */}
        {(selectedWork?.gate_password || isEditingPassword) && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                  <Lock size={20} />
                </div>
                <span className="text-[10px] text-yellow-500/70 font-black uppercase tracking-widest">{t('gate_password')}</span>
              </div>
              {!isEditingPassword && (
                <button 
                  onClick={() => {
                    setEditedPassword(selectedWork?.gate_password || '');
                    setIsEditingPassword(true);
                  }}
                  className="p-2 text-yellow-500/50 hover:text-yellow-500 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>

            {isEditingPassword ? (
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className="flex-1 bg-[#141414] border border-yellow-500/30 rounded-lg p-2 text-white font-mono text-sm focus:outline-none"
                  value={editedPassword}
                  onChange={(e) => setEditedPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateGatePassword()}
                />
                <button 
                  onClick={updateGatePassword}
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-xs active:scale-95 transition-all"
                >
                  {t('save')}
                </button>
                <button 
                  onClick={() => setIsEditingPassword(false)}
                  className="bg-gray-800 text-gray-300 px-4 py-2 rounded-lg font-bold text-xs active:scale-95 transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <span className="text-xl font-mono text-white font-bold tracking-widest pl-13 block">
                {selectedWork?.gate_password}
              </span>
            )}
          </div>
        )}

        {/* Botão para adicionar senha caso não tenha */}
        {!selectedWork?.gate_password && !isEditingPassword && (
          <button 
            onClick={() => {
              setEditedPassword('');
              setIsEditingPassword(true);
            }}
            className="mb-6 w-full py-3 bg-white/5 border border-dashed border-white/10 rounded-xl text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95"
          >
            <Lock size={12} />
            {t('gate_password_placeholder')}
          </button>
        )}

        {/* Nova área de status mais visível */}
        <div className="grid grid-cols-1 gap-3 mb-6 relative z-10">
          <button 
            onClick={toggleWorkStatus}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all active:scale-95 ${
              selectedWork?.is_finished 
                ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedWork?.is_finished ? 'bg-white border-white' : 'border-gray-600'}`}>
                {selectedWork?.is_finished && <Plus size={14} className="text-green-500" />}
              </div>
              <span className="text-sm font-black uppercase tracking-widest">
                {selectedWork?.is_finished ? t('finished') : t('not_finished')}
              </span>
            </div>
            {selectedWork?.is_finished && <span className="text-xs font-black">100% OK</span>}
          </button>
          
          {selectedWork?.is_finished && selectedWork.finished_at && (
            <div className="flex items-center gap-2 px-1 text-[10px] text-green-500/70 font-bold uppercase tracking-widest">
              <Calendar size={12} />
              {t('finished_at')}: {format(new Date(selectedWork.finished_at), "dd/MM/yy 'às' HH:mm", { locale: getLocale(i18n.language) })}
            </div>
          )}
        </div>

        {/* Localização da Obra */}
        <div className="mb-6 grid grid-cols-1 gap-2">
          {!selectedWork?.lat ? (
            <button 
              onClick={saveWorkLocation}
              disabled={isLoadingLocation}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <MapPin size={18} />
              {isLoadingLocation ? t('getting_location') : t('save_location')}
            </button>
          ) : (
            <button 
              onClick={() => handleNavigate(selectedWork.lat!, selectedWork.lng!)}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 p-4 rounded-xl font-bold text-sm transition-all active:scale-95"
            >
              <Navigation size={18} className="text-blue-500" />
              {t('navigate')}
            </button>
          )}
        </div>

        {/* Histórico de Limpezas */}
        {completionHistory.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1 flex items-center gap-2">
              <History size={12} className="text-[#E50914]" /> {t('cleaning_history')}
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
              {completionHistory.map((comp, idx) => (
                <div key={comp.id || idx} className="bg-[#141414] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium italic">
                    {format(new Date(comp.timestamp), "eeee, dd 'de' MMMM", { locale: getLocale(i18n.language) })}
                  </span>
                  <span className="text-green-500 font-black">OK</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[#E50914] font-bold text-[10px] tracking-[0.2em] mb-4 mt-8 uppercase">{t('trip_record')}</p>
        
        <div className="flex items-end justify-between bg-[#141414] p-4 rounded-xl border border-white/5 relative z-10">
          <div>
            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1">{t('total_trips')}</span>
            <span className="text-4xl font-mono text-white font-bold">{trips.length}</span>
          </div>
          <button 
            onClick={() => setShowTripTypePicker(!showTripTypePicker)}
            className="bg-[#E50914] hover:bg-[#b00710] text-white h-16 w-16 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-[0_0_20px_rgba(229,9,20,0.4)] active:scale-95 transition-all font-bold"
            id="btn-add-trip"
          >
            {showTripTypePicker ? <Package size={24} /> : <Plus size={24} />}
            <span className="text-[10px] uppercase">{t('log_trip')}</span>
          </button>
        </div>

        <AnimatePresence>
          {showTripTypePicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-3 overflow-hidden"
            >
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-black uppercase ml-1">{t('notes')}</label>
                <textarea 
                  placeholder={t('notes_placeholder')}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#E50914]/50 transition-all h-20 resize-none"
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => addTrip('cleaning')}
                  className="bg-[#1f1f1f] border border-[#E50914]/30 p-3 rounded-lg flex items-center justify-between text-sm font-bold uppercase tracking-wider hover:bg-[#E50914]/10 transition-colors"
                >
                  <span className="flex items-center gap-2">🧹 {t('cleaning')}</span>
                  <div className="w-6 h-6 rounded-full bg-[#E50914] flex items-center justify-center"><Plus size={14} /></div>
                </button>
                <button
                  onClick={() => addTrip('delivery')}
                  className="bg-[#1f1f1f] border border-blue-500/30 p-3 rounded-lg flex items-center justify-between text-sm font-bold uppercase tracking-wider hover:bg-blue-500/10 transition-colors"
                >
                  <span className="flex items-center gap-2">📦 {t('delivery')}</span>
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><Plus size={14} /></div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TripHistory trips={trips} />
    </div>
  );

  async function exportBackupFile() {
    try {
      const data = await store.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rotacam-backup-${new Date().toISOString().slice(0, 19).replaceAll(':', '-').replace('T', '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('export_done'));
    } catch (error) {
      console.error('Failed to export backup:', error);
      toast.error(t('import_failed'));
    }
  }

  async function onImportBackupFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      await store.importAllData(parsed);
      refresh();
      toast.success(t('import_done'));
    } catch (error) {
      console.error('Failed to import backup:', error);
      toast.error(t('import_failed'));
    } finally {
      if (importBackupRef.current) importBackupRef.current.value = '';
    }
  }

  async function addStoreFromSettings() {
    if (!newStoreName.trim()) return;
    try {
      await store.addStore({ name: newStoreName.trim(), notes: newStoreNotes.trim() || undefined });
      setNewStoreName('');
      setNewStoreNotes('');
      setShowAddStore(false);
      refresh();
      toast.success(t('success'));
    } catch (error) {
      console.error('Failed to add store:', error);
      toast.error(t('import_failed'));
    }
  }

  async function saveStoreLocationForStore(storeId: number) {
    const loc = await getGeoLocation();
    if (!loc) return;
    try {
      await store.updateStore(storeId, { lat: loc.lat, lng: loc.lng });
      refresh();
      toast.success(t('location_saved'));
    } catch (error) {
      console.error('Failed to save store location:', error);
    }
  }

  function deleteStoreRow(storeId: number) {
    setConfirmDialog({
      isOpen: true,
      title: t('delete_store_confirm'),
      message: t('delete_store_confirm_desc'),
      onConfirm: async () => {
        try {
          await store.deleteStore(storeId);
          closeConfirm();
          refresh();
        } catch (error) {
          console.error('Failed to delete store:', error);
          closeConfirm();
        }
      },
    });
  }

  const renderReports = () => {
    const startOfCurrentMonth = startOfMonth(new Date());
    const endOfCurrentMonth = endOfMonth(new Date());
    
    const monthlyTotal = allTripsReport.filter(t => 
      isWithinInterval(new Date(t.timestamp), { start: startOfCurrentMonth, end: endOfCurrentMonth })
    ).length;

    const worksWithCounts = works.map(w => {
      const count = allTripsReport.filter(t => 
        t.work_id === w.id && 
        isWithinInterval(new Date(t.timestamp), { start: startOfCurrentMonth, end: endOfCurrentMonth })
      ).length;
      return { ...w, count };
    }).filter(w => w.count > 0);

    return (
      <div className="space-y-6">
        <div className="bg-[#1f1f1f] p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-[#E50914]">
             <Calendar size={80} />
          </div>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <Calendar size={14} className="text-[#E50914]" /> {format(new Date(), 'MMMM yyyy', { locale: getLocale(i18n.language) })}
          </h2>
          <div className="flex items-center gap-4 mt-6">
            <div className="h-16 w-1 bg-[#E50914] rounded-full"></div>
            <div>
              <span className="text-5xl font-mono text-white font-black">{monthlyTotal}</span>
              <span className="text-gray-500 font-bold text-sm uppercase block mt-1">{t('trips_made')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">{t('performance_by_work')}</h3>
          {worksWithCounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 italic">{t('no_records_month')}</div>
          ) : (
            worksWithCounts.map(w => (
              <div key={w.id} className="bg-[#1f1f1f] p-4 rounded-xl flex justify-between items-center border border-white/5 hover:border-[#E50914]/30 transition-all shadow-md">
                <span className="text-white font-medium">{w.name}</span>
                <span className="bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 px-4 py-1 rounded-full font-bold font-mono">
                  {w.count} {t('trips_unit')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-8">
      <div className="bg-[#1f1f1f] p-6 rounded-2xl border border-white/5 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-2 flex items-center gap-2">
           <MapPin size={20} className="text-blue-500" /> {t('location_management') || 'Locais Favoritos'}
        </h2>
        
        <div className="space-y-3 mb-8">
          {/* Armazém */}
          <div className="bg-[#141414] p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-orange-500">
                <Warehouse size={24} />
                <h3 className="font-bold text-white">{t('warehouse')}</h3>
              </div>
              {warehouseSetting && (
                <button 
                  onClick={() => handleNavigate(warehouseSetting.lat, warehouseSetting.lng)}
                  className="bg-blue-600/20 text-blue-400 p-2 rounded-lg border border-blue-500/30 active:scale-95"
                >
                  <Navigation size={20} />
                </button>
              )}
            </div>
            <button 
              onClick={() => saveSpecialLocation('warehouse')}
              disabled={isLoadingLocation}
              className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg text-xs font-bold transition-all active:scale-95 border border-white/5 flex items-center justify-center gap-2"
            >
              <MapPin size={14} />
              {t('set_warehouse')}
            </button>
          </div>

          {/* Casa */}
          <div className="bg-[#141414] p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-green-500">
                <Home size={24} />
                <h3 className="font-bold text-white">{t('my_house')}</h3>
              </div>
              {homeSetting && (
                <button 
                  onClick={() => handleNavigate(homeSetting.lat, homeSetting.lng)}
                  className="bg-blue-600/20 text-blue-400 p-2 rounded-lg border border-blue-500/30 active:scale-95"
                >
                  <Navigation size={20} />
                </button>
              )}
            </div>
            <button 
              onClick={() => saveSpecialLocation('home')}
              disabled={isLoadingLocation}
              className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg text-xs font-bold transition-all active:scale-95 border border-white/5 flex items-center justify-center gap-2"
            >
              <MapPin size={14} />
              {t('set_home')}
            </button>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/5 bg-[#141414] p-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
              <ShoppingBag size={18} className="text-emerald-400" />
            </span>
            {t('stores_section_title')}
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-gray-400">{t('stores_section_desc')}</p>

          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowAddStore((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-[#E50914] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#b00710] active:scale-95"
            >
              <Plus size={16} />
              {t('new_store')}
            </button>
          </div>

          <AnimatePresence>
            {showAddStore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="rounded-xl border border-emerald-500/20 bg-[#1f1f1f] p-4">
                  <input
                    autoFocus
                    className="mb-3 w-full rounded-lg border border-white/10 bg-[#141414] p-3 text-sm text-white focus:border-emerald-500/40 focus:outline-none"
                    placeholder={t('store_name_placeholder')}
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void addStoreFromSettings()}
                  />
                  <textarea
                    className="mb-3 h-20 w-full resize-none rounded-lg border border-white/10 bg-[#141414] p-3 text-sm text-white focus:border-emerald-500/40 focus:outline-none"
                    placeholder={t('store_notes_placeholder')}
                    value={newStoreNotes}
                    onChange={(e) => setNewStoreNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void addStoreFromSettings()}
                      className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-95"
                    >
                      {t('save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddStore(false);
                        setNewStoreName('');
                        setNewStoreNotes('');
                      }}
                      className="flex-1 rounded-lg bg-white/5 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/10 active:scale-95"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {stores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">{t('stores_empty')}</div>
          ) : (
            <div className="space-y-3">
              {stores.map((st) => (
                <div key={st.id} className="rounded-xl border border-white/10 bg-[#1f1f1f] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-white">{st.name}</div>
                      {st.notes ? <div className="mt-1 text-xs text-gray-400">{st.notes}</div> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteStoreRow(st.id!)}
                      className="shrink-0 rounded-lg border border-white/10 p-2 text-orange-400 transition hover:bg-orange-500/10"
                      aria-label={t('delete_store')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={isLoadingLocation}
                      onClick={() => void saveStoreLocationForStore(st.id!)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/5 py-3 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      <MapPin size={16} />
                      {t('set_store_location')}
                    </button>
                    {st.lat != null && st.lng != null ? (
                      <button
                        type="button"
                        onClick={() => handleNavigate(st.lat!, st.lng!)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600/20 py-3 text-xs font-bold text-blue-300 transition hover:bg-blue-600/30"
                      >
                        <Navigation size={16} />
                        {t('navigate_to_store')}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8 rounded-2xl border border-white/5 bg-[#141414] p-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
              <History size={18} className="text-[#E50914]" />
            </span>
            {t('sounds_title')}
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-gray-400">{t('sounds_desc')}</p>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#1f1f1f] px-4 py-3">
            <span className="text-sm font-bold text-white">{t('sounds_enabled')}</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-[#E50914]"
              checked={soundsOn}
              onChange={(e) => {
                const on = e.target.checked;
                setSoundsOn(on);
                setSoundsEnabled(on);
              }}
            />
          </label>
        </div>

        <div className="mb-8 rounded-2xl border border-white/5 bg-[#141414] p-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
              <Download size={18} className="text-blue-400" />
            </span>
            {t('backup_section_title')}
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-gray-400">{t('backup_section_desc')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void exportBackupFile()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 active:scale-[0.99]"
            >
              <Download size={18} />
              {t('export_backup')}
            </button>
            <button
              type="button"
              onClick={() => importBackupRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1f1f1f] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5 active:scale-[0.99]"
            >
              <Upload size={18} />
              {t('import_backup')}
            </button>
          </div>
          <input
            ref={importBackupRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportBackupFile(e.target.files?.[0])}
          />
        </div>

        <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-2 flex items-center gap-2">
           <Truck size={20} className="text-[#E50914]" /> {t('data_management')}
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl relative overflow-hidden group">
            <h3 className="text-orange-400 text-sm font-black uppercase tracking-widest mb-1">{t('danger_zone')}</h3>
            <p className="text-xs text-orange-400/60 leading-relaxed mb-6">
              {t('danger_zone_help')}
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={clearAllTrips}
                className="w-full bg-[#141414] hover:bg-orange-950/20 text-white p-4 rounded-xl border border-white/5 flex items-center justify-between text-sm font-bold active:scale-95 transition-all text-left group"
              >
                <span>{t('clear_trips')}</span>
                <Trash2 size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />
              </button>

              <button 
                onClick={clearAllData}
                className="w-full bg-[#E50914]/10 hover:bg-[#E50914]/20 text-[#E50914] p-4 rounded-xl border border-[#E50914]/20 flex items-center justify-between text-sm font-bold active:scale-95 transition-all text-left"
              >
                <span>{t('clear_data')}</span>
                <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 opacity-30 mt-8">
        <Truck size={32} className="text-[#E50914]" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em]">
          {t('footer_brand')} · v{__APP_VERSION__}
        </span>
      </div>
    </div>
  );

  return (
    <Layout 
      title={view === 'work-details' ? t('work_details') : view === 'settings' ? t('settings') : t('app_title')} 
      onBack={view === 'work-details' ? () => setView('home') : undefined}
    >
      <div className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + (selectedWorkId || '')}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'home' && renderHome()}
            {view === 'work-details' && renderWorkDetails()}
            {view === 'reports' && renderReports()}
            {view === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </div>
      <Nav active={view === 'reports' ? 'reports' : view === 'settings' ? 'settings' : 'home'} onChange={(v) => {
        if (v === 'home' && view === 'work-details') return;
        setView(v);
      }} />

      <ConfirmationDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </Layout>
  );
}

