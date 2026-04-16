import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdaptiveButton from './AdaptiveButton';

const STEPS = [
  { id: 1, label: 'Configure', icon: '⚙️', desc: 'Set up your preferences and parameters.' },
  { id: 2, label: 'Process', icon: '⚡', desc: 'Run the cognitive processing pipeline.' },
  { id: 3, label: 'Analyze', icon: '🔬', desc: 'Review insights and analytics.' },
  { id: 4, label: 'Export', icon: '📤', desc: 'Export your results and reports.' },
];

export default function DemoWorkspace({ adaptations, simplified }) {
  const [activeStep, setActiveStep] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);

  const { highlightButtons, showTooltips, glowIntensity } = adaptations;

  const tags = ['Neural', 'Cognitive', 'Adaptive', 'Real-time', 'Interface'];

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      {!simplified && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((step, i) => (
            <motion.button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              animate={{
                scale: activeStep === step.id ? 1 : 1,
                boxShadow: highlightButtons && activeStep !== step.id
                  ? `0 0 ${glowIntensity * 3}px rgba(139,92,246,0.4)`
                  : 'none',
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                transition-all duration-300 cursor-pointer
                ${activeStep === step.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/10'
                }`}
            >
              <span>{step.icon}</span>
              <span>{step.label}</span>
              {i < STEPS.length - 1 && activeStep > step.id && (
                <span className="text-emerald-400 text-xs">✓</span>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Active step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.25 }}
          className="p-5 rounded-2xl bg-white/3 border border-white/8 space-y-4"
        >
          {!simplified && (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{STEPS[activeStep - 1]?.icon}</span>
              <div>
                <h3 className="text-white font-semibold">{STEPS[activeStep - 1]?.label}</h3>
                <p className="text-xs text-slate-400">{STEPS[activeStep - 1]?.desc}</p>
              </div>
            </div>
          )}

          {/* Main input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {simplified ? 'What do you need?' : 'Input Parameters'}
            </label>
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={simplified
                  ? 'Type here for help…'
                  : 'Enter your cognitive parameters or prompt here…'
                }
                rows={simplified ? 2 : 3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                           text-sm text-white placeholder-white/20 resize-none
                           focus:outline-none focus:border-violet-500/50 focus:bg-white/8
                           transition-all duration-200"
              />
            </div>
          </div>

          {/* Tag selectors — hide in simplified mode */}
          {!simplified && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <motion.button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all
                    ${selectedTag === tag
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:border-violet-500/30'
                    }`}
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-3 pt-1">
            <AdaptiveButton
              variant="primary"
              onClick={handleSubmit}
              highlight={highlightButtons}
              glowIntensity={glowIntensity}
              tooltip={showTooltips ? 'Click to process your input' : null}
              showTooltip={showTooltips}
            >
              {submitted ? '✓ Sent!' : simplified ? 'Submit' : 'Process'}
            </AdaptiveButton>

            {!simplified && (
              <>
                <AdaptiveButton
                  variant="secondary"
                  onClick={() => setInputValue('')}
                  tooltip={showTooltips ? 'Clear the input field' : null}
                  showTooltip={showTooltips}
                >
                  Clear
                </AdaptiveButton>
                <AdaptiveButton
                  variant="success"
                  highlight={highlightButtons && activeStep < 4}
                  glowIntensity={highlightButtons ? glowIntensity : 0}
                  onClick={() => setActiveStep(Math.min(4, activeStep + 1))}
                  tooltip={showTooltips ? 'Move to next step' : null}
                  showTooltip={showTooltips}
                >
                  Next →
                </AdaptiveButton>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Data cards — hide in simplified mode */}
      {!simplified && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sessions', value: '1,284', delta: '+12%', color: 'text-emerald-400' },
            { label: 'Accuracy', value: '94.2%', delta: '+0.8%', color: 'text-emerald-400' },
            { label: 'Latency', value: '42ms', delta: '-3ms', color: 'text-blue-400' },
          ].map((card) => (
            <motion.div
              key={card.label}
              whileHover={{ y: -2 }}
              className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-1 cursor-default"
            >
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-lg font-bold text-white">{card.value}</p>
              <p className={`text-xs font-medium ${card.color}`}>{card.delta}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
