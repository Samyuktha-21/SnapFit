import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import type { BrandData } from '../types/brands';
import { matchBrandSize } from '../services/sizeMatching';
import { LayoutGrid, Search } from 'lucide-react';
import MeasurementsTable from '../components/MeasurementsTable';
import FitPrefToggle from '../components/FitPrefToggle';
import UnitToggle from '../components/UnitToggle';
import { fmtRange } from '../utils/units';

export default function Comparison() {
  const navigate = useNavigate();
  const { bodyProfile, gender, fitPref, unit } = useMeasurementStore();

  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  const comparisonData = brands
    .filter((b) => b.brand.toLowerCase().includes(query.trim().toLowerCase()))
    .map((brand) => ({
      brand: brand.brand,
      match: matchBrandSize(brand, bodyProfile, gender, 'Regular', fitPref),
    }));

  const chestLabel = gender === 'Women' ? 'Bust' : 'Chest';

  const matrixContent = (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-[0_0_30px_rgba(212,255,63,0.05)]">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-neutral-500 text-[11px] uppercase tracking-widest border-b border-neutral-800">
            <th className="text-left font-semibold px-5 py-4">Brand</th>
            <th className="text-center font-semibold px-5 py-4">Your size</th>
            <th className="text-right font-semibold px-5 py-4">{chestLabel}</th>
            <th className="text-right font-semibold px-5 py-4">Waist</th>
            <th className="text-right font-semibold px-5 py-4">Hip</th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-10 text-center text-neutral-500">No brands match “{query}”.</td></tr>
          )}
          {comparisonData.map((row, idx) => (
            <tr key={idx} className="border-b border-neutral-800/60 hover:bg-white/[0.02] transition-colors">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-white border border-neutral-200 text-neutral-900 font-display flex items-center justify-center overflow-hidden">
                    <img 
                      src={`/logos/${
                        row.brand === 'H&M' ? 'hnm' : 
                        row.brand === 'The North Face' ? 'northface' : 
                        row.brand.toLowerCase().replace(/[^a-z0-9]/g, '')
                      }.png`} 
                      alt={row.brand} 
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = row.brand.charAt(0);
                        e.currentTarget.parentElement!.className = "h-12 w-12 shrink-0 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 font-display flex items-center justify-center overflow-hidden";
                      }}
                    />
                  </div>
                  <span className="font-bold text-white">{row.brand}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-center">
                <span className="text-2xl font-black text-accent">{row.match.recommendedSize}</span>
                <span className="block text-[10px] text-neutral-500 mt-0.5">{row.match.confidence}% match</span>
              </td>
              <td className="px-5 py-4 text-right text-neutral-300 tabular-nums">{fmtRange(row.match.chest_cm, unit)}</td>
              <td className="px-5 py-4 text-right text-neutral-300 tabular-nums">{fmtRange(row.match.waist_cm, unit)}</td>
              <td className="px-5 py-4 text-right text-neutral-300 tabular-nums">{fmtRange(row.match.hip_cm, unit)}</td>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-neutral-800">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <LayoutGrid className="h-7 w-7 text-white" />
              <span>Side-by-Side Sizing Matrix</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-2">
              Recommended size and measurement ranges across every brand at once.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brands"
                className="w-40 sm:w-48 pl-9 pr-3 py-2 rounded-xl bg-black border border-neutral-800 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50"
              />
            </div>
            <FitPrefToggle />
            <UnitToggle />
          </div>
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
