import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, WifiOff } from 'lucide-react';

interface ToastProps {
  message: string;
  host: string;
  onClose: () => void;
}

export function NotificationToast({ message, host, onClose }: ToastProps) {
  return (
    <motion.div 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md"
    >
      <div className="bg-[#1a1a24] border border-rose-500/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(244,63,94,0.2)] backdrop-blur-xl flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <div className="bg-rose-500/20 p-3 rounded-2xl text-rose-500 animate-pulse">
            <WifiOff size={24} />
          </div>
          <div>
            <h4 className="text-white font-black text-xs uppercase tracking-widest italic">Incidente Detectado</h4>
            <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-tighter">
              {host}: <span className="text-rose-400">{message}</span>
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-600 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}