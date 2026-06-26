import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { Shirt, Ruler, RotateCcw, ArrowRight, Activity } from 'lucide-react';
import ProgressIndicator from '../components/ProgressIndicator';
import SizeRecommendationCard from '../components/SizeRecommendationCard';
import MeasurementCard from '../components/MeasurementCard';

export default function Results() {
  const navigate = useNavigate();
  const { bodyProfile, gender, user } = useMeasurementStore();

  // If no profile exists yet, redirect to height input
  if (!bodyProfile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <Ruler className="h-12 w-12 text-slate-650 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">No Profile Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          You need to complete a quick body scan capture before viewing sizing results.
        </p>
        <button
          onClick={() => navigate('/height-input')}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 transition-colors cursor-pointer"
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

      <div className="w-full max-w-4xl space-y-8 mt-8">
        
        {/* Recommendation Card */}
        <SizeRecommendationCard
          gender={gender}
          size={bodyProfile.size}
          confidence={bodyProfile.confidence}
        />

        {/* 2x2 Grid of Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MeasurementCard
            label="Shoulder Width"
            value={bodyProfile.shoulderWidth}
            unit="cm"
            icon={<Ruler className="h-5 w-5" />}
            colorClass="from-indigo-500 to-indigo-600"
            shadowClass="shadow-indigo-500/5"
            gaugePercentage={Math.round(bodyProfile.shoulderWidth * 1.8)}
          />

          <MeasurementCard
            label={isMen ? 'Chest Width' : 'Bust Width'}
            value={bodyProfile.chestWidth}
            unit="cm"
            icon={<Shirt className="h-5 w-5" />}
            colorClass="from-purple-500 to-purple-600"
            shadowClass="shadow-purple-500/5"
            gaugePercentage={Math.round(bodyProfile.chestWidth * 0.8)}
          />

          <MeasurementCard
            label="Waist Width"
            value={bodyProfile.waistWidth}
            unit="cm"
            icon={<Activity className="h-5 w-5" />}
            colorClass="from-pink-500 to-pink-600"
            shadowClass="shadow-pink-500/5"
            gaugePercentage={Math.round(bodyProfile.waistWidth * 0.9)}
          />

          <MeasurementCard
            label="Hip Width"
            value={bodyProfile.hipWidth}
            unit="cm"
            icon={<Activity className="h-5 w-5" />}
            colorClass="from-cyan-500 to-cyan-600"
            shadowClass="shadow-cyan-500/5"
            gaugePercentage={Math.round(bodyProfile.hipWidth * 0.85)}
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => navigate('/height-input')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-white font-bold text-sm px-6 py-4 transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Capture Again</span>
          </button>

          <button
            onClick={() => navigate('/brands')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-bold text-sm px-8 py-4 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <span>Match Brand Recommendations</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
