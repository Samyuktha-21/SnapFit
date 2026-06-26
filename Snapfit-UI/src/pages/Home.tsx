import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { ArrowRight, Sparkles, Shield, RefreshCw, Zap, Ruler } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useMeasurementStore();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/height-input');
    } else {
      navigate('/auth');
    }
  };

  const steps = [
    {
      idx: '01',
      title: 'Enter Height',
      desc: 'Provide your standing height (140-220cm) to calibrate keypoints.'
    },
    {
      idx: '02',
      title: 'Stand in Camera',
      desc: 'Position your body within the glowing virtual silhouette overlay.'
    },
    {
      idx: '03',
      title: 'Auto Capture',
      desc: 'A quick 3-second countdown automatically logs skeletal coordinates.'
    },
    {
      idx: '04',
      title: 'Check Fit Recommendations',
      desc: 'Instantly matches measurements against size charts across top brands.'
    }
  ];

  const features = [
    {
      icon: <Zap className="h-5 w-5 text-indigo-400" />,
      title: 'Decoupled Sizing Translation',
      desc: 'Separates front-facing user profiles from brand-specific fit algorithms.'
    },
    {
      icon: <Ruler className="h-5 w-5 text-purple-400" />,
      title: 'Double Fit Paths',
      desc: 'Separate data streams for Men (chest) vs Women (bust/waist) charts.'
    },
    {
      icon: <RefreshCw className="h-5 w-5 text-pink-400" />,
      title: 'Live Custom Brands',
      desc: 'Let brands upload CSV or raw JSON sizing charts live during demo.'
    }
  ];

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center py-16 px-6">
      {/* Background glowing meshes */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[450px] w-[450px] md:h-[650px] md:w-[650px] rounded-full bg-gradient-to-tr from-indigo-650/15 via-purple-650/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* 1. HERO SECTION */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/40 px-4 py-1.5 text-xs font-semibold text-indigo-300 mb-6 shadow-md shadow-indigo-500/5"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400/20" />
          <span>Universal Clothing Translation Layer</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none"
        >
          Measure once.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
            Fit everywhere.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base md:text-lg text-slate-400 mt-6 leading-relaxed max-w-2xl mx-auto"
        >
          Clothing sizes aren’t standardized. SnapFit translates a single webcam scan into size recommendations across different brands, fit styles, and gender profiles.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap justify-center items-center gap-4"
        >
          <button
            onClick={handleStart}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-bold text-base px-8 py-4.5 shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all duration-200 cursor-pointer"
          >
            <span>Start Sizing Scan</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => navigate('/upload-brand')}
            className="flex items-center gap-2 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold text-base px-8 py-4.5 transition-all cursor-pointer"
          >
            <span>For Clothing Brands</span>
          </button>
        </motion.div>
      </div>

      {/* 2. STEP WORKFLOW VISUALS */}
      <div className="w-full max-w-6xl mx-auto mt-16 mb-24">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 text-center mb-10">
          How it Works
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative rounded-3xl border border-slate-900 bg-slate-950 p-6 shadow-lg hover:border-slate-800 transition-colors"
            >
              <span className="absolute top-4 right-6 text-4xl font-black font-mono text-indigo-500/10 tracking-tighter">
                {step.idx}
              </span>
              <h4 className="text-base font-bold text-white mb-2 tracking-tight">{step.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 3. CORE HACKATHON CORE FEATURES */}
      <div className="w-full max-w-5xl mx-auto border-t border-slate-900/60 pt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex-shrink-0 rounded-2xl bg-slate-900 border border-slate-800/60 p-3 h-11 w-11 flex items-center justify-center">
                {feat.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200 tracking-tight">{feat.title}</h4>
                <p className="text-xs text-slate-550 mt-1.5 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
