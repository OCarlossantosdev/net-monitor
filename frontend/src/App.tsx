import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, Wifi, WifiOff, AlertTriangle, LayoutDashboard, FileText, Bell, Settings, LogOut, ChevronRight, Server, ChevronLeft, Menu, Monitor, Smartphone, RefreshCw } from 'lucide-react';

interface NetworkLog {
  id: string;
  timestamp: string;
  host: string;
  latency: number;
  status: string;
}

interface Device {
  id: string;
  ip: string;
  hostname: string;
  status: string;
  lastSeen: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Estados do Dashboard
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [currentStatus, setCurrentStatus] = useState<NetworkLog | null>(null);
  
  // Estados de Dispositivos (Inventário)
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Busca dados do Dashboard
  const fetchDashboardData = async () => {
    try {
      const [logsRes, statusRes] = await Promise.all([
        fetch('http://localhost:3333/logs'),
        fetch('http://localhost:3333/status/current')
      ]);
      
      const logsJson = await logsRes.json();
      const formattedLogs = logsJson.data.map((log: NetworkLog) => ({
        ...log,
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setLogs(formattedLogs);

      const statusJson = await statusRes.json();
      setCurrentStatus(statusJson.data);
    } catch (error) {
      console.error("Erro ao buscar dashboard:", error);
    }
  };

  // Busca e Escaneia Dispositivos
  const fetchDevices = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('http://localhost:3333/devices');
      const json = await res.json();
      setDevices(json.data);
    } catch (error) {
      console.error("Erro ao buscar dispositivos:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // Efeitos para carregar dados baseados na aba ativa
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    } else if (activeTab === 'devices') {
      fetchDevices();
      // Atualiza os dispositivos a cada 2 minutos enquanto a aba estiver aberta
      const interval = setInterval(fetchDevices, 120000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const isOnline = currentStatus?.status === 'online';
  const isHighLatency = currentStatus?.status === 'high_latency';
  
  const statusColor = isOnline ? 'text-emerald-400' : isHighLatency ? 'text-amber-400' : 'text-rose-500';
  const bgStatusGlow = isOnline ? 'bg-emerald-400/10' : isHighLatency ? 'bg-amber-400/10' : 'bg-rose-500/10';
  const borderStatus = isOnline ? 'border-emerald-500/20' : isHighLatency ? 'border-amber-500/20' : 'border-rose-500/20';
  const StatusIcon = isOnline ? Wifi : isHighLatency ? AlertTriangle : WifiOff;

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'devices', icon: Server, label: 'Dispositivos' },
    { id: 'reports', icon: FileText, label: 'Relatórios' },
    { id: 'alerts', icon: Bell, label: 'Alertas' },
    { id: 'settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-gray-200 font-sans overflow-hidden selection:bg-emerald-500/30">
      
      {/* ======================= SIDEBAR ======================= */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#111116] border-r border-gray-800/60 flex flex-col justify-between transition-all duration-300 ease-in-out relative z-20`}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-8 bg-gray-800 border border-gray-700 text-gray-300 rounded-full p-1 hover:bg-emerald-500 hover:text-white transition-colors z-30"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div>
          <div className="h-20 flex items-center px-5 border-b border-gray-800/60 overflow-hidden">
            <div className="flex items-center gap-3 min-w-max">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <Activity className="text-emerald-400" size={24} />
              </div>
              <div className={`transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0 hidden'}`}>
                <h1 className="text-lg font-bold text-white tracking-tight">NetMonitor</h1>
                <p className="text-xs text-emerald-400/80 font-medium">Fluxo Digital SaaS</p>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1.5 mt-2">
            <p className={`px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-4 transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0 hidden'}`}>
              Menu Principal
            </p>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={!isSidebarOpen ? item.label : ''}
                className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-3' : 'justify-center'} py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={activeTab === item.id ? 'text-emerald-400' : 'text-gray-500'} />
                  {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                </div>
                {isSidebarOpen && activeTab === item.id && <ChevronRight size={16} className="text-emerald-500/50" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-gray-800/60">
          <div className={`flex items-center ${isSidebarOpen ? 'gap-3 px-3' : 'justify-center'} py-3 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer`}>
            <div className="w-9 h-9 min-w-[36px] rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20">
              CS
            </div>
            {isSidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">Carlos Santos</p>
                  <p className="text-xs text-gray-500 truncate">Admin</p>
                </div>
                <LogOut size={16} className="text-gray-500 hover:text-rose-400 transition-colors" />
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ======================= MAIN CONTENT ======================= */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#0a0a0c]">
        
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-[#0a0a0c]/80 backdrop-blur-md border-b border-gray-800/60 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-white transition-colors">
                <Menu size={24} />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {activeTab === 'dashboard' ? 'Visão Geral da Rede' : 'Inventário de Rede'}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {activeTab === 'dashboard' ? `Monitoramento do alvo: ${currentStatus?.host || 'Aguardando...'}` : 'Aparelhos conectados na rede local'}
              </p>
            </div>
          </div>
        </header>

        {/* ÁREA ROLÁVEL DAS ABAS */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* ======================= ABA: DASHBOARD ======================= */}
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`bg-[#111116] border ${borderStatus} rounded-2xl p-6 shadow-xl relative overflow-hidden group`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full ${bgStatusGlow} -mr-10 -mt-10 transition-all duration-500 group-hover:scale-110`}></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Status da Conexão</h3>
                      <div className={`p-2 rounded-lg bg-gray-900/50 border border-gray-800/50 ${statusColor}`}>
                        <StatusIcon size={20} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className={`text-3xl font-bold uppercase tracking-tight ${statusColor}`}>
                        {currentStatus?.status ? currentStatus.status.replace('_', ' ') : '...'}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">Última checagem há poucos segundos</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111116] border border-gray-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full bg-blue-500/5 -mr-10 -mt-10 transition-all duration-500 group-hover:scale-110"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Latência (Ping)</h3>
                      <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800/50 text-blue-400">
                        <Activity size={20} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-bold text-white tracking-tight">{currentStatus?.latency || '--'}</span>
                      <span className="text-blue-400 font-medium">ms</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111116] border border-gray-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full bg-purple-500/5 -mr-10 -mt-10 transition-all duration-500 group-hover:scale-110"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Perda de Pacotes</h3>
                      <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800/50 text-purple-400">
                        <Server size={20} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-bold text-white tracking-tight">0</span>
                      <span className="text-purple-400 font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#111116] border border-gray-800/60 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-white font-semibold text-lg tracking-tight">Histórico de Estabilidade</h3>
                    <p className="text-gray-500 text-sm">Variação de latência da última hora</p>
                  </div>
                </div>
                
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={logs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis dataKey="time" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} tickLine={false} axisLine={false} tickMargin={12} />
                      <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}ms`} />
                      <Tooltip contentStyle={{ backgroundColor: '#111116', borderColor: '#1F2937', borderRadius: '12px', color: '#F3F4F6' }} itemStyle={{ color: '#10B981', fontWeight: 'bold' }} labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }} />
                      <Area type="monotone" dataKey="latency" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorLatency)" activeDot={{ r: 6, fill: '#111116', stroke: '#10B981', strokeWidth: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ======================= ABA: DISPOSITIVOS ======================= */}
          {activeTab === 'devices' && (
            <div className="animate-in fade-in duration-500">
              <div className="bg-[#111116] border border-gray-800/60 rounded-2xl shadow-xl overflow-hidden">
                
                {/* Header da Tabela */}
                <div className="p-6 border-b border-gray-800/60 flex justify-between items-center bg-gray-900/20">
                  <div>
                    <h3 className="text-white font-semibold text-lg tracking-tight">Dispositivos Encontrados</h3>
                    <p className="text-gray-500 text-sm">Atualizado em tempo real</p>
                  </div>
                  <button 
                    onClick={fetchDevices}
                    disabled={isScanning}
                    className={`flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
                    {isScanning ? 'Escaneando rede...' : 'Escanear Agora'}
                  </button>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase bg-gray-900/50 text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Dispositivo / Hostname</th>
                        <th className="px-6 py-4 font-semibold">Endereço IP</th>
                        <th className="px-6 py-4 font-semibold text-right">Última Conexão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {devices.map((device) => {
                        const isDeviceOnline = device.status === 'online';
                        const isPhone = device.hostname.toLowerCase().includes('iphone') || device.hostname.toLowerCase().includes('android');
                        
                        return (
                          <tr key={device.id} className="hover:bg-gray-800/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  {isDeviceOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDeviceOnline ? 'bg-emerald-500' : 'bg-gray-600'}`}></span>
                                </span>
                                <span className={isDeviceOnline ? 'text-emerald-400 font-medium' : 'text-gray-500'}>
                                  {isDeviceOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-200 flex items-center gap-3">
                              <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400">
                                {isPhone ? <Smartphone size={16} /> : <Monitor size={16} />}
                              </div>
                              {device.hostname}
                            </td>
                            <td className="px-6 py-4 font-mono text-gray-300">
                              {device.ip}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-500">
                              {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                      {devices.length === 0 && !isScanning && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            Nenhum dispositivo encontrado na rede.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Abas Vazias (Relatórios, Alertas, etc) */}
          {['reports', 'alerts', 'settings'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-in fade-in">
              <Settings size={48} className="mb-4 opacity-20" />
              <p className="text-lg">Esta funcionalidade será construída em breve.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}