import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MeasurementCardProps {
  label: string;
  value: number;
  unit: string;
  icon: ReactNode;
  colorClass: string; // e.g. "from-indigo-500 to-purple-500"
  shadowClass: string; // e.g. "shadow-indigo-500/10"
  gaugePercentage?: number; // optional, e.g. 92% confidence or scaled value
  className?: string;
}

export default function MeasurementCard({
  label,
  value,
  unit,
  icon,
  colorClass,
  shadowClass,
  gaugePercentage,
  className = ''
}: MeasurementCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-3xl border border-neutral-800 bg-neutral-950/70 p-6 shadow-xl backdrop-blur-sm overflow-hidden hover:border-neutral-700 transition-all duration-300 group flex flex-col justify-between ${shadowClass} ${className}`}
    >
      {/* Background radial gradient glow on hover */}
      <div className="absolute -inset-px bg-gradient-to-tr from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-neutral-500 tracking-wider uppercase mb-1">
            {label}
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-black text-white tracking-tight font-sans">
              {value}
            </span>
            <span className="text-sm font-semibold text-neutral-400">
              {unit}
            </span>
          </div>
        </div>
        
        {/* Glow Icon Holder */}
        <div className={`rounded-2xl bg-gradient-to-tr ${colorClass} p-2.5 text-white shadow-md`}>
          {icon}
        </div>
      </div>

      {/* Visual gauge line */}
      {gaugePercentage !== undefined && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold mb-1.5 uppercase">
            <span>Accuracy Level</span>
            <span className="text-neutral-300 font-mono font-semibold">{gaugePercentage}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${gaugePercentage}%` }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
