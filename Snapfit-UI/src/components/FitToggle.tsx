import { motion } from 'framer-motion';

interface FitToggleProps {
  value: 'Regular' | 'Oversized';
  onChange: (val: 'Regular' | 'Oversized') => void;
}

export default function FitToggle({ value, onChange }: FitToggleProps) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-950 border border-slate-800 p-1.5 shadow-inner">
      <button
        onClick={() => onChange('Regular')}
        className="relative px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer text-slate-200"
      >
        {value === 'Regular' && (
          <motion.div
            layoutId="active-fit-bg"
            className="absolute inset-0 rounded-xl bg-slate-900 border border-slate-800 shadow"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10">Regular Fit</span>
      </button>

      <button
        onClick={() => onChange('Oversized')}
        className="relative px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer text-slate-200"
      >
        {value === 'Oversized' && (
          <motion.div
            layoutId="active-fit-bg"
            className="absolute inset-0 rounded-xl bg-slate-900 border border-slate-800 shadow"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <span>Oversized Fit</span>
        </span>
      </button>
    </div>
  );
}
