import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import GridMotion from '../components/GridMotion';
import Logo from '../components/Logo';

import { TextLoop } from '../components/core/text-loop';

export default function Home() {
  const navigate = useNavigate();
  const handleStart = () => {
    navigate('/scanfit');
  };

  // Create an array of 28 items repeating the 12 shirt images
  const shirtImages = Array.from({ length: 28 }, (_, i) => `/shirts/${(i % 12) + 1}.jpg`);

  return (
    <div className="relative z-0 min-h-[80vh] flex flex-col items-center justify-center py-16 px-6">
      {/* Background Grid Motion */}
      <div className="fixed inset-0 pointer-events-none opacity-80">
        <GridMotion items={shirtImages} gradientColor="#000000" />
      </div>

      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 z-50">
        <div className="rounded-lg bg-accent p-1.5 text-black shadow-sm">
          <Logo className="h-5 w-5" />
        </div>
        <span className="font-display text-2xl tracking-tight text-white">SnapFit</span>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* 1. HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto p-10 sm:p-14 rounded-[2rem] bg-black/85 backdrop-blur-xl border border-white/20 shadow-[0_0_80px_-20px_rgba(255,255,255,0.1)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative z-10">
            {/* Subtitle removed per request */}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 min-h-[80px] tracking-tight leading-tight drop-shadow-sm mb-6 w-full">
              <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-100 whitespace-nowrap text-right">
                Find your perfect fit.
              </span>
              <TextLoop
                className="overflow-y-clip w-full sm:w-[280px] md:w-[340px] text-center sm:text-left text-2xl sm:text-3xl md:text-4xl font-extrabold"
                transition={{
                  type: 'spring',
                  stiffness: 900,
                  damping: 80,
                  mass: 10,
                }}
                variants={{
                  initial: { y: 20, rotateX: 90, opacity: 0, filter: 'blur(4px)' },
                  animate: { y: 0, rotateX: 0, opacity: 1, filter: 'blur(0px)' },
                  exit: { y: -20, rotateX: -90, opacity: 0, filter: 'blur(4px)' },
                }}
              >
                <span className="text-white block pb-1 whitespace-nowrap">Skip the guesswork.</span>
                <span className="text-white block pb-1 whitespace-nowrap">Shop smarter.</span>
              </TextLoop>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-slate-300 font-light mt-4 leading-relaxed max-w-xl mx-auto"
            >
              Clothing sizes aren’t standardized. SnapFit translates a single webcam scan into size recommendations across different brands, fit styles, and gender profiles.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex justify-center items-center"
            >
              <button
                onClick={handleStart}
                className="flex items-center gap-2 rounded-2xl bg-accent hover:brightness-95 text-black font-extrabold text-sm md:text-base px-8 py-4 shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <span>Start Sizing Scan</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
