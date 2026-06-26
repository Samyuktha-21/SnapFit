import { AlertCircle } from 'lucide-react';
import type { BrandData, FitPref } from '../types/brands';
import type { BodyMeasurements } from '../types/measurements';
import { matchBrandSize } from '../services/sizeMatching';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { fmtRange } from '../utils/units';
import { Link } from 'react-router-dom';

interface BrandCardProps {
  brand: BrandData;
  gender: 'Men' | 'Women';
  bodyProfile: BodyMeasurements;
  fitPref: FitPref;
}

export default function BrandCard({ brand, gender, bodyProfile, fitPref }: BrandCardProps) {
  const { unit } = useMeasurementStore();
  const m = matchBrandSize(brand, bodyProfile, gender, 'Regular', fitPref);

  const ranges: [string, [number, number] | undefined][] = [
    [gender === 'Women' ? 'Bust' : 'Chest', m.chest_cm],
    ['Waist', m.waist_cm],
    ['Hip', m.hip_cm],
  ];

  return (
    <Link
      to={`/brands/${encodeURIComponent(brand.brand)}`}
      className="group block h-full w-full rounded-[2rem] bg-gradient-to-br from-neutral-900/90 to-black/90 border border-white/10 p-7 flex flex-col backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.4)] hover:border-accent/40 hover:-translate-y-1.5 transition-all duration-400 relative overflow-hidden"
    >
      {/* Accent glow */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-neutral-900 border border-neutral-700 text-white font-display text-xl flex items-center justify-center">
            {brand.brand.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">{brand.brand}</h3>
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{fitPref} fit</span>
          </div>
        </div>

        {/* Recommended size */}
        <div className="flex items-end justify-between rounded-3xl bg-black/30 p-5 border border-white/5">
          <div>
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Your size</span>
            <span className="text-5xl font-black text-accent tracking-tight leading-none">{m.recommendedSize}</span>
          </div>
          <span className="text-xs font-black px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30">
            {m.confidence}% match
          </span>
        </div>

        {/* Measurement ranges for that size */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {ranges.map(([label, r]) => (
            <div key={label} className="rounded-xl bg-black/30 border border-neutral-800 p-2.5 text-center">
              <span className="block text-[9px] uppercase tracking-widest text-neutral-500">{label}</span>
              <span className="block text-[11px] font-bold text-neutral-200 mt-0.5 tabular-nums">{fmtRange(r, unit)}</span>
            </div>
          ))}
        </div>

        {/* Borderline note */}
        {m.isBorderline && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-neutral-900/60 border border-neutral-700 p-3">
            <AlertCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-neutral-300 leading-relaxed">{m.borderlineMessage}</p>
          </div>
        )}

        <span className="mt-auto pt-5 text-right text-[11px] font-bold text-neutral-400 group-hover:text-accent transition-colors">
          View detail →
        </span>
      </div>
    </Link>
  );
}
