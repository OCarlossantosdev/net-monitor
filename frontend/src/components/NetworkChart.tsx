import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer} from 'recharts';

interface ChartProps {
  data: any[];
}

export function NetworkChart({ data }: ChartProps) {
  // Formata a hora para o eixo X
  const chartData = data.map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: log.latency,
    status: log.status
  }));

  return (
    <div className="h-[350px] w-full bg-[#0d0d12] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] italic">Oscilação de Latência (ms)</h4>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#4b5563" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#4b5563" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '10px', fontFamily: 'monospace' }}
            itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
          />
          <Area 
            type="monotone" 
            dataKey="latency" 
            stroke="#10b981" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorLatency)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}