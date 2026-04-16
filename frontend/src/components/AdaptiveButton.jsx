import { motion } from 'framer-motion';
import { useState } from 'react';

export default function AdaptiveButton({
  children,
  onClick,
  variant = 'primary',
  highlight = false,
  glowIntensity = 0,
  tooltip = null,
  showTooltip = false,
  disabled = false,
  className = '',
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white',
    secondary: 'bg-white/8 text-white/80 border border-white/10',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white',
  };

  const glowColors = {
    primary: `0 0 ${glowIntensity * 4}px ${glowIntensity * 2}px rgba(139,92,246,0.6)`,
    secondary: `0 0 ${glowIntensity * 4}px ${glowIntensity * 2}px rgba(255,255,255,0.2)`,
    success: `0 0 ${glowIntensity * 4}px ${glowIntensity * 2}px rgba(52,211,153,0.6)`,
    danger: `0 0 ${glowIntensity * 4}px ${glowIntensity * 2}px rgba(239,68,68,0.6)`,
  };

  const shouldGlow = highlight || glowIntensity > 3;

  return (
    <div className="relative inline-block">
      <motion.button
        onClick={onClick}
        disabled={disabled}
        onHoverStart={() => { setIsHovered(true); if (showTooltip && tooltip) setShowTip(true); }}
        onHoverEnd={() => { setIsHovered(false); setShowTip(false); }}
        onTapStart={() => setIsPressed(true)}
        onTap={() => setIsPressed(false)}
        onTapCancel={() => setIsPressed(false)}
        animate={{
          scale: isPressed ? 0.96 : isHovered ? 1.03 : 1,
          boxShadow: shouldGlow && !disabled ? glowColors[variant] : 'none',
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`
          relative px-5 py-2.5 rounded-xl font-semibold text-sm
          transition-colors duration-200 cursor-pointer
          disabled:opacity-40 disabled:cursor-not-allowed
          ${variants[variant]} ${className}
        `}
      >
        {/* Highlight pulse ring */}
        {shouldGlow && !disabled && (
          <motion.span
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-xl border-2 border-violet-400/50 pointer-events-none"
          />
        )}
        {children}
      </motion.button>

      {/* Tooltip */}
      {tooltip && showTip && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                     px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10
                     text-xs text-white/80 whitespace-nowrap shadow-xl pointer-events-none"
        >
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </motion.div>
      )}
    </div>
  );
}
