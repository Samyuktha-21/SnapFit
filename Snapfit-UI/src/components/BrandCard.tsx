import { AlertCircle } from 'lucide-react';
import type { BrandData } from '../types/brands';
import type { BodyMeasurements } from '../types/measurements';
import { matchBrandSize } from '../services/sizeMatching';
import { Link } from 'react-router-dom';

interface BrandCardProps {
  brand: BrandData;
  gender: 'Men' | 'Women';
  bodyProfile: BodyMeasurements;
  activeFit: 'Regular' | 'Oversized';
}

export default function BrandCard({
  brand,
  gender,
  bodyProfile,
  activeFit
}: BrandCardProps) {
  // Compute size match details
  const matchResult = matchBrandSize(brand, bodyProfile, gender, activeFit);
  
  const isCustomBrand = brand.id !== undefined && !['Nike', 'Zara', 'Uniqlo'].includes(brand.brand);

  const cardContent = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          {brand.logoUrl ? (
            <div className="h-14 w-14 rounded-2xl bg-black/60 border border-white/10 p-2.5 flex items-center justify-center shadow-inner backdrop-blur-md">
              <img 
                src={brand.logoUrl} 
                alt={`${brand.brand} logo`} 
                className="max-h-full max-w-full object-contain filter invert opacity-90"
              />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-neutral-900 border border-neutral-700 text-neutral-300 font-black flex items-center justify-center text-xl shadow-inner backdrop-blur-md">
              {brand.brand.charAt(0)}
            </div>
          )}
          <div className="flex flex-col">
            <h3 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">{brand.brand}</h3>
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{activeFit} Fit</span>
          </div>
        </div>

        {/* Custom Brand Tag */}
        {isCustomBrand && (
          <span className="rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-black text-white uppercase tracking-widest shadow-sm">
            Custom
          </span>
        )}
      </div>

      {/* Recommended Size Box */}
      <div className="flex items-center justify-between mt-auto bg-black/20 rounded-3xl p-6 border border-white/5 backdrop-blur-sm">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Recommended Size</span>
          <span className="text-4xl font-black text-white font-sans tracking-tight drop-shadow-md">
            {matchResult.recommendedSize}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Confidence</span>
          <span className="text-sm font-black px-3 py-1.5 rounded-full border bg-white/10 text-white border-white/20">
            {matchResult.confidence}% Match
          </span>
        </div>
      </div>

      {/* Borderline Indicator */}
      {matchResult.isBorderline && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-neutral-900/50 border border-neutral-700 p-4">
          <AlertCircle className="h-4 w-4 text-neutral-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-neutral-300 leading-relaxed">
            Borderline: runs slightly {matchResult.borderlineMessage?.includes('slim') ? 'slim' : 'loose'}.
          </p>
        </div>
      )}

      {/* Footer link trigger */}
      <div className="mt-6 text-right">
        <span className="text-[12px] font-bold text-neutral-400 group-hover:text-white transition-colors tracking-wide">
          View Detailed Metrics →
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative group h-full w-full">
      <Link
        to={`/brands/${brand.brand}?fit=${activeFit}`}
        className="block h-full w-full rounded-[2.5rem] bg-gradient-to-br from-neutral-900/90 to-black/90 border border-white/10 p-8 flex flex-col justify-between backdrop-blur-3xl shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:border-white/20 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
      >
        {/* Decorative inner glow */}
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity duration-700 blur-3xl transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
          <div className="w-40 h-40 rounded-full bg-white/20"></div>
        </div>
        
        <div className="relative z-10 h-full">
          {cardContent}
        </div>
      </Link>
    </div>
  );
}
