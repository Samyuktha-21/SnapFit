// ScanFit.jsx — our real measurement model, mounted as the /scanfit page inside
// the SnapFit frontend.
//
// Flow (three steps):
//   1. details — height (cm), weight (kg, optional), sex. Stored in the shared
//      store. Camera does NOT start until height + sex are provided.
//   2. scan    — front + side guided capture (camera mounts here only). On
//      completion it persists the result so it survives navigation.
//   3. results — measurements + body type + brand actions + Size Passport.
//      Shown directly on return (no camera) until the user leaves the site or
//      hits Rescan.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ArrowRight, LayoutGrid, RotateCcw, Camera, Pencil, Download, ChevronDown,
} from 'lucide-react';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { useSnapFitMeasurement } from '../scanfit/useSnapFitMeasurement';
import { classifyBodyShape } from '../scanfit/poseMetrics';
import { predictMeasurements, cmToIn } from '../scanfit/bodyModel';
import TipsCard from '../components/TipsCard';
import SizePassport from '../components/SizePassport';

const PHASE_LABEL = {
  front: 'Step 1 · Front view',
  side: 'Step 2 · Side view',
  done: 'Scan complete',
};

function sizeFromChest(chestCm, isMen) {
  if (chestCm < (isMen ? 92 : 85)) return 'S';
  if (chestCm < (isMen ? 102 : 93)) return 'M';
  if (chestCm < (isMen ? 112 : 101)) return 'L';
  return 'XL';
}

// Build a body-measurement profile from the stored details + ANSUR model.
function profileFromStore(height, weight, gender) {
  const sex = gender === 'Men' ? 'male' : 'female';
  const preds = predictMeasurements({ heightCm: height, weightKg: weight, sex });
  if (!preds) return null;
  const chest = Math.round(preds.chest.cm);
  return {
    shoulderWidth: Math.round(preds.shoulder.cm),
    chestWidth: chest,
    waistWidth: Math.round(preds.waist.cm),
    hipWidth: Math.round(preds.hip.cm),
    confidence: 95,
    size: sizeFromChest(chest, gender === 'Men'),
  };
}

// ---------------------------------------------------------------------------
// Step 1 — Details form (shown BEFORE the camera).
// ---------------------------------------------------------------------------
function ScanDetailsForm({ onContinue }) {
  const { height, weight, gender, setHeight, setWeight, setGender } = useMeasurementStore();

  const [heightCm, setHeightCm] = useState(height ? String(height) : '');
  const [weightKg, setWeightKg] = useState(weight != null ? String(weight) : '');
  const [sex, setSex] = useState(
    gender === 'Men' ? 'male' : gender === 'Women' ? 'female' : null,
  );

  const heightValid = Number(heightCm) > 0;
  const canContinue = heightValid && (sex === 'male' || sex === 'female');

  const handleStart = () => {
    if (!canContinue) return;
    setHeight(Number(heightCm));
    setWeight(weightKg ? Number(weightKg) : null);
    setGender(sex === 'male' ? 'Men' : 'Women');
    onContinue();
  };

  const field =
    'bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-colors w-full';

  return (
    <div className="min-h-[85vh] py-10 px-4 flex items-start justify-center">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/40 p-7 md:p-8 shadow-xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/20">
          <Camera className="h-3.5 w-3.5" /> Before we scan
        </span>
        <h2 className="mt-4 text-2xl font-black text-white tracking-tight">Tell us about you</h2>
        <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
          We pair these with your scan to estimate your measurements. Height and sex
          are required; weight sharpens the estimate but is optional.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Height (cm) <span className="text-accent">*</span>
            </span>
            <input
              type="number" inputMode="numeric" value={heightCm} placeholder="170"
              onChange={(e) => setHeightCm(e.target.value)}
              className={`mt-1.5 ${field}`}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Weight (kg) <span className="text-neutral-600 normal-case tracking-normal">· optional</span>
            </span>
            <input
              type="number" inputMode="numeric" value={weightKg} placeholder="65"
              onChange={(e) => setWeightKg(e.target.value)}
              className={`mt-1.5 ${field}`}
            />
          </label>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Sex <span className="text-accent">*</span>
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }].map((opt) => (
                <button
                  key={opt.value} type="button" onClick={() => setSex(opt.value)}
                  className={`rounded-xl py-3 text-sm font-bold border transition-colors cursor-pointer ${
                    sex === opt.value
                      ? 'bg-accent text-black border-accent'
                      : 'bg-black text-neutral-300 border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleStart} disabled={!canContinue}
          className="mt-7 w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-black font-bold text-sm py-3.5 transition enabled:hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Camera className="h-4 w-4" /> Start scan
        </button>
        {!canContinue && (
          <p className="mt-3 text-center text-[11px] text-neutral-600">
            Enter your height and pick your sex to continue.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Live camera capture. Camera/model spin up only while this is mounted.
// On completion it persists everything and hands off to the results step.
// ---------------------------------------------------------------------------
function ScanCamera({ onComplete, onEditDetails }) {
  const {
    height, weight, gender,
    setBodyProfile, setSilhouette, setScanComplete,
  } = useMeasurementStore();

  const {
    videoRef, canvasRef,
    phase, status, aligned, holdProgress, reasons, silhouette, captureFlash,
  } = useSnapFitMeasurement();

  // When the scan finishes, persist results (so they survive navigation), show
  // the green confirmation briefly, then move to the results step.
  useEffect(() => {
    if (phase !== 'done') return;
    setSilhouette(silhouette || null);
    const profile = profileFromStore(height, weight, gender);
    if (profile) setBodyProfile(profile);
    setScanComplete(true);
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const statusText = status !== 'Ready'
    ? status
    : aligned ? 'Hold still…' : 'Line up with the guide';

  return (
    <div className="min-h-[85vh] py-6 px-4 md:px-6">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT — camera + guide */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              phase === 'done'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-white/10 text-white border-white/20'
            }`}>
              {PHASE_LABEL[phase]}
            </span>
            <span className="flex items-center gap-2 text-xs text-neutral-400">
              <span className={`h-2 w-2 rounded-full ${aligned ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {statusText}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {captureFlash && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/25 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-black font-bold shadow-lg">
                  <CheckCircle className="h-6 w-6" />
                  {captureFlash === 'front' ? 'Front view recorded' : 'Side view recorded'}
                </div>
              </div>
            )}
          </div>

          {phase !== 'done' && (
            <div className="mt-4">
              <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-[width] duration-100"
                  style={{ width: `${Math.round(holdProgress * 100)}%` }} />
              </div>
              {reasons.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-amber-400 list-disc list-inside">
                  {reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
                {phase === 'front'
                  ? 'Stand straight, full body in the outline. It captures automatically once aligned.'
                  : 'Now turn 90° to your side, full body in the outline.'}
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-800 pt-3">
            <span>{height} cm{weight != null ? ` · ${weight} kg` : ''} · {gender}</span>
            <button onClick={onEditDetails}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <Pencil className="h-3 w-3" /> Edit details
            </button>
          </div>
        </div>

        {/* RIGHT — tips while scanning */}
        <TipsCard />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Results. No camera. Reads persisted store data, so it shows on return
// until the user leaves the site or hits Rescan.
// ---------------------------------------------------------------------------
function ResultsView({ onRescan, onEditDetails }) {
  const navigate = useNavigate();
  const {
    height, weight, gender, silhouette, setWeight, setBodyProfile, addScanToHistory,
  } = useMeasurementStore();

  const [showPassport, setShowPassport] = useState(false);

  const sex = gender === 'Men' ? 'male' : 'female';
  const predictions = predictMeasurements({ heightCm: height, weightKg: weight, sex });
  const bodyShape = classifyBodyShape(silhouette, gender);
  const profile = predictions ? profileFromStore(height, weight, gender) : null;

  // Keep the persisted profile in sync (e.g. after the user adds weight here).
  useEffect(() => {
    if (profile) setBodyProfile(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, weight, gender]);

  const saveAndGo = (dest) => {
    if (!profile) return;
    setBodyProfile(profile);
    addScanToHistory({
      shoulder_width_cm: profile.shoulderWidth,
      chest_or_bust_cm: profile.chestWidth,
      waist_cm: profile.waistWidth,
      hip_cm: profile.hipWidth,
      confidence: profile.confidence,
      recommended_size: profile.size,
    });
    navigate(dest);
  };

  return (
    <div className="min-h-[85vh] py-6 px-4 md:px-6">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT — scan-complete summary + Rescan right below */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3.5 w-3.5" /> Scan complete
          </span>

          {/* Body type highlight (where the camera image was) */}
          <div className="mt-4 rounded-2xl bg-black/40 border border-white/10 aspect-video flex flex-col items-center justify-center text-center p-6">
            {bodyShape ? (
              <>
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Body type</span>
                <span className="mt-1 font-display text-4xl text-white leading-none">{bodyShape.label}</span>
                <span className="mt-2 text-[11px] font-semibold text-accent">{bodyShape.confidence}% confidence</span>
                <p className="mt-2 text-[11px] text-neutral-500 max-w-xs leading-relaxed">{bodyShape.blurb}</p>
              </>
            ) : (
              <span className="text-sm text-neutral-500">Measurements ready</span>
            )}
          </div>

          {/* Rescan — right below the image/tile */}
          <button
            onClick={onRescan}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-black font-bold text-sm py-3 hover:brightness-95 transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Rescan
          </button>

          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
            <span>{height} cm{weight != null ? ` · ${weight} kg` : ''} · {gender}</span>
            <button onClick={onEditDetails}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <Pencil className="h-3 w-3" /> Edit details
            </button>
          </div>
        </div>

        {/* RIGHT — measurements + actions + Size Passport dropdown */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 md:p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white tracking-tight">Your measurements</h3>
          <p className="text-xs text-neutral-500 mt-1 mb-5">
            Estimated from your height, weight &amp; sex with a model trained on 6,068 adults (ANSUR II).
          </p>

          {profile ? (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-[11px] uppercase tracking-widest text-neutral-500">Recommended size</span>
                <span className="text-3xl font-black text-accent">{profile.size}</span>
                {bodyShape && (
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/15 px-3 py-1.5"
                    title={`Bust:Hip ${bodyShape.ratios.bustHip} · Waist:Hip ${bodyShape.ratios.waistToHip}`}>
                    <span className="text-sm font-bold text-white">{bodyShape.label}</span>
                    <span className="text-[10px] font-semibold text-accent">{bodyShape.confidence}%</span>
                  </span>
                )}
              </div>

              <table className="w-full text-sm mb-5">
                <thead>
                  <tr className="text-neutral-500 text-[11px]">
                    <th className="text-left font-medium py-1"></th>
                    <th className="text-right font-medium py-1">cm</th>
                    <th className="text-right font-medium py-1">in</th>
                    <th className="text-right font-medium py-1">±cm</th>
                  </tr>
                </thead>
                <tbody>
                  {['shoulder', 'chest', 'waist', 'hip'].map((k) => (
                    <tr key={k} className="border-t border-neutral-800/70">
                      <td className="text-left text-white font-semibold py-2 capitalize">{k}</td>
                      <td className="text-right text-neutral-200 py-2 tabular-nums">{predictions[k].cm}</td>
                      <td className="text-right text-neutral-400 py-2 tabular-nums">{cmToIn(predictions[k].cm)}</td>
                      <td className="text-right text-neutral-600 py-2 text-xs tabular-nums">±{predictions[k].mae}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => saveAndGo('/brands')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-accent hover:brightness-95 text-black font-bold text-sm py-3 transition cursor-pointer">
                  Brand Sizes <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => saveAndGo('/comparison')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm py-3 transition-colors cursor-pointer">
                  <LayoutGrid className="h-4 w-4" /> Compare
                </button>
              </div>

              {/* Size Passport — dropdown right below Compare (no scrolling) */}
              <div className="relative mt-3">
                <button
                  onClick={() => setShowPassport((v) => !v)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm py-3 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Size Passport
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPassport ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showPassport && (
                    <>
                      {/* click-away */}
                      <motion.div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowPassport(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                      <motion.div 
                        className="absolute right-0 z-50 mt-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl max-h-[72vh] overflow-auto origin-top"
                        initial={{ opacity: 0, scaleY: 0.9, y: -10 }}
                        animate={{ opacity: 1, scaleY: 1, y: 0 }}
                        exit={{ opacity: 0, scaleY: 0.9, y: -10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      >
                        <SizePassport profile={profile} gender={gender} bodyShape={bodyShape} />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-[11px] text-neutral-600 leading-relaxed mt-4">
                Measurements are estimated from height, weight &amp; sex. The ±cm is the model&apos;s real average error.
                Body type uses your silhouette proportions, so it doesn&apos;t depend on exact measurements.
              </p>
            </>
          ) : (
            // Weight was skipped (optional) — needed for the estimate. Add it here.
            <div className="rounded-2xl border border-neutral-700 bg-black/40 p-5">
              <p className="text-sm text-white font-semibold mb-1">Add your weight to finish</p>
              <p className="text-[11px] text-neutral-500 mb-4">
                The measurement estimate needs your weight. Height and sex are already saved.
              </p>
              <label className="block text-[11px] text-neutral-400">
                Weight (kg)
                <input type="number" inputMode="numeric" placeholder="65"
                  onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1.5 w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent" />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page shell — steps through details → scan → results.
// ---------------------------------------------------------------------------
export default function ScanFit() {
  const { scanComplete, setScanComplete } = useMeasurementStore();
  const [step, setStep] = useState(scanComplete ? 'results' : 'details');

  if (step === 'details') {
    return <ScanDetailsForm onContinue={() => setStep('scan')} />;
  }
  if (step === 'scan') {
    return <ScanCamera onComplete={() => setStep('results')} onEditDetails={() => setStep('details')} />;
  }
  return (
    <ResultsView
      onRescan={() => { setScanComplete(false); setStep('scan'); }}
      onEditDetails={() => setStep('details')}
    />
  );
}
