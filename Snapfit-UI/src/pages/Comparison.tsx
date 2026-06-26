import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import type { BrandData, MatchResult } from '../types/brands';
import { matchBrandSize } from '../services/sizeMatching';
import { ShieldCheck, Sparkles, LayoutGrid, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import UpgradeModal from '../components/UpgradeModal';

export default function Comparison() {
  const navigate = useNavigate();
  const { bodyProfile, gender, user } = useMeasurementStore();

  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const isPremium = user?.is_premium || false;

  // Load brands database
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const list = await firestore.getBrands();
        const filtered = list.filter(b => b.gender === gender);
        setBrands(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, [gender]);

  if (!bodyProfile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Webcam Scan Required</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Compare sizing matrices after capturing your body measurements.
        </p>
        <button
          onClick={() => navigate('/height-input')}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 cursor-pointer"
        >
          Measure Now
        </button>
      </div>
    );
  }

  // Calculate results for regular and oversized fits
  const comparisonData = brands.map((brand) => {
    const regularMatch = matchBrandSize(brand, bodyProfile, gender, 'Regular');
    const oversizedMatch = matchBrandSize(brand, bodyProfile, gender, 'Oversized');
    return {
      brand: brand.brand,
      logoUrl: brand.logoUrl,
      regular: regularMatch,
      oversized: oversizedMatch
    };
  });

  const matrixContent = (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-900 bg-slate-950 text-slate-450 text-[10px] font-bold uppercase tracking-wider">
            <th className="py-4 px-6">Brand</th>
            <th className="py-4 px-6 text-center">Regular Fit Size</th>
            <th className="py-4 px-6 text-center">Regular Match</th>
            <th className="py-4 px-6 text-center">Oversized Fit Size</th>
            <th className="py-4 px-6 text-center">Oversized Match</th>
            <th className="py-4 px-6">Garment Length</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900 text-xs font-semibold text-slate-300">
          {comparisonData.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
              {/* Brand Logo & Name */}
              <td className="py-4 px-6 font-bold text-white flex items-center gap-3">
                {row.logoUrl ? (
                  <div className="h-7 w-7 rounded bg-slate-900 p-1 flex items-center justify-center border border-slate-800">
                    <img src={row.logoUrl} alt={row.brand} className="max-h-full max-w-full object-contain filter invert opacity-70" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded bg-indigo-950 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    {row.brand.charAt(0)}
                  </div>
                )}
                <span>{row.brand}</span>
              </td>
              
              {/* Regular Recommended Size */}
              <td className="py-4 px-6 text-center font-black text-white text-sm">
                {row.regular.recommendedSize}
              </td>
              
              {/* Regular Confidence match */}
              <td className="py-4 px-6 text-center">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                  row.regular.confidence >= 85 ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/20' : 'bg-indigo-950/30 text-indigo-400'
                }`}>
                  {row.regular.confidence}% Match
                </span>
              </td>

              {/* Oversized Recommended Size */}
              <td className="py-4 px-6 text-center font-black text-white text-sm">
                {row.oversized.recommendedSize}
              </td>

              {/* Oversized Confidence match */}
              <td className="py-4 px-6 text-center">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                  row.oversized.confidence >= 85 ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/20' : 'bg-indigo-950/30 text-indigo-400'
                }`}>
                  {row.oversized.confidence}% Match
                </span>
              </td>

              {/* Length explanation */}
              <td className="py-4 px-6 text-slate-500 font-mono">
                R: {row.regular.maxVal ? `${row.regular.maxVal}cm max` : 'N/A'} | O: {row.oversized.maxVal ? `${row.oversized.maxVal}cm max` : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-[85vh] py-8 px-4 md:px-6 relative">
      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
      
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="pb-6 border-b border-slate-900">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-7 w-7 text-indigo-400" />
            <span>Side-by-Side Sizing Matrix</span>
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            Compare sizing curves, chest bounds, and length parameters across all brands simultaneously.
          </p>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/25 border-t-indigo-500" />
          </div>
        ) : isPremium ? (
          // RENDER MATRIX IF PREMIUM
          matrixContent
        ) : (
          // LOCKED SCREEN OVERLAY IF FREE
          <div className="relative">
            {/* Blurred Table simulation for visual premium effect */}
            <div className="blur-[6px] select-none pointer-events-none opacity-20">
              {matrixContent}
            </div>

            {/* Lock Shield Banner card */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="w-full max-w-md rounded-3xl border border-indigo-500/30 bg-slate-900 p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-2xl rounded-full" />
                
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-950 border border-indigo-800/40 text-indigo-400 mb-4 shadow">
                  <Lock className="h-6 w-6" />
                </div>
                
                <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-yellow-500/30 px-3 py-1 text-xs font-semibold text-yellow-400 mb-3">
                  <Sparkles className="h-3.5 w-3.5 fill-yellow-400" />
                  <span>Premium Dashboard Feature</span>
                </div>
                
                <h3 className="text-xl font-bold text-white tracking-tight">Unlock side-by-side comparison</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Project your body profile across multiple size charts in a unified layout. Track garment lengths and fit tolerances in real-time.
                </p>

                <button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="w-full mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-455 hover:to-pink-455 text-white font-bold text-sm py-3.5 shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  <span>Upgrade to Premium</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
