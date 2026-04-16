import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function HelpPanel({ message, state, visible }) {
  const [displayMsg, setDisplayMsg] = useState(message);

  useEffect(() => {
    if (message) setDisplayMsg(message);
  }, [message]);

  const stateGradients = {
    confused: 'from-orange-500/20 to-red-500/10 border-orange-500/20',
    thinking: 'from-blue-500/20 to-indigo-500/10 border-blue-500/20',
    confident: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20',
    idle: 'from-slate-500/20 to-slate-600/10 border-slate-500/20',
  };

  const iconMap = {
    confused: '💡',
    thinking: '🔍',
    confident: '🚀',
    idle: '👋',
  };

  return (
    <AnimatePresence>
      {visible && displayMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`p-4 rounded-2xl bg-gradient-to-br border ${stateGradients[state] || stateGradients.idle} backdrop-blur-sm`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{iconMap[state] || '💬'}</span>
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">
                Cognitive Assistant
              </p>
              <motion.p
                key={displayMsg}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-sm text-white/80 leading-relaxed"
              >
                {displayMsg}
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
