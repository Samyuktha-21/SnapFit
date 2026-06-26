import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { Shirt, Ruler, RotateCcw, ArrowRight, Activity } from 'lucide-react';
import ProgressIndicator from '../components/ProgressIndicator';
import SizeRecommendationCard from '../components/SizeRecommendationCard';
import MeasurementCard from '../components/MeasurementCard';

export default function Results() {
  const navigate = useNavigate();
  const { bodyProfile, gender } = useMeasurementStore();

  // If no profile exists yet, redirect to height input
  if (!bodyProfile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <Ruler className="h-12 w-12 text-neutral-600 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">No Profile Found</h3>
        <p className="text-xs text-neutral-500 max-w-sm mb-6">
          You need to complete a quick body scan capture before viewing sizing results.
        </p>
        <button
          onClick={() => navigate('/height-input')}
          className="rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm px-6 py-3 transition-colors cursor-pointer"
        >
          Start Scan
        </button>
      </div>
    );
  }

  const isMen = gender === 'Men';

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-start py-8 px-4 md:px-6">
      {/* Progress tracker */}
      <ProgressIndicator currentStep={3} />

      <div className="w-full max-w-5xl mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
        
        {/* Recommendation Card */}
        <div className="md:col-span-2 md:row-span-2">
          <SizeRecommendationCard
            gender={gender}
            size={bodyProfile.size}
            confidence={bodyProfile.confidence}
            className="h-full"
          />
        </div>

        {/* Metric Tiles */}
        <MeasurementCard
          label="Shoulder Width"
          value={bodyProfile.shoulderWidth}
          unit="cm"
          icon={<Ruler className="h-5 w-5" />}
          colorClass="from-white to-neutral-300 text-black"
          shadowClass="shadow-white/5"
          gaugePercentage={Math.round(bodyProfile.shoulderWidth * 1.8)}
          className="h-full"
        />

        <MeasurementCard
          label={isMen ? 'Chest Width' : 'Bust Width'}
          value={bodyProfile.chestWidth}
          unit="cm"
          icon={<Shirt className="h-5 w-5" />}
          colorClass="from-neutral-200 to-neutral-400 text-black"
          shadowClass="shadow-white/5"
          gaugePercentage={Math.round(bodyProfile.chestWidth * 0.8)}
          className="h-full"
        />

        <MeasurementCard
          label="Waist Width"
          value={bodyProfile.waistWidth}
          unit="cm"
          icon={<Activity className="h-5 w-5" />}
          colorClass="from-neutral-700 to-neutral-900 text-white border border-neutral-700"
          shadowClass="shadow-white/5"
          gaugePercentage={Math.round(bodyProfile.waistWidth * 0.9)}
          className="h-full"
        />

        <MeasurementCard
          label="Hip Width"
          value={bodyProfile.hipWidth}
          unit="cm"
          icon={<Activity className="h-5 w-5" />}
          colorClass="from-neutral-800 to-black text-white border border-neutral-800"
          shadowClass="shadow-white/5"
          gaugePercentage={Math.round(bodyProfile.hipWidth * 0.85)}
          className="h-full"
        />

        {/* Action Buttons */}
        <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <button
            onClick={() => navigate('/height-input')}
            className="w-full flex items-center justify-center gap-2 rounded-3xl border border-neutral-800 bg-black/70 backdrop-blur-sm hover:bg-neutral-900 text-neutral-300 hover:text-white font-bold text-sm px-6 py-5 shadow-xl hover:border-neutral-700 transition-all cursor-pointer group"
          >
            <RotateCcw className="h-4 w-4 group-hover:-rotate-45 transition-transform duration-300" />
            <span>Capture Again</span>
          </button>

          <button
            onClick={() => navigate('/brands')}
            className="w-full flex items-center justify-center gap-2 rounded-3xl bg-white hover:bg-neutral-200 text-black font-extrabold text-sm px-6 py-5 shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <span>Match Brand Recommendations</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
