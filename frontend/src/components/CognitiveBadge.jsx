import { motion, AnimatePresence } from 'framer-motion';

const STATE_CONFIG = {
  confused: {
    label: 'Confused',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    emoji: '🤔',
  },
  thinking: {
    label: 'Thinking',
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    emoji: '💭',
  },
  confident: {
    label: 'Confident',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    emoji: '⚡',
  },
  idle: {
    label: 'Idle',
    color: 'from-slate-500 to-slate-600',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    emoji: '😴',
  },
};

export default function CognitiveBadge({ state, confidence, connected }) {
  const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;

  return (
    <div className="flex items-center gap-3">
      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        <motion.div
          animate={{ scale: connected ? [1, 1.3, 1] : 1, opacity: connected ? 1 : 0.4 }}
          transition={{ repeat: connected ? Infinity : 0, duration: 2 }}
          className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`}
        />
        <span className={`text-xs font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* State badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.8, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 4 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border}`}
        >
          <span className="text-sm">{cfg.emoji}</span>
          <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
          <div className={`text-xs font-mono ${cfg.text} opacity-70`}>{confidence}%</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
