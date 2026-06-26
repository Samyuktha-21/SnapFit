import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { motion, AnimatePresence } from 'framer-motion';
import CameraView from '../components/CameraView';
import CaptureButton from '../components/CaptureButton';
import TipsCard from '../components/TipsCard';
import ProgressIndicator from '../components/ProgressIndicator';

export default function Capture() {
  const navigate = useNavigate();
  const { gender } = useMeasurementStore();
  const {
    stream,
    active,
    error,
    isSimulated,
    startCamera,
    stopCamera,
    capturePhoto
  } = useCamera();

  const [isAligned, setIsAligned] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [triggerFlash, setTriggerFlash] = useState(false);

  // Initialize camera stream on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCaptureTrigger = () => {
    if (countdown !== null) return;
    
    // Start 3-second countdown
    setCountdown(3);
  };

  // Handle countdown ticks
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      // Trigger flash & take picture
      setTriggerFlash(true);
      setCountdown(null);
      
      const captureAndNavigate = async () => {
        try {
          await capturePhoto();
          // Short delay to let flash animation finish
          setTimeout(() => {
            navigate('/processing');
          }, 400);
        } catch (err) {
          console.error("Capture failed:", err);
          navigate('/processing'); // fallback anyway
        }
      };

      captureAndNavigate();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, capturePhoto, navigate]);

  // Turn off flash after animation
  useEffect(() => {
    if (triggerFlash) {
      const timer = setTimeout(() => setTriggerFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [triggerFlash]);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-start py-8 px-4 md:px-6 relative">
      
      {/* 1. Camera screen flash overlay */}
      <AnimatePresence>
        {triggerFlash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Step Stepper */}
      <ProgressIndicator currentStep={1} />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 items-start">
        
        {/* Left Grid: Camera Viewport */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <CameraView
            stream={stream}
            active={active}
            isSimulated={isSimulated}
            error={error}
            gender={gender}
            isAligned={isAligned}
            onAlignedChange={setIsAligned}
            onRetry={startCamera}
          />
          
          {/* Action trigger button */}
          <div className="flex justify-center py-4 bg-black rounded-3xl border border-neutral-800 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <CaptureButton
              onClick={handleCaptureTrigger}
              countdown={countdown}
              disabled={!active || countdown !== null}
              isAligned={isAligned}
            />
          </div>
        </div>

        {/* Right Grid: Guide instructions card */}
        <div className="flex flex-col gap-6">
          <TipsCard />
        </div>

      </div>
    </div>
  );
}
