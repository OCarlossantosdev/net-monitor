import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, TrendingDown, Clock, CheckCircle2, 
  ShieldAlert, BarChart3, ArrowDownLeft, FileSpreadsheet,
  Download, FileText, FilePieChart, ChevronDown
} from 'lucide-react';

export function ReportsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ uptime: 100, incidents: 0, avgLatency: 0 });
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:3333/logs');
      const json = await res.json();
      const allLogs = json.data;

      if (allLogs.length > 0) {
        const criticalLogs = allLogs.filter((l: any) => l.status !== 'online' || l.latency > 150);
        const totalLatency = allLogs.reduce((acc: number, curr: any) => acc + curr.latency, 0);
        const avgLat = totalLatency / allLogs.length;
        const uptimePerc = ((allLogs.length - criticalLogs.length) / allLogs.length) * 100;

        setLogs(criticalLogs.reverse());
        setMetrics({ 
          uptime: Number(uptimePerc.toFixed(2)), 
          incidents: criticalLogs.length, 
          avgLatency: Number(avgLat.toFixed(0)) 
        });
      }
    } catch (error) { console.error("Erro nos relatórios:", error); }
  };

  const exportOptions = [
    { label: 'Exportar CSV', icon: FileSpreadsheet, ext: 'csv', url: 'http://localhost:3333/logs/export/csv' },
    { label: 'Relatório TXT', icon: FileText, ext: 'txt', url: 'http://localhost:3333/logs/export/txt' },
    { label: 'Documento PDF', icon: FilePieChart, ext: 'pdf', url: 'http://localhost:3333/logs/export/pdf' },
  ];

  useEffect(() => { 
    fetchReports();
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* HEADER COM DROPDOWN DE EXPORTAÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h3 className="text-4xl font-black text-white tracking-tighter mb-2">Health <span className="text-emerald-500">Report</span></h3>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest italic">Documentação de Infraestrutura • Fluxo Digital</p>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-4 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all active:scale-95"
          >
            <Download size={18} />
            EXPORTAR DADOS
            <ChevronDown size={16} className={`transition-transform duration-300 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-64 bg-[#0d0d12]/90 border border-white/10 rounded-[2rem] shadow-2xl p-3 z-50 backdrop-blur-xl"
              >
                {exportOptions.map((opt) => (
                  <button
                    key={opt.ext}
                    onClick={() => { window.open(opt.url, '_blank'); setShowExportMenu(false); }}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-400 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon size={16} className="group-hover:scale-110 transition-transform" />
                      {opt.label}
                    </div>
                    <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-gray-600 font-mono">{opt.ext}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CARDS DE PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-[#0d0d12] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><BarChart3 size={64} /></div>
          <p className="text-gray-500 text-[10px] font-black uppercase mb-4 tracking-widest italic">Disponibilidade</p>
          <p className="text-5xl font-black text-emerald-400 tracking-tighter">{metrics.uptime}%</p>
          <p className="text-gray-600 text-[10px] mt-4 font-bold uppercase tracking-tighter italic">Saúde da Rede Local</p>
        </div>

        <div className="bg-[#0d0d12] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity"><ShieldAlert size={64} /></div>
          <p className="text-gray-500 text-[10px] font-black uppercase mb-4 tracking-widest italic">Incidentes</p>
          <p className="text-5xl font-black text-rose-500 tracking-tighter">{metrics.incidents}</p>
          <p className="text-gray-600 text-[10px] mt-4 font-bold uppercase tracking-tighter italic">Quedas/Picos Detectados</p>
        </div>

        <div className="bg-[#0d0d12] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity"><ArrowDownLeft size={64} /></div>
          <p className="text-gray-500 text-[10px] font-black uppercase mb-4 tracking-widest italic">Latência Média</p>
          <p className="text-5xl font-black text-white tracking-tighter">{metrics.avgLatency}<span className="text-sm text-blue-400 ml-1 italic font-black">ms</span></p>
          <p className="text-gray-600 text-[10px] mt-4 font-bold uppercase tracking-tighter italic">Média Global de Resposta</p>
        </div>
      </div>

      {/* TIMELINE DE EVENTOS */}
      <div className="space-y-4 mb-20">
        <h4 className="text-white text-xs font-black uppercase tracking-[0.3em] mb-8 italic flex items-center gap-3">
          <div className="w-8 h-px bg-rose-500/50"></div> Timeline de Eventos Críticos
        </h4>
        
        {logs.map((log, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.05 }} 
            key={log.id} 
            className="group bg-[#0d0d12] border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between hover:border-emerald-500/20 transition-all shadow-xl"
          >
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl ${log.status === 'offline' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {log.status === 'offline' ? <AlertTriangle size={24} /> : <TrendingDown size={24} />}
              </div>
              <div>
                <h5 className="text-white font-black text-lg tracking-tight uppercase italic">{log.status === 'offline' ? 'Outage' : 'Latência Alta'}</h5>
                <p className="text-gray-500 font-mono text-[10px] font-bold uppercase tracking-widest">{log.host} • {log.latency}ms</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Clock size={12} />
                <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
              <span className={`text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest border transition-all ${
                log.status === 'offline' ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' : 'bg-amber-500/20 text-amber-400 border-amber-500/20'
              }`}>
                {log.status === 'offline' ? 'Crítico' : 'Aviso'}
              </span>
            </div>
          </motion.div>
        ))}

        {logs.length === 0 && (
          <div className="py-32 text-center bg-emerald-500/[0.02] border border-dashed border-emerald-500/20 rounded-[3rem]">
            <CheckCircle2 size={56} className="mx-auto text-emerald-500 mb-6 opacity-30 animate-bounce" />
            <p className="text-emerald-500 font-black uppercase tracking-[0.3em] text-sm italic">Ambiente 100% Estável</p>
          </div>
        )}
      </div>
    </div>
  );
}