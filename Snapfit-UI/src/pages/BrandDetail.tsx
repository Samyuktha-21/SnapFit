import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import { matchBrandSize } from '../services/sizeMatching';
import type { BrandData } from '../types/brands';
import { ArrowLeft, Sparkles, Activity, AlertCircle } from 'lucide-react';
import ExplainerBar from '../components/ExplainerBar';

export default function BrandDetail() {
  const { brandName } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { bodyProfile, gender } = useMeasurementStore();
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);

  const activeFit = (searchParams.get('fit') as 'Regular' | 'Oversized') || 'Regular';

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const list = await firestore.getBrands();
        const found = list.find(b => b.brand.toLowerCase() === brandName?.toLowerCase() && b.gender === gender);
        setBrand(found || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBrand();
  }, [brandName, gender]);

  // Handle scans check
  if (!bodyProfile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Webcam Scan Required</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Please capture measurements before viewing detail charts.
        </p>
        <button onClick={() => navigate('/height-input')} className="rounded-xl bg-white text-black hover:bg-neutral-200 px-6 py-3 cursor-pointer">
          Scan Now
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Brand not found</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          The requested size configuration chart for {brandName} was not resolved.
        </p>
        <Link to="/brands" className="text-xs font-bold text-white underline">
          Return to Grid
        </Link>
      </div>
    );
  }

  // Calculate size match
  const matchResult = matchBrandSize(brand, bodyProfile, gender, activeFit);
  
  // Format sizes for the ExplainerBar component
  const sizeChart = brand.fits[activeFit] || {};
  const sizeBlocks = Object.keys(sizeChart).map((size) => {
    const limits = gender === 'Men' ? sizeChart[size].chest_cm : sizeChart[size].bust_cm;
    return {
      size,
      min: limits ? limits[0] : 0,
      max: limits ? limits[1] : 0
    };
  });

  const isMen = gender === 'Men';

  return (
    <div className="min-h-[85vh] py-8 px-4 md:px-6 relative">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Back navigation */}
        <Link
          to="/brands"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-350 text-xs font-bold uppercase transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Brand Recommendations</span>
        </Link>

        {/* 1. BRAND DETAILS CARD */}
        <div className="rounded-3xl border border-slate-900 bg-slate-950 p-6 md:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            {brand.logoUrl ? (
              <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-center">
                <img src={brand.logoUrl} alt={brand.brand} className="max-h-full max-w-full object-contain filter invert opacity-80" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-neutral-900 border border-neutral-700 text-neutral-300 font-black flex items-center justify-center text-xl">
                {brand.brand.charAt(0)}
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                <span>{gender}'s sizing</span>
                <span>•</span>
                <span>{activeFit} Fit</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">{brand.brand}</h2>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Recommended Size</span>
              <span className="text-4xl font-black text-white font-sans tracking-tight">{matchResult.recommendedSize}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Match Rating</span>
              <span className="text-base font-bold flex items-center gap-1 mt-1 text-white">
                {matchResult.confidence}%
              </span>
            </div>
          </div>
        </div>

        {/* 2. VISUAL GRAPH: SIZE BAR RULER */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 md:p-8 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-white/10 border border-white/20 p-2 text-white">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Sizing Distribution Curve</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Visualize where your measurement lands within size intervals.</p>
            </div>
          </div>

          {/* Sizing Explainer Bar needle visual */}
          <ExplainerBar
            sizes={sizeBlocks}
            userValue={bodyProfile.chestWidth}
            recommendedSize={matchResult.recommendedSize}
            gender={gender}
          />
        </div>

        {/* 3. EXPLAINER TEXT CARD */}
        <div className="rounded-3xl border border-slate-900 bg-slate-950 p-6 md:p-8 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-white fill-white/10" />
            <span>Fit Translation Explanation</span>
          </h3>
          
          <p className="text-sm text-slate-350 leading-relaxed font-medium">
            {matchResult.explanation}
          </p>

          {matchResult.isBorderline && (
            <div className="flex items-start gap-3 rounded-2xl bg-neutral-900/50 border border-neutral-700 p-4 mt-4">
              <AlertCircle className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Boundary Alert</h4>
                <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                  {matchResult.borderlineMessage}
                </p>
              </div>
            </div>
          )}

          {/* Size Chart specifics */}
          <div className="mt-8 pt-6 border-t border-slate-900">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Raw Size Chart Ranges</h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.keys(sizeChart).map((size) => {
                const limits = isMen ? sizeChart[size].chest_cm : sizeChart[size].bust_cm;
                if (!limits) return null;
                const isSelected = size === matchResult.recommendedSize;
                
                return (
                  <div 
                    key={size} 
                    className={`rounded-2xl border p-4 text-center ${
                      isSelected 
                        ? 'border-white bg-white/10' 
                        : 'border-slate-900 bg-slate-950'
                    }`}
                  >
                    <span className="text-xs font-black text-white">{size}</span>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {limits[0]}-{limits[1]} cm
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5 font-sans">
                      Length: {sizeChart[size].length_cm}cm
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
