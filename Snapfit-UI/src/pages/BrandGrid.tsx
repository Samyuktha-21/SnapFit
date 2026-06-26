import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import type { BrandData } from '../types/brands';
import { AlertCircle, ShoppingBag } from 'lucide-react';
import FitToggle from '../components/FitToggle';
import BrandCard from '../components/BrandCard';
import MeasurementsTable from '../components/MeasurementsTable';

export default function BrandGrid() {
  const navigate = useNavigate();
  const { bodyProfile, gender } = useMeasurementStore();

  const [activeFit, setActiveFit] = useState<'Regular' | 'Oversized'>('Regular');
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);

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
  if (!bodyProfile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-neutral-600 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Webcam Scan Required</h3>
        <p className="text-xs text-neutral-500 max-w-sm mb-6">
          We need your chest/bust measurements to compute brand sizing. Please capture a quick scan first.
        </p>
        <button
          onClick={() => navigate('/scanfit')}
          className="rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm px-6 py-3 transition-colors cursor-pointer"
        >
          Measure Now
        </button>
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

          <div className="flex items-center gap-3">
            <FitToggle value={activeFit} onChange={setActiveFit} />
          </div>
        </div>

        {/* Tabular measurements summary */}
        <MeasurementsTable profile={bodyProfile} gender={gender} />
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
            {brands.map((brand, idx) => (
              <div 
                key={brand.id || `${brand.brand}_${idx}`}
                className="snap-start shrink-0 w-[85vw] sm:w-[400px] md:w-[420px] h-[400px]"
              >
                <BrandCard
                  brand={brand}
                  gender={gender}
                  bodyProfile={bodyProfile}
                  activeFit={activeFit}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
