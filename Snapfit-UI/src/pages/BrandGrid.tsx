import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import type { BrandData } from '../types/brands';
import { AlertCircle, ShoppingBag, Search } from 'lucide-react';
import FitPrefToggle from '../components/FitPrefToggle';
import UnitToggle from '../components/UnitToggle';
import BrandCard from '../components/BrandCard';
import MeasurementsTable from '../components/MeasurementsTable';
import ManualEntryForm from '../components/ManualEntryForm';

export default function BrandGrid() {
  const navigate = useNavigate();
  const { bodyProfile, gender, fitPref } = useMeasurementStore();

  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const visibleBrands = brands.filter((b) =>
    b.brand.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const [isEditingManual, setIsEditingManual] = useState(false);

  // Load all brands from Firestore/LocalStorage Database
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const list = await firestore.getBrands();
        // filter brands matching the current user gender path
        const filtered = list.filter(b => b.gender === gender);
        setBrands(filtered);
      } catch (err) {
        console.error("Failed to load brands database", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, [gender]);

  // Render scan missing warning
  if (!bodyProfile && !isEditingManual) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-neutral-600 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Webcam Scan Required</h3>
        <p className="text-xs text-neutral-500 max-w-sm mb-6">
          We need your chest/bust measurements to compute brand sizing. Please capture a quick scan first.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/scanfit')}
            className="rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm px-6 py-3 transition-colors cursor-pointer"
          >
            Measure Now
          </button>
          <button
            onClick={() => setIsEditingManual(true)}
            className="rounded-xl border border-neutral-700 hover:bg-neutral-800 text-white font-bold text-sm px-6 py-3 transition-colors cursor-pointer"
          >
            Enter Manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] py-8 relative">
      <div className="mx-auto max-w-6xl space-y-8 px-4 md:px-6">
        
        {/* Dashboard Header & Fit Toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-neutral-800">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-white" />
              <span>Recommended Sizes</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-2">
              Projecting your profile metrics ({gender.toLowerCase()} layout) across active clothing brands.
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
        {isEditingManual ? (
          <ManualEntryForm 
            onCancel={() => setIsEditingManual(false)} 
            onSave={() => setIsEditingManual(false)} 
          />
        ) : (
          <div className="relative group">
            <MeasurementsTable profile={bodyProfile!} gender={gender} />
            <button 
              onClick={() => setIsEditingManual(true)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Brand Recommendations Carousel */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      ) : (
        <div className="w-full mt-8 relative">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          
          <div 
            className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 px-6 md:pl-[calc((100vw-72rem)/2+1.5rem)] md:pr-6 pb-16 pt-4"
          >
            {visibleBrands.length === 0 ? (
              <p className="text-sm text-neutral-500 px-6 py-10">No brands match “{query}”.</p>
            ) : visibleBrands.map((brand, idx) => (
              <div
                key={brand.id || `${brand.brand}_${idx}`}
                className="snap-start shrink-0 w-[85vw] sm:w-[400px] md:w-[420px] flex"
              >
                <BrandCard
                  brand={brand}
                  gender={gender}
                  bodyProfile={bodyProfile!}
                  fitPref={fitPref}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
