import { LayoutDashboard, Server, FileText, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Geral' },
    { id: 'devices', icon: Server, label: 'Ativos' },
    { id: 'reports', icon: FileText, label: 'Logs' },
  ];

  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#0d0d12] border-r border-white/5 flex flex-col transition-all duration-500 relative z-40`}>
      {/* Botão de Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        className="absolute -right-3 top-8 bg-gray-800 border border-white/10 text-gray-300 rounded-full p-1 hover:bg-emerald-500 hover:text-black transition-all z-50 shadow-xl"
      >
        {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Header / Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 overflow-hidden">
        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 min-w-[36px]">
          <Zap className="text-emerald-400" size={20} fill="currentColor" />
        </div>
        {isSidebarOpen && (
          <span className="ml-3 text-lg font-black tracking-tighter text-white animate-in fade-in duration-500">
            FLUXO <span className="text-emerald-500">NET</span>
          </span>
        )}
      </div>
      
      {/* Navegação */}
      <nav className="p-4 space-y-2 mt-4 flex-1">
        {menuItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            title={!isSidebarOpen ? item.label : ''}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'justify-center'} py-3.5 rounded-2xl transition-all duration-300 ${
              activeTab === item.id 
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            {isSidebarOpen && (
              <span className="ml-4 font-bold text-sm tracking-tight animate-in slide-in-from-left-2">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer / Perfil */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
          <div className="w-8 h-8 min-w-[32px] rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-xs shadow-lg shadow-emerald-500/20">
            CS
          </div>
          {isSidebarOpen && (
            <div className="truncate animate-in fade-in">
              <p className="text-xs font-bold text-white leading-none">Carlos S.</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-black">Fluxo Digital</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}