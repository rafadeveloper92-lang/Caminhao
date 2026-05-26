import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { Work, Trip } from './types';
import { Layout, WorkCard, TripHistory, Nav, ConfirmationDialog } from './components/AppComponents';
import { Plus, Package, Calendar, Truck, Search, Trash2, History, AlertTriangle, MapPin, Navigation, Home, Warehouse, Lock, Edit2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';

const getLocale = (lng: string) => {
  if (lng.startsWith('es')) return es;
  if (lng.startsWith('en')) return enUS;
  return ptBR;
};

export default function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<'home' | 'reports' | 'work-details' | 'settings'>('home');
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkGatePassword, setNewWorkGatePassword] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editedPassword, setEditedPassword] = useState('');
  const [showAddWork, setShowAddWork] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Live queries for real-time local sync
  const works = useLiveQuery(() => db.works.reverse().toArray()) || [];
  
  const filteredWorks = works.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allTripsReport = useLiveQuery(() => db.trips.toArray()) || [];

  const selectedWork = useLiveQuery(
    () => selectedWorkId ? db.works.get(selectedWorkId) : Promise.resolve(null),
    [selectedWorkId]
  );

  const completionHistory = useLiveQuery(
    () => selectedWorkId ? db.completions.where('work_id').equals(selectedWorkId).reverse().toArray() : Promise.resolve([]),
    [selectedWorkId]
  ) || [];

  const warehouseSetting = useLiveQuery(() => db.settings.get('warehouse')) || null;
  const homeSetting = useLiveQuery(() => db.settings.get('home')) || null;

  const trips = useLiveQuery(
    () => selectedWorkId ? db.trips.where('work_id').equals(selectedWorkId).toArray() : Promise.resolve([]),
    [selectedWorkId]
  ) || [];

  async function addWork() {
    if (!newWorkName.trim()) return;
    try {
      await db.works.add({
        name: newWorkName,
        gate_password: newWorkGatePassword,
        created_at: new Date().toISOString(),
        is_finished: false
      } as Work);
      setNewWorkName('');
      setNewWorkGatePassword('');
      setShowAddWork(false);
    } catch (error) {
      console.error('Failed to add work:', error);
    }
  }

  async function updateGatePassword() {
    if (!selectedWorkId) return;
    try {
      await db.works.update(selectedWorkId, { gate_password: editedPassword });
      setIsEditingPassword(false);
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
        window.alert("Geolocalização não suportada");
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
          window.alert("Erro ao obter localização. Verifique as permissões.");
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
      await db.works.update(selectedWorkId, { lat: loc.lat, lng: loc.lng });
      window.alert(t('location_saved'));
    } catch (error) {
      console.error("Failed to save location", error);
    }
  }

  async function saveSpecialLocation(id: 'warehouse' | 'home') {
    const loc = await getGeoLocation();
    if (!loc) return;

    try {
      await db.settings.put({
        id,
        lat: loc.lat,
        lng: loc.lng,
        updated_at: new Date().toISOString()
      });
      window.alert(t('location_saved'));
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
      await db.trips.add({
        work_id: selectedWorkId,
        timestamp: new Date().toISOString(),
        type,
        notes: tripNotes
      } as Trip);
      setTripNotes('');
      setShowTripTypePicker(false);
    } catch (error) {
      console.error('Failed to add trip:', error);
    }
  }

  async function toggleWorkStatus() {
    if (!selectedWorkId || !selectedWork) return;
    try {
      const isFinishing = !selectedWork.is_finished;
      const now = new Date().toISOString();
      
      await db.works.update(selectedWorkId, { 
        is_finished: isFinishing,
        finished_at: isFinishing ? now : undefined
      });

      if (isFinishing) {
        await db.completions.add({
          work_id: selectedWorkId,
          timestamp: now
        });
      }
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
          await db.works.delete(id);
          await db.trips.where('work_id').equals(id).delete();
          await db.completions.where('work_id').equals(id).delete();
          if (selectedWorkId === id) setView('home');
          closeConfirm();
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
          await db.trips.clear();
          await db.completions.clear();
          closeConfirm();
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
          await db.works.clear();
          await db.trips.clear();
          await db.completions.clear();
          setView('home');
          closeConfirm();
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

        <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-2 flex items-center gap-2">
           <Truck size={20} className="text-[#E50914]" /> {t('data_management')}
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl relative overflow-hidden group">
            <h3 className="text-orange-400 text-sm font-black uppercase tracking-widest mb-1">{t('danger_zone')}</h3>
            <p className="text-xs text-orange-400/60 leading-relaxed mb-6">
               As ações abaixo apagarão permanentemente seus registros locais.
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
        <span className="text-[10px] font-black uppercase tracking-[0.4em]">CineStream Pro v2.0</span>
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

