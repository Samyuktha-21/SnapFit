import { Lock, Sparkles, AlertCircle } from 'lucide-react';
import type { BrandData } from '../types/brands';
import type { BodyMeasurements } from '../types/measurements';
import { matchBrandSize } from '../services/sizeMatching';
import { Link } from 'react-router-dom';

interface BrandCardProps {
  brand: BrandData;
  gender: 'Men' | 'Women';
  bodyProfile: BodyMeasurements;
  isPremium: boolean;
  activeFit: 'Regular' | 'Oversized';
  onUpgradeClick: () => void;
}

export default function BrandCard({
  brand,
  gender,
  bodyProfile,
  isPremium,
  activeFit,
  onUpgradeClick
}: BrandCardProps) {
  // Compute size match details
  const matchResult = matchBrandSize(brand, bodyProfile, gender, activeFit);
  
  // Custom brands or Oversized fit are Premium-only
  const isCustomBrand = brand.id !== undefined && !['Nike', 'Zara', 'Uniqlo'].includes(brand.brand);
  const isLocked = !isPremium && (activeFit === 'Oversized' || isCustomBrand);

  const cardContent = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 p-2 flex items-center justify-center">
              <img 
                src={brand.logoUrl} 
                alt={`${brand.brand} logo`} 
                className="max-h-full max-w-full object-contain filter invert opacity-80"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-indigo-950 border border-indigo-800/40 text-indigo-400 font-black flex items-center justify-center text-sm">
              {brand.brand.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-bold text-white tracking-tight">{brand.brand}</h3>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{activeFit} Fit</span>
          </div>
        </div>

        {/* Custom Brand Tag */}
        {isCustomBrand && (
          <span className="rounded bg-purple-950 border border-purple-800/40 px-1.5 py-0.5 text-[9px] font-bold text-purple-400 uppercase">
            Custom
          </span>
        )}
      </div>

      {/* Recommended Size Box */}
      <div className="flex items-center gap-6 mt-auto">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size</span>
          <span className="text-3xl font-black text-white font-sans mt-0.5 tracking-tight">
            {matchResult.recommendedSize}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confidence</span>
          <span className={`text-sm font-bold mt-1.5 flex items-center gap-1 ${
            matchResult.confidence >= 85 
              ? 'text-emerald-400' 
              : matchResult.confidence >= 70 
                ? 'text-amber-400' 
                : 'text-indigo-400'
          }`}>
            {matchResult.confidence}% Match
          </span>
        </div>
      </div>

      {/* Borderline Indicator */}
      {matchResult.isBorderline && (
        <div className="mt-4 flex items-start gap-1.5 rounded-lg bg-amber-950/20 border border-amber-900/30 p-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium text-amber-300 leading-normal line-clamp-2">
            Borderline: runs slightly {matchResult.borderlineMessage?.includes('slim') ? 'slim' : 'loose'}.
          </p>
        </div>
      )}

      {/* Footer link trigger */}
      {!isLocked && (
        <div className="mt-5 pt-3 border-t border-slate-900 text-right">
          <span className="text-[11px] font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
            View Range Explainer →
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative group h-full">
      {isLocked ? (
        // LOCKED CARD
        <div 
          onClick={onUpgradeClick}
          className="relative h-full rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-xl overflow-hidden cursor-pointer"
        >
          {/* Blurred background view */}
          <div className="blur-[3px] select-none opacity-45 pointer-events-none">
            {cardContent}
          </div>

          {/* Locked Shield Overlay */}
          <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-2xl bg-indigo-950 border border-indigo-800/40 p-3 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <Lock className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span>Unlock Premium Fit</span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[160px] leading-relaxed">
              {activeFit === 'Oversized' 
                ? 'Unlock Oversized sizing curves.' 
                : 'Unlock custom uploaded brands.'}
            </p>
          </div>
        </div>
      ) : (
        // ACTIVE BRAND CARD LINK
        <Link
          to={`/brands/${brand.brand}?fit=${activeFit}`}
          className="block h-full rounded-3xl border border-slate-800 hover:border-slate-700 bg-slate-950 p-6 shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300"
        >
          {cardContent}
        </Link>
      )}
    </div>
  );
}
