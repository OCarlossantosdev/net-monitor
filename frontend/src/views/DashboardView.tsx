import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Activity, Wifi, WifiOff, AlertTriangle, 
  DownloadCloud, UploadCloud, Gauge, Globe, Server, X,
  CheckCircle2, ShieldAlert, HeartPulse
} from 'lucide-react';

interface NetworkLog {
  id: string;
  timestamp: string;
  host: string;
  latency: number;
  status: string;
  packetLoss?: number;
}

interface DashboardProps {
  isTvMode?: boolean;
}

export function DashboardView({ isTvMode = false }: DashboardProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [currentStatus, setCurrentStatus] = useState<NetworkLog | null>(null);
  const [packetLoss, setPacketLoss] = useState(0);

  const [speedData, setSpeedData] = useState<{download: string, upload: string, isp: string} | null>(null);
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);

  // ESTADOS DA AUDITORIA GLOBAL
  const [auditData, setAuditData] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [logsRes, statusRes] = await Promise.all([
        fetch('http://localhost:3333/logs'),
        fetch('http://localhost:3333/status/current')
      ]);
      
      const logsJson = await logsRes.json();
      const rawLogs = logsJson.data || [];
      
      let formattedLogs = rawLogs
        .map((log: NetworkLog) => ({
          ...log,
          latency: Number(log.latency) || 0,
          time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }))
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (formattedLogs.length === 1) {
        formattedLogs = [ { ...formattedLogs[0], time: 'Início', latency: 0 }, formattedLogs[0] ];
      }

      setLogs(formattedLogs);

      if (rawLogs.length > 0) {
        const recentLogs = rawLogs.slice(-20);
        const lost = recentLogs.filter((l: NetworkLog) => l.status === 'offline').length;
        setPacketLoss(Math.round((lost / recentLogs.length) * 100));
      }

      const statusJson = await statusRes.json();
      setCurrentStatus(statusJson.data);
    } catch (error) { console.error("Erro na sincronização:", error); }
  };

  const runSpeedTest = async () => {
    setIsTestingSpeed(true);
    try {
      const res = await fetch('http://localhost:3333/network/speedtest');
      const json = await res.json();
      if (json.success) setSpeedData(json.data);
    } catch (error) { console.error("Falha ao medir banda:", error); } 
    finally { setIsTestingSpeed(false); }
  };

  const runNetworkAudit = async () => {
    setShowAuditModal(true);
    setIsAuditing(true);
    try {
      const res = await fetch('http://localhost:3333/network/global-diagnostics');
      const json = await res.json();
      if (json.success) {
        setAuditData(json.data);
        fetchDashboardData(); // Atualiza o gráfico de fundo pois salvamos um log novo!
      }
    } catch (error) { console.error("Falha na auditoria:", error); } 
    finally { setIsAuditing(false); }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const maxLat = logs.length > 0 ? Math.max(...logs.map(l => l.latency)) : 0;
  const safeMax = maxLat < 200 ? 200 : maxLat; 
  const off = Number((150 / safeMax).toFixed(2)); 

  const isOnline = currentStatus?.status === 'online';
  const isHighLatency = currentStatus?.status === 'high_latency' || (currentStatus?.latency || 0) > 150;
  
  const statusColor = isOnline ? 'text-emerald-400' : isHighLatency ? 'text-amber-400' : 'text-rose-500';
  const borderStatus = isOnline ? 'border-emerald-500/20' : isHighLatency ? 'border-amber-500/20' : 'border-rose-500/20';
  const StatusIcon = isOnline ? Wifi : isHighLatency ? AlertTriangle : WifiOff;

  // Cores dinâmicas para o Modal de Auditoria
  const getAuditColors = (status: string) => {
    if (status === 'Saudável') return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircle2 size={32} className="text-emerald-500" /> };
    if (status === 'Instável') return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: <AlertTriangle size={32} className="text-amber-500" /> };
    return { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-500', icon: <ShieldAlert size={32} className="text-rose-500" /> };
  };

  return (
    <div className={`animate-in fade-in duration-1000 ${isTvMode ? 'bg-[#050507] h-screen p-16 flex flex-col overflow-y-auto' : 'slide-in-from-bottom-4'}`}>
      
      {/* LINHA 1: GRID DE MÉTRICAS */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${isTvMode ? 'mb-10' : 'mb-8'}`}>
        <div className={`bg-[#0d0d12] border ${borderStatus} rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden`}>
          <div className="relative z-10">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] italic mb-4">Rede Fluxo</p>
            <p className={`text-5xl font-black uppercase tracking-tighter ${statusColor} italic`}>
              {currentStatus?.status ? currentStatus.status.replace('_', ' ') : 'OFFLINE'}
            </p>
          </div>
          <div className={`absolute top-0 right-0 p-8 opacity-10 ${statusColor}`}><StatusIcon size={60} /></div>
        </div>

        <div className="bg-[#0d0d12] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] italic mb-4">Resposta</p>
          <div className="flex items-baseline gap-4">
            <span className="text-6xl font-black text-white tracking-tighter italic">{currentStatus?.latency || '0'}</span>
            <span className="text-blue-400 font-black text-2xl uppercase italic">ms</span>
          </div>
        </div>

        <div className="bg-[#0d0d12] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] italic mb-4">Loss</p>
          <div className="flex items-baseline gap-4">
            <span className={`text-6xl font-black italic ${packetLoss > 0 ? 'text-rose-500' : 'text-white'}`}>{packetLoss}</span>
            <span className="text-purple-400 font-black text-2xl uppercase italic">%</span>
          </div>
        </div>
      </div>

      {/* LINHA 2: CONTROLES AVANÇADOS */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-8 ${isTvMode ? 'mb-16' : 'mb-10'}`}>
        <div className="md:col-span-2 flex gap-4">
          <div className="flex-1 bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] p-6 flex items-center justify-between">
             <div>
                <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[0.3em] italic mb-1">Download</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-blue-400 italic">{speedData ? speedData.download : '---'}</span>
                  <span className="text-blue-400/50 font-black text-xs uppercase">Mbps</span>
                </div>
             </div>
             <DownloadCloud size={32} className="text-blue-500/20" />
          </div>
          <div className="flex-1 bg-purple-500/5 border border-purple-500/20 rounded-[2.5rem] p-6 flex items-center justify-between">
             <div>
                <p className="text-purple-500/50 text-[10px] font-black uppercase tracking-[0.3em] italic mb-1">Upload</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-purple-400 italic">{speedData ? speedData.upload : '---'}</span>
                  <span className="text-purple-400/50 font-black text-xs uppercase">Mbps</span>
                </div>
             </div>
             <UploadCloud size={32} className="text-purple-500/20" />
          </div>
        </div>

        <button onClick={runSpeedTest} disabled={isTestingSpeed} className={`flex flex-col items-center justify-center rounded-[2.5rem] p-6 border transition-all duration-500 ${isTestingSpeed ? 'bg-emerald-500/10 border-emerald-500/30 cursor-wait' : 'bg-[#0d0d12] border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}>
          <Gauge size={24} className={`mb-3 ${isTestingSpeed ? 'text-emerald-500 animate-spin' : 'text-gray-500'}`} />
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isTestingSpeed ? 'text-emerald-400 animate-pulse' : 'text-white'}`}>{isTestingSpeed ? 'Aferindo...' : 'Testar Banda'}</span>
        </button>

        <button onClick={runNetworkAudit} className="flex flex-col items-center justify-center rounded-[2.5rem] p-6 border border-white/5 bg-[#0d0d12] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-500 relative overflow-hidden group">
          <HeartPulse size={24} className="mb-3 text-gray-500 group-hover:text-purple-400 transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white text-center">Auditoria<br/>Completa</span>
          <div className="absolute inset-0 bg-purple-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
        </button>
      </div>

      {/* LINHA 3: GRÁFICO */}
      <div className="bg-[#0d0d12] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative flex flex-col flex-1">
        <div className="flex justify-between items-center mb-10">
          <h3 className={`${isTvMode ? 'text-4xl' : 'text-2xl'} text-white font-black tracking-tighter uppercase italic`}>Análise de Performance</h3>
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"><span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Live Feed</span></div>
        </div>
        <div style={{ width: '100%', height: '350px', position: 'relative' }}>
          {logs.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={logs} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={off} stopColor="#f43f5e" stopOpacity={0.6}/>
                    <stop offset={off} stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="time" hide={!isTvMode} tick={{ fill: '#4b5563', fontSize: 10 }} />
                <YAxis domain={[0, safeMax + 50]} stroke="#ffffff20" tick={{ fill: '#4b5563', fontSize: 10, fontWeight: '900' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }} itemStyle={{ color: '#10B981' }} />
                <ReferenceLine y={150} stroke="#f43f5e" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="latency" stroke={isHighLatency ? "#f43f5e" : "#10B981"} strokeWidth={4} fillOpacity={1} fill="url(#colorLatency)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700 font-black italic uppercase tracking-widest opacity-30">
              <Activity size={48} className="mb-4" /><span>Aguardando pontos de dados...</span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE AUDITORIA IA (NOVO E COMPLETO) */}
      <AnimatePresence>
        {showAuditModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }} className="w-full max-w-5xl bg-[#0d0d12] border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
              <button onClick={() => setShowAuditModal(false)} className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-rose-500 rounded-xl transition-colors z-10"><X size={24} className="text-white" /></button>

              <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-2">Auditoria <span className="text-purple-400">IA</span></h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-10">Laudo Técnico da Rede Fluxo Digital</p>

              {isAuditing ? (
                <div className="py-32 flex flex-col items-center justify-center">
                  <Activity size={80} className="text-purple-500 animate-pulse mb-8" />
                  <p className="text-purple-400 font-black tracking-[0.3em] uppercase animate-pulse text-sm">Coletando amostras de rede...</p>
                  <p className="text-gray-600 font-mono text-[10px] mt-4 uppercase">Ping • Traceroute • HTTP • Jitter • Portas</p>
                </div>
              ) : auditData ? (
                <div className="animate-in fade-in zoom-in duration-500">
                  {/* CARD DE LAUDO (O Cérebro) */}
                  <div className={`p-8 rounded-[2rem] border ${getAuditColors(auditData.status).bg} ${getAuditColors(auditData.status).border} mb-8 flex items-start gap-6`}>
                    <div className="bg-[#0d0d12] p-4 rounded-full shadow-lg">{getAuditColors(auditData.status).icon}</div>
                    <div>
                      <h3 className={`text-2xl font-black uppercase tracking-tighter italic mb-2 ${getAuditColors(auditData.status).text}`}>Status: {auditData.status}</h3>
                      <p className="text-white/80 font-medium leading-relaxed">{auditData.diagnosis}</p>
                    </div>
                  </div>

                  {/* GRID DE MÉTRICAS PROFUNDAS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">Roteador Local</p><p className="text-2xl font-black text-white">{auditData.metrics.gatewayLatency}ms</p></div>
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">Rota Externa</p><p className="text-2xl font-black text-white">{auditData.metrics.extLatency}ms</p></div>
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">Jitter (Oscilação)</p><p className="text-2xl font-black text-white">{auditData.metrics.jitter}ms</p></div>
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">Resposta Web</p><p className="text-2xl font-black text-white">{auditData.metrics.webResponse}ms</p></div>
                  </div>

                  {/* INFO INFRAESTRUTURA */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#050507] p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                      <div><p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">IP Público (WAN)</p><p className="font-mono text-blue-400 font-bold">{auditData.network.publicIp}</p></div>
                      <Globe size={24} className="text-blue-500/30" />
                    </div>
                    <div className="bg-[#050507] p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                      <div><p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Provedor Local (ISP)</p><p className="font-black text-white uppercase">{auditData.network.isp}</p></div>
                      <Server size={24} className="text-gray-700" />
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}