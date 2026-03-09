import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { ReportsView } from './views/ReportsView';
import { NotificationToast } from './components/NotificationToast';
import { AnimatePresence } from 'framer-motion';
import { Monitor, X } from 'lucide-react'; // Novos ícones para o TV Mode

export default function App() {
  const [activeTab, setActiveTab] = useState('devices');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTvMode, setIsTvMode] = useState(false); // Estado do TV Mode
  
  const [alert, setAlert] = useState<{ message: string; host: string } | null>(null);
  const lastIncidentId = useRef<string | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  const checkNetworkHealth = async () => {
    try {
      const res = await fetch('http://localhost:3333/status/current');
      const json = await res.json();
      const status = json.data;

      if (!status) return;

      const isCritical = status.status !== 'online' || status.latency > 200;
      
      if (isCritical && status.id !== lastIncidentId.current) {
        lastIncidentId.current = status.id;
        triggerAlert(status);
      }
    } catch (err) { console.error("Erro no monitor de alertas:", err); }
  };

  const triggerAlert = (status: any) => {
    const msg = status.status === 'offline' ? 'Dispositivo Desconectado' : `Latência Crítica: ${status.latency}ms`;
    setAlert({ message: msg, host: status.host });

    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.4;
    audio.play();

    if (Notification.permission === "granted") {
      new Notification("ALERTA FLUXO NET", {
        body: `${status.host}: ${msg}`,
        icon: "/vite.svg" 
      });
    }

    setTimeout(() => setAlert(null), 8000);
  };

  useEffect(() => {
    checkNetworkHealth();
    const interval = setInterval(checkNetworkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex h-screen bg-[#050507] text-gray-200 font-sans overflow-hidden transition-all ${isTvMode ? 'cursor-none' : ''}`}>
      
      <AnimatePresence>
        {alert && (
          <NotificationToast 
            message={alert.message} 
            host={alert.host} 
            onClose={() => setAlert(null)} 
          />
        )}
      </AnimatePresence>

      {/* Sidebar oculta no TV Mode */}
      {!isTvMode && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
        />
      )}

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header com botão TV Mode */}
        <header className={`flex items-center justify-between px-10 border-b border-white/5 bg-[#050507]/50 backdrop-blur-xl z-30 transition-all duration-500 ${isTvMode ? 'h-0 opacity-0 overflow-hidden' : 'h-20'}`}>
          <h2 className="text-xl font-black text-white uppercase tracking-widest italic">
             {activeTab === 'dashboard' ? 'Visão Geral' : activeTab === 'devices' ? 'Ativos' : 'Relatórios'}
          </h2>
          
          <button 
            onClick={() => {
              setActiveTab('dashboard');
              setIsTvMode(true);
            }}
            className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-2xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
          >
            <Monitor size={16} /> TV Mode
          </button>
        </header>

        {/* Botão flutuante para sair do TV Mode */}
        {isTvMode && (
          <button 
            onClick={() => setIsTvMode(false)}
            className="fixed bottom-10 right-10 z-50 p-5 bg-white/5 hover:bg-rose-500 rounded-full text-white/20 hover:text-white transition-all backdrop-blur-md shadow-2xl border border-white/10"
          >
            <X size={24} />
          </button>
        )}

        <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all ${isTvMode ? 'p-0' : 'p-10'}`}>
          {activeTab === 'dashboard' && <DashboardView isTvMode={isTvMode} />}
          {activeTab === 'devices' && <DevicesView />}
          {activeTab === 'reports' && <ReportsView />}
        </div>
      </main>
    </div>
  );
}