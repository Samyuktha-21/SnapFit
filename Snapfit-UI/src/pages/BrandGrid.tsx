import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import type { BrandData } from '../types/brands';
import { Sparkles, Shirt, AlertCircle, ShoppingBag, ShieldCheck } from 'lucide-react';
import FitToggle from '../components/FitToggle';
import BrandCard from '../components/BrandCard';
import UpgradeModal from '../components/UpgradeModal';

export default function BrandGrid() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bodyProfile, gender, user, setPremium } = useMeasurementStore();

  const [activeFit, setActiveFit] = useState<'Regular' | 'Oversized'>('Regular');
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Parse location state/params
  useEffect(() => {
    // Check if redirecting from mock Stripe Checkout with success state
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      setPremium(true);
      setPaymentSuccess(true);
      
      // Clean query params
      navigate('/brands', { replace: true });
    }
    
    // Check state triggers (e.g. redirected to open upgrade modal directly)
    if (location.state && (location.state as any).openUpgrade) {
      setIsUpgradeOpen(true);
      // clear state
      window.history.replaceState({}, document.title);
    }
  }, [location, setPremium, navigate]);

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

  const isPremiumUser = user?.is_premium || false;

  // Render scan missing warning
  if (!bodyProfile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-slate-650 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Webcam Scan Required</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          We need your chest/bust measurements to compute brand sizing. Please capture a quick scan first.
        </p>
        <button
          onClick={() => navigate('/height-input')}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 transition-colors cursor-pointer"
        >
          Measure Now
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] py-8 px-4 md:px-6 relative">
      {/* Premium Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />

      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Payment Success Banner */}
        {paymentSuccess && (
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 p-4 shadow-xl">
            <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">Payment Completed successfully!</h4>
              <p className="text-xs text-emerald-350 mt-1">
                Welcome to <span className="font-bold">SnapFit Premium</span>. All sizing filters, custom brand uploads, and comparison matrix dashboards are now fully unlocked!
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Header & Fit Toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-900">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-indigo-400" />
              <span>Recommended Sizes</span>
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Projecting your profile metrics ({gender.toLowerCase()} layout) across active clothing brands.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <FitToggle value={activeFit} onChange={setActiveFit} />
          </div>
        </div>

        {/* Brand Recommendations Grid */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/25 border-t-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand, idx) => (
              <BrandCard
                key={brand.id || `${brand.brand}_${idx}`}
                brand={brand}
                gender={gender}
                bodyProfile={bodyProfile}
                isPremium={isPremiumUser}
                activeFit={activeFit}
                onUpgradeClick={() => setIsUpgradeOpen(true)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
