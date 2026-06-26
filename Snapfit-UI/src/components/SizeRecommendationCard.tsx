import { motion } from 'framer-motion';
import { Sparkles, Activity } from 'lucide-react';

interface SizeRecommendationCardProps {
  gender: 'Men' | 'Women';
  size: string;
  confidence: number;
  className?: string;
}

export default function SizeRecommendationCard({
  gender,
  size,
  confidence,
  className = ''
}: SizeRecommendationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-3xl border border-white/20 bg-black/40 shadow-2xl backdrop-blur-md p-8 overflow-hidden flex flex-col justify-center ${className}`}
    >
      {/* Decorative background glows */}
      <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-neutral-500/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center md:justify-between gap-8 relative z-10">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-300 mb-4">
            <Sparkles className="h-3 w-3 text-white" />
            <span>Standard Recommended Profile</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Your SnapFit Profile
          </h2>
          <p className="text-sm text-neutral-400 mt-2 max-w-md leading-relaxed">
            We have generated a unified {gender.toLowerCase()}'s body profile. You can now project this sizing across different clothing brands to get custom fits.
          </p>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase mb-1">
              Generic Size
            </span>
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white border border-neutral-200 shadow-xl text-black">
              <span className="text-4xl font-black font-sans tracking-tighter">
                {size}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-white font-bold text-sm">
              <Activity className="h-4 w-4 stroke-[2.5]" />
              <span>{confidence}% Confidence</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 max-w-[150px]">
              Derived by scaling your height ({gender === 'Men' ? 'chest' : 'bust'} reference).
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
