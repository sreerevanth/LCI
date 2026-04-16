import { motion } from 'framer-motion';

function Metric({ label, value, unit, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-xs font-mono text-white/70">
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function MetricsPanel({ metrics, state }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/3 border border-white/8 text-center">
        <p className="text-xs text-slate-500">Waiting for interactions…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-white/3 border border-white/8 space-y-3"
    >
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Metrics</p>

      <Metric
        label="Typing Speed"
        value={metrics.avgTypingSpeed || 0}
        unit=" cps"
        max={10}
        color="from-violet-500 to-purple-500"
      />
      <Metric
        label="Click Rate"
        value={metrics.clickRate || 0}
        unit=" cps"
        max={3}
        color="from-blue-500 to-cyan-500"
      />
      <Metric
        label="Error Rate"
        value={(metrics.errorRate || 0) * 100}
        unit="%"
        max={100}
        color="from-red-500 to-orange-500"
      />
      <Metric
        label="Hesitation"
        value={Math.min(10, (metrics.hesitationTime || 0) / 1000)}
        unit="s"
        max={10}
        color="from-amber-500 to-yellow-500"
      />
    </motion.div>
  );
}
