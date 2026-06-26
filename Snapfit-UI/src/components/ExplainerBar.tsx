import { motion } from 'framer-motion';

interface SizeBlock {
  size: string;
  min: number;
  max: number;
}

interface ExplainerBarProps {
  sizes: SizeBlock[];
  userValue: number;
  recommendedSize: string;
  gender: 'Men' | 'Women';
}

export default function ExplainerBar({
  sizes,
  userValue,
  recommendedSize,
  gender
}: ExplainerBarProps) {
  // Sort sizes by min value
  const sortedSizes = [...sizes].sort((a, b) => a.min - b.min);
  
  if (sortedSizes.length === 0) return null;

  // Find scale bounds
  const scaleMin = Math.max(50, sortedSizes[0].min - 5);
  const scaleMax = sortedSizes[sortedSizes.length - 1].max + 5;
  const scaleRange = scaleMax - scaleMin;

  // Calculate percentage helper
  const getPercent = (val: number) => {
    const percent = ((val - scaleMin) / scaleRange) * 100;
    return Math.min(100, Math.max(0, percent));
  };

  const needlePosition = getPercent(userValue);
  const isMen = gender === 'Men';

  return (
    <div className="w-full py-8 px-4">
      {/* Visual Ruler Scale Header */}
      <div className="relative h-6 flex justify-between items-center text-[10px] text-slate-500 font-mono font-semibold px-2 mb-2">
        <span>{scaleMin}cm</span>
        <span>{Math.round(scaleMin + scaleRange * 0.25)}cm</span>
        <span>{Math.round(scaleMin + scaleRange * 0.5)}cm</span>
        <span>{Math.round(scaleMin + scaleRange * 0.75)}cm</span>
        <span>{scaleMax}cm</span>
      </div>

      {/* Main Multi-segment Bar */}
      <div className="relative h-10 w-full rounded-2xl bg-slate-900 border border-slate-800 flex overflow-hidden shadow-inner">
        {sortedSizes.map((sizeBlock, idx) => {
          const widthPct = ((sizeBlock.max - sizeBlock.min) / scaleRange) * 100;
          const isRecommended = sizeBlock.size === recommendedSize;
          
          // Color schemes for blocks
          const colors = [
            'from-indigo-600/30 to-indigo-500/20 border-indigo-500/20 text-indigo-400',
            'from-purple-600/30 to-purple-500/20 border-purple-500/20 text-purple-400',
            'from-pink-600/30 to-pink-500/20 border-pink-500/20 text-pink-400',
            'from-rose-600/30 to-rose-500/20 border-rose-500/20 text-rose-400'
          ];
          const activeColors = [
            'from-indigo-500 to-indigo-600 text-white shadow-lg border-indigo-400 shadow-indigo-500/20',
            'from-purple-500 to-purple-600 text-white shadow-lg border-purple-400 shadow-purple-500/20',
            'from-pink-500 to-pink-600 text-white shadow-lg border-pink-400 shadow-pink-500/20',
            'from-rose-500 to-rose-600 text-white shadow-lg border-rose-400 shadow-rose-500/20'
          ];
          
          const colorClass = isRecommended ? activeColors[idx % 4] : colors[idx % 4];

          return (
            <div
              key={sizeBlock.size}
              style={{ width: `${widthPct}%` }}
              className={`h-full border-r border-slate-950/60 last:border-r-0 flex flex-col items-center justify-center bg-gradient-to-b ${colorClass} transition-all duration-300 relative`}
            >
              <span className="text-xs font-black tracking-tight">{sizeBlock.size}</span>
              <span className="text-[9px] font-bold opacity-60 mt-0.5">
                {sizeBlock.min}-{sizeBlock.max}
              </span>
            </div>
          );
        })}

        {/* Needle Marker Indicator */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${needlePosition}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="absolute top-0 bottom-0 w-[4px] bg-white z-20 -translate-x-[2px] shadow-[0_0_12px_rgba(255,255,255,1)]"
        >
          {/* Top pin cap */}
          <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border border-slate-950" />
          
          {/* Glowing pulse ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/20 border border-white/40 animate-ping pointer-events-none" />
        </motion.div>
      </div>

      {/* Floating Measurement Indicator Tag */}
      <div className="relative h-12 w-full mt-1.5">
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${needlePosition}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
        >
          <div className="w-[1px] h-2 bg-white/60" />
          <div className="rounded-xl border border-white/20 bg-slate-950/95 px-3 py-1.5 shadow-xl text-center flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase">{isMen ? 'Chest' : 'Bust'}</span>
            <span className="text-xs font-black text-white font-mono">{userValue}cm</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
