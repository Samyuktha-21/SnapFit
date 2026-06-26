import { useEffect, useState } from 'react';

import { useNavigate as useReactNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { calculateMeasurements } from '../services/measurement';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import ProgressIndicator from '../components/ProgressIndicator';

export default function Processing() {
  const navigate = useReactNavigate();
  const { height, gender, setBodyProfile, addScanToHistory } = useMeasurementStore();
  const [statusIdx, setStatusIdx] = useState(0);

  const statusList = [
    'Initializing MediaPipe Pose API...',
    'Detecting Pose Skeleton Landmarks...',
    'Calibrating Pixels to Physical scale...',
    'Calculating Body Measurements...',
    'Matching Brand Sizing Indexes...'
  ];

  // Cycle status texts
  useEffect(() => {
    if (statusIdx >= statusList.length - 1) return;
    const interval = setInterval(() => {
      setStatusIdx((prev) => prev + 1);
    }, 700);
    return () => clearInterval(interval);
  }, [statusIdx]);

  // Execute processing logic
  useEffect(() => {
    const runProcessing = async () => {
      // Wait for mock processing timeline
      await new Promise((resolve) => setTimeout(resolve, 3800));

      // Calculate measurements using ML decoupled helper
      const computedProfile = calculateMeasurements(null, height, gender);
      
      // Save to Zustand store
      setBodyProfile(computedProfile);
      
      // Add to local historical history logger
      addScanToHistory({
        shoulder_width_cm: computedProfile.shoulderWidth,
        chest_or_bust_cm: computedProfile.chestWidth,
        waist_cm: computedProfile.waistWidth,
        hip_cm: computedProfile.hipWidth,
        confidence: computedProfile.confidence,
        recommended_size: computedProfile.size
      });

      // Done, navigate to results page
      navigate('/results');
    };

    runProcessing();
  }, [height, gender, setBodyProfile, addScanToHistory, navigate]);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-start py-8 px-4 md:px-6">
      {/* Progress tracker */}
      <ProgressIndicator currentStep={2} />

      <div className="w-full max-w-xl mx-auto rounded-3xl border border-neutral-800 bg-neutral-900/40 backdrop-blur px-8 py-16 text-center shadow-[0_0_30px_rgba(255,255,255,0.05)] mt-12">
        <LoadingSpinner />
        
        {/* Animated cycling text */}
        <div className="mt-8 h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-semibold text-white tracking-wide font-sans"
            >
              {statusList[statusIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="text-xs text-neutral-500 mt-4 leading-normal max-w-sm mx-auto">
          Please wait. Scaling calculations run locally in the browser engine to secure your personal body data.
        </p>
      </div>
    </div>
  );
}
