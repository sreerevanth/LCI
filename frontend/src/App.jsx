import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from './hooks/useWebSocket';
import { useInteractionTracker } from './hooks/useInteractionTracker';
import CognitiveBadge from './components/CognitiveBadge';
import MetricsPanel from './components/MetricsPanel';
import HelpPanel from './components/HelpPanel';
import DemoWorkspace from './components/DemoWorkspace';

const STATE_BG = {
  confused: 'from-slate-950 via-orange-950/20 to-slate-950',
  thinking: 'from-slate-950 via-blue-950/20 to-slate-950',
  confident: 'from-slate-950 via-emerald-950/15 to-slate-950',
  idle: 'from-slate-950 via-slate-900 to-slate-950',
};

export default function App() {
  const { connected, cognitiveState, sendEvent } = useWebSocket();
  const { state, confidence, metrics, adaptations, helpMessage } = cognitiveState;

  useInteractionTracker(sendEvent);

  const bgGradient = STATE_BG[state] || STATE_BG.idle;

  return (
    <motion.div
      animate={{ background: undefined }}
      className={`min-h-screen bg-gradient-to-br ${bgGradient} transition-all duration-1000`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: state === 'confused' ? [1, 1.2, 1] : 1,
            opacity: state === 'confused' ? 0.25 : 0.12,
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px]
                     bg-violet-600 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ opacity: state === 'confident' ? 0.2 : 0.08 }}
          transition={{ duration: 1.5 }}
          className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px]
                     bg-blue-600 rounded-full blur-[100px]"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/8 backdrop-blur-sm bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: state === 'thinking' ? 360 : 0 }}
              transition={{ duration: 3, repeat: state === 'thinking' ? Infinity : 0, ease: 'linear' }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600
                         flex items-center justify-center text-sm"
            >
              🧠
            </motion.div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Live Cognitive Interface
              </h1>
              <p className="text-xs text-slate-500">Real-time UI adaptation engine</p>
            </div>
          </div>

          <CognitiveBadge state={state} confidence={confidence} connected={connected} />
        </div>
      </header>

      {/* Main layout */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left sidebar */}
          <AnimatePresence>
            {!adaptations.simplifyLayout && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, width: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                {/* State card */}
                <motion.div
                  layout
                  className="p-5 rounded-2xl bg-white/3 border border-white/8 space-y-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Cognitive State
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={state}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="text-center py-4"
                    >
                      <div className="text-5xl mb-3">
                        {state === 'confused' ? '🤔' : state === 'thinking' ? '💭' : state === 'confident' ? '⚡' : '😴'}
                      </div>
                      <p className="text-xl font-bold text-white capitalize">{state}</p>
                      <p className="text-sm text-slate-400 mt-1">{confidence}% confidence</p>

                      {/* Confidence bar */}
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                          animate={{ width: `${confidence}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* Metrics */}
                <MetricsPanel metrics={metrics} state={state} />

                {/* Active adaptations */}
                <motion.div
                  layout
                  className="p-4 rounded-2xl bg-white/3 border border-white/8 space-y-2"
                >
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Active Adaptations
                  </p>
                  {[
                    { key: 'highlightButtons', label: '🔆 Button highlights', active: adaptations.highlightButtons },
                    { key: 'showTooltips', label: '💬 Tooltips enabled', active: adaptations.showTooltips },
                    { key: 'simplifyLayout', label: '🧹 Simplified layout', active: adaptations.simplifyLayout },
                    { key: 'showHelpPanel', label: '🤝 Help panel', active: adaptations.showHelpPanel },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{item.label}</span>
                      <motion.div
                        animate={{
                          backgroundColor: item.active ? 'rgb(139,92,246)' : 'rgba(255,255,255,0.08)',
                        }}
                        className="w-8 h-4 rounded-full relative"
                      >
                        <motion.div
                          animate={{ x: item.active ? 16 : 2 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
                        />
                      </motion.div>
                    </div>
                  ))}
                </motion.div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main workspace */}
          <motion.main
            layout
            className={`space-y-5 ${adaptations.simplifyLayout ? 'lg:col-span-3' : 'lg:col-span-2'}`}
          >
            {/* Simplified mode banner */}
            <AnimatePresence>
              {adaptations.simplifyLayout && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl
                             bg-orange-500/10 border border-orange-500/20 text-orange-300 text-sm"
                >
                  <span>🧹</span>
                  <span className="font-medium">Simplified mode active</span>
                  <span className="text-orange-400/60">— layout reduced to help focus</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Help message */}
            <HelpPanel
              message={helpMessage}
              state={state}
              visible={adaptations.showHelpPanel && !!helpMessage}
            />

            {/* The actual workspace */}
            <motion.div
              layout
              className="p-6 rounded-2xl bg-white/3 border border-white/8"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {adaptations.simplifyLayout ? 'Quick Actions' : 'Workspace'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {adaptations.simplifyLayout
                      ? 'Focused view — most essential options'
                      : 'Interact naturally — your behavior adapts the interface'
                    }
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400 font-mono">
                    {adaptations.colorScheme}
                  </span>
                </div>
              </div>

              <DemoWorkspace
                adaptations={adaptations}
                simplified={adaptations.simplifyLayout}
              />
            </motion.div>

            {/* Interaction guide */}
            {!adaptations.simplifyLayout && (
              <motion.div
                layout
                className="p-4 rounded-2xl bg-white/2 border border-white/5"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Try These Interactions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: '⌨️', text: 'Type slowly with backspaces → confused state' },
                    { icon: '🖱️', text: 'Click rapidly → confident state' },
                    { icon: '⏸️', text: 'Stop interacting for 3s → hesitation detected' },
                    { icon: '✍️', text: 'Type fast without errors → confident mode' },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                      <span className="mt-0.5">{tip.icon}</span>
                      <span>{tip.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.main>
        </div>
      </div>
    </motion.div>
  );
}
