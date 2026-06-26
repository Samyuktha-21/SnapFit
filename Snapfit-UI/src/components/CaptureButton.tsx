import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';

interface CaptureButtonProps {
  onClick: () => void;
  countdown: number | null;
  disabled: boolean;
  isAligned: boolean;
}

export default function CaptureButton({
  onClick,
  countdown,
  disabled,
  isAligned
}: CaptureButtonProps) {
  const isCountingDown = countdown !== null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Countdown Spinner Background Ring */}
        {isCountingDown && (
          <svg className="absolute -inset-4 h-[104px] w-[104px] -rotate-90">
            <circle
              cx="52"
              cy="52"
              r="46"
              stroke="rgba(99, 102, 241, 0.2)"
              strokeWidth="4"
              fill="transparent"
            />
            <motion.circle
              cx="52"
              cy="52"
              r="46"
              stroke="#6366f1"
              strokeWidth="4"
              fill="transparent"
              initial={{ pathLength: 1 }}
              animate={{ pathLength: 0 }}
              transition={{ duration: 3, ease: "linear" }}
            />
          </svg>
        )}

        <button
          onClick={onClick}
          disabled={disabled}
          className={`relative z-10 flex h-18 w-18 items-center justify-center rounded-full shadow-2xl transition-all duration-300 cursor-pointer ${
            isCountingDown
              ? 'bg-indigo-900 border-4 border-indigo-700 text-indigo-200'
              : !isAligned
                ? 'bg-slate-800 border-4 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:scale-105 active:scale-95 text-white'
          }`}
        >
          <AnimatePresence mode="wait">
            {isCountingDown ? (
              <motion.span
                key={countdown}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-black font-mono text-white"
              >
                {countdown}
              </motion.span>
            ) : (
              <motion.div
                key="camera-icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Camera className="h-7 w-7" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-2">
        {isCountingDown 
          ? 'Scanning in progress...' 
          : !isAligned 
            ? 'Align body to scan' 
            : 'Capture Scan'}
      </span>
    </div>
  );
}
