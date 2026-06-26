import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { motion } from 'framer-motion';
import { ArrowRight, Ruler, Sparkles, User } from 'lucide-react';
import ProgressIndicator from '../components/ProgressIndicator';

export default function HeightInput() {
  const { height, setHeight, gender } = useMeasurementStore();
  const [localHeight, setLocalHeight] = useState(height || 175);
  const navigate = useNavigate();

  const handleContinue = () => {
    // Validate bounds
    if (localHeight >= 140 && localHeight <= 220) {
      setHeight(localHeight);
      navigate('/capture');
    }
  };

  // Silhouette height scaling multiplier (mapped between 140cm and 220cm)
  const scaleMultiplier = 0.7 + ((localHeight - 140) / (220 - 140)) * 0.4;

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-start py-8 px-4 md:px-6">
      {/* Step Tracker */}
      <ProgressIndicator currentStep={0} />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
        
        {/* 1. VISUAL CORRELATION PREVIEW */}
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-900 bg-slate-950/80 p-8 h-[360px] md:h-[450px] relative overflow-hidden shadow-2xl">
          <div className="absolute top-[10%] left-[20%] h-32 w-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
          
          {/* Vertical Ruler Lines */}
          <div className="absolute left-6 top-6 bottom-6 w-3 border-r border-slate-800/80 flex flex-col justify-between text-[10px] text-slate-600 font-mono">
            <span>220cm</span>
            <span>200cm</span>
            <span>180cm</span>
            <span>160cm</span>
            <span>140cm</span>
          </div>

          {/* Stylized Avatar Scaling */}
          <motion.div
            style={{ scaleY: scaleMultiplier, originY: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="flex flex-col items-center justify-end h-[70%] mb-4 w-full"
          >
            <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-2 shadow">
              <User className="h-8 w-8" />
            </div>
            
            {/* Standing rectangular vector block */}
            <div className="w-20 h-44 rounded-2xl bg-gradient-to-t from-indigo-600 via-purple-600 to-pink-500 shadow-lg opacity-85" />
          </motion.div>

          <span className="text-sm font-bold text-white z-10 flex items-center gap-1">
            <Ruler className="h-4 w-4 text-indigo-400" />
            <span>Target Scale: {localHeight}cm</span>
          </span>
        </div>

        {/* 2. SLIDER CONTROL INTERFACE */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-xl flex flex-col justify-between h-[360px] md:h-[450px]">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-950 border border-indigo-850 px-3 py-1 text-xs font-semibold text-indigo-300 mb-4">
              <Sparkles className="h-3 w-3 text-indigo-400 fill-indigo-400/20" />
              <span>Step 1: Calibration</span>
            </div>
            
            <h2 className="text-2xl font-black text-white tracking-tight">How tall are you?</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We scale the MediaPipe pixel distances against your physical height to compute chest, shoulder, waist, and hip widths without requiring camera distance calibration.
            </p>

            {/* Large Height Display */}
            <div className="flex items-baseline justify-center gap-1 my-10 text-center">
              <span className="text-5xl font-black text-white tracking-tighter font-sans">
                {localHeight}
              </span>
              <span className="text-xl font-bold text-slate-500">cm</span>
            </div>

            {/* Slider */}
            <div className="relative px-2">
              <input
                type="range"
                min="140"
                max="220"
                value={localHeight}
                onChange={(e) => setLocalHeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-2 font-mono">
                <span>Min: 140cm</span>
                <span>Max: 220cm</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm py-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <span>Proceed to Camera Scan</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
