import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, RefreshCw, Monitor, Smartphone, ChevronRight, Activity, 
  ShieldCheck, FileText, Zap, ShieldAlert, Globe, Search, 
  AlertTriangle, CheckCircle2, Edit3, Download, FilePieChart, 
  ChevronDown, FileSpreadsheet, Tv, Cpu, Tablet, Laptop, Network
} from 'lucide-react';

interface Device {
  id: string;
  ip: string;
  hostname: string;
  status: string;
  lastSeen: string;
  mac: string;
}

interface NetworkLog {
  id: string;
  timestamp: string;
  latency: number;
  status: string;
  type: string;
}

const ScanRadar = () => (
  <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
    {[1, 2, 3].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 border border-emerald-500/20 rounded-full"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 0.5, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.8 }}
      />
    ))}
    <motion.div 
      className="absolute inset-0 border-r-2 border-emerald-500/50 rounded-full shadow-[4px_0_15px_rgba(16,185,129,0.3)]"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
    />
    <div className="relative z-10 bg-[#0d0d12] p-4 rounded-full border border-emerald-500/20 shadow-inner">
      <Search className="text-emerald-500" size={32} />
    </div>
  </div>
);

export function DevicesView() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [myIp, setMyIp] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [testTab, setTestTab] = useState<'basic' | 'advanced'>('basic');
  const [isTesting, setIsTesting] = useState(false);
  const [basicResults, setBasicResults] = useState<any>(null);
  const [advancedData, setAdvancedData] = useState<any>(null);
  const [deviceHistory, setDeviceHistory] = useState<NetworkLog[]>([]);
  const [showHistoryExport, setShowHistoryExport] = useState(false);
  
  const [filterOnlyOnline, setFilterOnlyOnline] = useState(true);

  const fetchDevices = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('http://localhost:3333/devices');
      const json = await res.json();
      setDevices(json.data || []);
      setMyIp(json.myIp || '');
    } catch (err) {
      console.error("Erro ao buscar dispositivos:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchHistory = async (ip: string) => {
    try {
      const res = await fetch(`http://localhost:3333/devices/${ip}/history`);
      const json = await res.json();
      setDeviceHistory(json.data || []);
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    }
  };

  const updateDeviceName = async (id: string, newName: string) => {
    if (!newName || newName === selectedDevice?.hostname) return;
    try {
      await fetch(`http://localhost:3333/devices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: newName })
      });
      fetchDevices(); 
    } catch (err) { console.error("Erro ao atualizar nome:", err); }
  };

  const runTest = async (type: 'basic' | 'advanced') => {
    if (!selectedDevice) return;
    setIsTesting(true);
    setBasicResults(null);
    setAdvancedData(null);
    const minWait = new Promise(resolve => setTimeout(resolve, 2500));
    try {
      const [res] = await Promise.all([
        fetch(`http://localhost:3333/devices/${selectedDevice.ip}/test/${type}`),
        minWait 
      ]);
      const json = await res.json();
      if (type === 'basic') setBasicResults(json.result);
      else setAdvancedData(json.details);
      fetchHistory(selectedDevice.ip);
    } catch (err) {
      console.error("Erro no teste:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const closeCommandCenter = () => {
    setSelectedDevice(null);
    setAdvancedData(null);
    setBasicResults(null);
    setShowHistoryExport(false);
    setDeviceHistory([]);
  };

  useEffect(() => { fetchDevices(); }, []);
  useEffect(() => { if (selectedDevice) fetchHistory(selectedDevice.ip); }, [selectedDevice]);

  const getDeviceIcon = (hostname: string) => {
    const name = hostname.toLowerCase();
    if (name.includes('tv') || name.includes('roku') || name.includes('samsung') || name.includes('lg electronics')) return <Tv size={24} />;
    if (name.includes('phone') || name.includes('apple') || name.includes('motorola') || name.includes('xiaomi') || name.includes('huawei')) return <Smartphone size={24} />;
    if (name.includes('tablet') || name.includes('ipad')) return <Tablet size={24} />;
    if (name.includes('desktop') || name.includes('dell') || name.includes('lenovo') || name.includes('intel') || name.includes('hp') || name.includes('asus')) return <Laptop size={24} />;
    return <Server size={24} />;
  };

  const filteredDevices = devices.filter(d => filterOnlyOnline ? d.status === 'online' : true);

  const historyExportOptions = [
    { label: 'Exportar CSV', icon: FileSpreadsheet, url: `/history/export` },
    { label: 'Relatório TXT', icon: FileText, url: `/history/export/txt` },
    { label: 'Documento PDF', icon: FilePieChart, url: `/history/export/pdf` },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h3 className="text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">
            Ativos <span className="text-emerald-500">Fluxo</span>
          </h3>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 italic">
            <Activity size={14} className="text-emerald-500" /> 
            {filteredDevices.length} Conexões Verificadas
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setFilterOnlyOnline(!filterOnlyOnline)}
            className={`text-[9px] font-black px-6 py-3 rounded-xl border transition-all uppercase tracking-widest ${
              filterOnlyOnline 
                ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_5px_15px_rgba(16,185,129,0.2)]' 
                : 'bg-transparent text-gray-500 border-white/10 hover:border-white/20'
            }`}
          >
            {filterOnlyOnline ? 'Apenas Online' : 'Mostrar Todos'}
          </button>

          <button onClick={fetchDevices} disabled={isScanning} className="group flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/5 active:scale-95 transition-all">
            <RefreshCw size={16} className={isScanning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
            <span className="text-[9px] tracking-widest uppercase">{isScanning ? 'Lendo Hardware...' : 'Scan Rede'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredDevices.map((device) => {
          const isMe = device.ip.trim() === myIp.trim();
          const isOnline = device.status === 'online';
          const isAutoIdentified = device.hostname.includes('(Auto)');
          
          return (
            <motion.div 
              layoutId={device.id}
              key={device.id} 
              onClick={() => isOnline && setSelectedDevice(device)} 
              whileHover={isOnline ? { y: -10, borderColor: 'rgba(16, 185, 129, 0.3)' } : {}}
              className={`group relative bg-[#0d0d12] border rounded-[2.5rem] p-8 transition-all duration-500 cursor-pointer overflow-hidden ${
                isMe ? 'border-emerald-500/40 shadow-xl' : 'border-white/5'
              } ${!isOnline && 'opacity-40 grayscale cursor-default'}`}
            >
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`p-4 rounded-[1.2rem] ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                  {isMe ? <Monitor size={24} /> : getDeviceIcon(device.hostname)}
                </div>
                {isMe && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-emerald-500 text-black text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Root</span>
                    <span className="text-[7px] text-emerald-500/50 font-black uppercase">Meu Dispositivo</span>
                  </div>
                )}
                {isAutoIdentified && !isMe && (
                  <span className="text-[7px] text-blue-400/80 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded uppercase tracking-widest font-black">
                    Auto-Detect
                  </span>
                )}
              </div>
              
              <h4 className={`font-black text-xl tracking-tight truncate italic ${isOnline ? 'text-white' : 'text-gray-600'} ${isAutoIdentified && 'text-blue-50'}`}>
                {device.hostname.replace('(Auto)', '').trim() || 'Unknown Device'}
              </h4>
              
              <p className="text-gray-500 font-mono text-[9px] mt-2 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gray-800'}`}></span>
                {device.ip}
              </p>
              
              <p className="text-gray-700/50 font-mono text-[8px] mt-1 font-bold uppercase tracking-widest ml-3.5">
                {device.mac}
              </p>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDevice && (
          <motion.div initial={{ opacity: 0, x: 500 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 500 }} className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-md">
            <div className="h-full w-full max-w-xl bg-[#0d0d12] border-l border-white/5 p-12 shadow-2xl overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Command <span className="text-emerald-500">Center</span></h3>
                <button onClick={closeCommandCenter} className="p-3 bg-white/5 hover:bg-rose-500 hover:text-white rounded-2xl transition-all"><ChevronRight size={24}/></button>
              </div>

              <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/5 mb-10 text-center group">
                <div className="flex flex-col items-center">
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] mb-4 italic">Identificar Ativo</p>
                  <input 
                    className="bg-transparent text-white font-black text-3xl text-center w-full outline-none focus:text-emerald-400 transition-all italic border-b-2 border-transparent focus:border-emerald-500/20 pb-2 uppercase tracking-tighter"
                    placeholder="Dê um nome ao dispositivo"
                    defaultValue={selectedDevice.hostname.replace('(Auto)', '').trim()}
                    onBlur={(e) => updateDeviceName(selectedDevice.id, e.target.value)}
                  />
                  <div className="flex gap-2 mt-4">
                    <p className="text-gray-500 font-mono text-[10px] uppercase font-bold tracking-widest bg-black/40 border border-white/5 px-4 py-1.5 rounded-full">{selectedDevice.ip}</p>
                    <p className="text-gray-600 font-mono text-[10px] uppercase font-bold tracking-widest bg-black/40 border border-white/5 px-4 py-1.5 rounded-full">{selectedDevice.mac}</p>
                  </div>
                </div>
              </div>

              <div className="relative flex bg-white/5 p-1.5 rounded-2xl mb-10">
                <motion.div className={`absolute top-1.5 bottom-1.5 rounded-xl ${testTab === 'basic' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-purple-600'}`} animate={{ x: testTab === 'basic' ? 0 : '100%', width: 'calc(50% - 6px)' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                <button onClick={() => setTestTab('basic')} className={`relative z-10 flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${testTab === 'basic' ? 'text-black' : 'text-gray-500'}`}>Básico</button>
                <button onClick={() => setTestTab('advanced')} className={`relative z-10 flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${testTab === 'advanced' ? 'text-white' : 'text-gray-500'}`}>Avançado</button>
              </div>

              <div className="min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div key={testTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="bg-white/5 border border-white/5 rounded-[3rem] p-10">
                    {testTab === 'basic' ? (
                      <div className="space-y-8">
                        {isTesting ? <div className="py-12 text-center"><RefreshCw className="animate-spin text-emerald-500 mx-auto mb-4" size={50} /><p className="text-emerald-500 font-black animate-pulse text-xs tracking-widest uppercase">Validando Rotas...</p></div> : basicResults ? (
                          <div className="space-y-6 animate-in fade-in zoom-in">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/40 p-5 rounded-[2rem] border border-emerald-500/20"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">Gateway</p><p className="text-white font-black text-xl">{basicResults.gateway}</p></div>
                              <div className="bg-black/40 p-5 rounded-[2rem] border border-emerald-500/20"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">DNS Res.</p><p className="text-white font-black text-xl">{basicResults.dns_resolution}</p></div>
                            </div>
                            <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/20 flex justify-between items-center">
                               <div><p className="text-[9px] text-gray-500 font-black uppercase mb-1">HTTP Protocol</p><p className="text-emerald-400 font-black uppercase">{basicResults.http_test}</p></div>
                               <Globe className="text-emerald-500" size={24} />
                            </div>
                          </div>
                        ) : <button onClick={() => runTest('basic')} className="w-full py-6 bg-emerald-500 text-black font-black rounded-3xl shadow-xl hover:bg-emerald-400 transition-all">EXECUTAR TESTE</button>}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {isTesting ? <ScanRadar /> : advancedData ? (
                          <div className="space-y-6 animate-in fade-in">
                            <div className="grid grid-cols-3 gap-4">
                               {Object.entries(advancedData.metrics).map(([key, val]: any) => (
                                 <div key={key} className="bg-purple-600/10 p-5 rounded-[2rem] border border-purple-500/20 text-center"><p className="text-[8px] text-purple-400 font-black uppercase mb-1">{key}</p><p className="text-white font-black text-sm italic">{val}</p></div>
                               ))}
                            </div>

                            {/* NOVO: SERVIÇOS DETECTADOS (BANNER GRABBING) */}
                            <div className="bg-black/40 p-8 rounded-[2rem] border border-purple-500/20 relative">
                               <p className="text-[9px] text-gray-500 font-black uppercase mb-4 italic tracking-widest flex items-center gap-2"><Network size={12}/> Portas & Serviços Abertos</p>
                               <div className="space-y-2">
                                  {advancedData.active_ports.map((portInfo: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-[10px] text-purple-300 bg-purple-500/5 p-3 rounded-xl border border-purple-500/10">
                                      <ShieldCheck size={14} className="text-purple-500" />
                                      <span className="font-mono font-bold">{portInfo}</span>
                                    </div>
                                  ))}
                               </div>
                            </div>

                            {/* NOVO: IA DE ROTA */}
                            <div className="bg-black/40 p-8 rounded-[2rem] border border-purple-500/20 relative">
                               <p className="text-[9px] text-gray-500 font-black uppercase mb-4 italic tracking-widest flex items-center gap-2"><Activity size={12}/> Análise de Gargalo (Traceroute)</p>
                               <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl mb-4">
                                 <p className="text-xs font-black text-purple-400">{advancedData.route_analysis}</p>
                               </div>
                               <div className="space-y-2">
                                  {advancedData.traceroute_hops.map((hop: string, i: number) => (
                                    <div key={i} className="flex items-center gap-4 text-[10px] text-gray-500 font-mono"><span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-gray-400 font-black text-[8px]">{i+1}</span><span className="truncate">{hop}</span></div>
                                  ))}
                               </div>
                            </div>

                          </div>
                        ) : <button onClick={() => runTest('advanced')} className="w-full py-6 bg-purple-600 text-white font-black rounded-3xl shadow-xl hover:bg-purple-500 transition-all">INICIAR VARREDURA PROFUNDA</button>}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-12 space-y-6 pb-20">
                 <div className="flex justify-between items-center relative">
                    <h5 className="text-gray-600 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 italic">
                      <AlertTriangle size={14} className="text-amber-500" /> Histórico Local
                    </h5>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setShowHistoryExport(!showHistoryExport)}
                        className="flex items-center gap-2 text-[9px] font-black text-emerald-500 hover:text-emerald-400 transition-all uppercase tracking-widest"
                      >
                        <Download size={12} /> BAIXAR LOGS <ChevronDown size={10} className={showHistoryExport ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      </button>

                      <AnimatePresence>
                        {showHistoryExport && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-2 w-48 bg-[#0d0d12]/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                          >
                            {historyExportOptions.map((opt) => (
                              <button
                                key={opt.label}
                                onClick={() => {
                                  window.open(`http://localhost:3333/devices/${selectedDevice.ip}${opt.url}`, '_blank');
                                  setShowHistoryExport(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-400 transition-all group"
                              >
                                <div className="flex items-center gap-2">
                                  <opt.icon size={14} className="group-hover:scale-110 transition-transform" />
                                  {opt.label.split(' ')[1]}
                                </div>
                                <span className="text-[7px] bg-white/5 px-1.5 py-0.5 rounded text-gray-600 font-mono uppercase">{opt.url.split('/').pop()}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                 </div>

                 <div className="space-y-3">
                    {deviceHistory.length > 0 ? deviceHistory.map((log) => (
                      <div key={log.id} className="flex justify-between items-center p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all">
                         <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${log.status === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                            <span className="text-[10px] text-gray-400 font-black uppercase italic">{log.type.replace('_', ' ')}</span>
                         </div>
                         <span className="text-xs font-black text-white italic">{log.latency}ms</span>
                      </div>
                    )) : (
                      <p className="text-center text-gray-600 text-[10px] uppercase font-black py-10 opacity-30 tracking-widest">Nenhum log registrado para este ativo</p>
                    )}
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}