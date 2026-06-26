import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import type { BrandData } from '../types/brands';
import { matchBrandSize } from '../services/sizeMatching';
import { LayoutGrid } from 'lucide-react';
import MeasurementsTable from '../components/MeasurementsTable';

export default function Comparison() {
  const navigate = useNavigate();
  const { bodyProfile, gender } = useMeasurementStore();

  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);

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
        <p className="text-xs text-neutral-500 max-w-sm mb-6">
          Compare sizing matrices after capturing your body measurements.
        </p>
        <button
          onClick={() => navigate('/scanfit')}
          className="rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm px-6 py-3 cursor-pointer"
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

  const measureLabel = gender === 'Women' ? 'bust' : 'chest';

  const matrixContent = (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-[0_0_30px_rgba(255,255,255,0.04)]">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-neutral-500 text-[11px] uppercase tracking-widest border-b border-neutral-800">
            <th className="text-left font-semibold px-5 py-4">Brand</th>
            <th className="text-center font-semibold px-5 py-4">Regular fit</th>
            <th className="text-center font-semibold px-5 py-4">Oversized fit</th>
            <th className="text-right font-semibold px-5 py-4">{measureLabel} range (Reg.)</th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map((row, idx) => (
            <tr key={idx} className="border-b border-neutral-800/60 hover:bg-white/[0.02] transition-colors">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {row.logoUrl ? (
                    <div className="h-9 w-9 rounded-lg bg-black/50 border border-white/5 p-1.5 flex items-center justify-center">
                      <img src={row.logoUrl} alt={row.brand} className="max-h-full max-w-full object-contain filter invert opacity-90" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold flex items-center justify-center">
                      {row.brand.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold text-white">{row.brand}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-center">
                <span className="text-xl font-black text-white">{row.regular.recommendedSize}</span>
                <span className="block text-[10px] text-neutral-500 mt-0.5">{row.regular.confidence}% match</span>
              </td>
              <td className="px-5 py-4 text-center">
                <span className="text-xl font-black text-white">{row.oversized.recommendedSize}</span>
                <span className="block text-[10px] text-neutral-500 mt-0.5">{row.oversized.confidence}% match</span>
              </td>
              <td className="px-5 py-4 text-right text-neutral-300 tabular-nums">
                {row.regular.minVal}–{row.regular.maxVal} cm
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-[85vh] py-8 px-4 md:px-6 relative">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="pb-6 border-b border-neutral-800">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-7 w-7 text-white" />
            <span>Side-by-Side Sizing Matrix</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-2">
            Compare sizing curves, chest bounds, and length parameters across all brands simultaneously.
          </p>
        </div>

        {/* Tabular measurements summary */}
        <MeasurementsTable profile={bodyProfile} gender={gender} />

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          </div>
        ) : (
          // RENDER MATRIX ALWAYS
          matrixContent
        )}

      </div>
    </div>
  );
}
