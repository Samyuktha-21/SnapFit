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
  CheckCircle, ArrowRight, LayoutGrid, RotateCcw, Camera, Pencil, Download, ChevronDown, RefreshCcw, ZoomIn,
  Ruler, CreditCard
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
  const {
    height, weight, gender, autoHeight,
    setHeight, setWeight, setGender, setAutoHeight, setDetectedHeight,
  } = useMeasurementStore();

  const [heightCm, setHeightCm] = useState(autoHeight ? '' : (height ? String(height) : ''));
  const [weightKg, setWeightKg] = useState(weight != null ? String(weight) : '');
  const [sex, setSex] = useState(
    gender === 'Men' ? 'male' : gender === 'Women' ? 'female' : null,
  );
  const [autoMode, setAutoMode] = useState(autoHeight);

  const heightValid = Number(heightCm) > 0;
  const canContinue = (heightValid || autoMode) && (sex === 'male' || sex === 'female');

  const enableAuto = () => { setAutoMode(true); setHeightCm(''); };
  const disableAuto = () => setAutoMode(false);

  const handleStart = () => {
    if (!canContinue) return;
    setWeight(weightKg ? Number(weightKg) : null);
    setGender(sex === 'male' ? 'Men' : 'Women');
    setAutoHeight(autoMode);
    if (autoMode) {
      // Height will be detected during the scan; clear any prior value.
      setHeight(0);
      setDetectedHeight(null);
    } else {
      setHeight(Number(heightCm));
    }
    onContinue();
  };

  const field =
    'bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-colors w-full';

  return (
    <div className="min-h-[80vh] md:min-h-0 md:flex-1 bg-transparent md:bg-black text-white flex flex-col items-center justify-center font-display relative py-8">
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
          <div className="block">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Height (cm) {!autoMode && <span className="text-accent">*</span>}
            </span>
            <input
              type="number" inputMode="numeric" value={heightCm} placeholder="170"
              disabled={autoMode}
              onChange={(e) => setHeightCm(e.target.value)}
              className={`mt-1.5 ${field} ${autoMode ? 'opacity-40 cursor-not-allowed' : ''}`}
            />

            {!autoMode ? (
              <button
                type="button" onClick={enableAuto}
                className="mt-2 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
              >
                Or measure my height automatically during scan →
              </button>
            ) : (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-accent/10 border border-accent/30 px-3 py-2">
                <Ruler className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] text-accent font-semibold leading-snug">
                    We'll detect your height using a credit card during the scan.
                  </p>
                  <button
                    type="button" onClick={disableAuto}
                    className="mt-1 text-[10px] text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Enter it manually instead
                  </button>
                </div>
              </div>
            )}
          </div>

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
            {autoMode
              ? 'Pick your sex to continue.'
              : 'Enter your height and pick your sex to continue.'}
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
function ScanCamera({ onComplete, onEditDetails, debug }) {
  const [showToast, setShowToast] = useState(false);
  const [heightToast, setHeightToast] = useState(false);
  const [zoom, setZoom] = useState(1);
  const {
    height, weight, gender, autoHeight,
    setBodyProfile, setSilhouette, setScanComplete, setHeight, setDetectedHeight, setHeightDebug,
  } = useMeasurementStore();

  const {
    videoRef, canvasRef,
    phase, status, aligned, holdProgress, reasons, silhouette, captureFlash,
    devices, switchCamera,
    detectedHeight, heightError, heightDebug,
  } = useSnapFitMeasurement({ measureHeight: autoHeight });

  const handleSwitchCamera = () => {
    if (devices.length > 1) {
      switchCamera();
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Non-blocking notice if auto height measurement failed — never blocks the scan.
  useEffect(() => {
    if (!heightError) return;
    setHeightToast(true);
    const t = setTimeout(() => setHeightToast(false), 4500);
    return () => clearTimeout(t);
  }, [heightError]);

  useEffect(() => {
    if (phase !== 'done') return;
    setSilhouette(silhouette || null);
    if (heightDebug) setHeightDebug(heightDebug);

    // In auto mode, commit the detected height (if any) as the effective height.
    let effHeight = height;
    if (autoHeight) {
      if (detectedHeight) {
        effHeight = detectedHeight;
        setHeight(detectedHeight);
        setDetectedHeight(detectedHeight);
      } else {
        effHeight = 0; // detection failed → results will prompt for manual entry
        setDetectedHeight(null);
      }
    }

    const profile = profileFromStore(effHeight, weight, gender);
    if (profile) setBodyProfile(profile);
    setScanComplete(true);
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const statusMsg = phase === 'done'
    ? 'Calculating profile…'
    : aligned ? 'Perfect! Hold still...' : (reasons && reasons.length > 0 ? reasons[0] : 'Line up with the guide');

  return (
    <div className="fixed inset-0 z-50 bg-black text-white p-0 flex flex-col md:relative md:z-auto md:bg-transparent md:min-h-screen md:p-6">
      <div className="flex-1 w-full flex flex-col md:grid md:grid-cols-2 md:gap-6 md:mx-auto md:max-w-6xl md:items-start">
        <div className="flex-1 flex flex-col md:rounded-3xl md:border md:border-neutral-800 md:bg-neutral-900/40 md:p-5 md:shadow-xl md:relative">
          <div className="flex items-center justify-between p-4 z-10 relative md:mb-4 md:p-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              phase === 'done'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-white/10 text-white border-white/20'
            }`}>
              {PHASE_LABEL[phase]}
            </span>
            <span className="flex items-center gap-2 text-xs text-neutral-400">
              <span className={`h-2 w-2 rounded-full ${aligned ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {statusMsg}
            </span>
          </div>

          <div className="flex-1 relative z-0 md:rounded-2xl overflow-hidden bg-black md:aspect-video group">
            <div className="absolute inset-0 transition-transform duration-300 origin-center" style={{ transform: `scale(${zoom})` }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            
            <div className="absolute top-[10%] left-0 w-full flex justify-center pointer-events-none z-30 transition-opacity duration-300">
              <div className={`backdrop-blur-md px-6 py-3 rounded-full text-white font-bold text-base md:text-lg tracking-wide border shadow-2xl transition-all ${
                aligned ? 'bg-emerald-500/80 border-emerald-400 text-black' : 'bg-black/70 border-white/20'
              }`}>
                {statusMsg}
              </div>
            </div>
            
            <button
              onClick={handleSwitchCamera}
              className="absolute top-4 right-4 z-20 bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 transition-all text-white"
              title="Switch Camera"
            >
              <RefreshCcw size={20} />
            </button>

            <button
              onClick={() => setZoom(z => z === 1 ? 1.5 : z === 1.5 ? 2 : 1)}
              className="absolute top-20 right-4 z-20 bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 transition-all text-white"
              title="Zoom"
            >
              <ZoomIn size={20} />
              {zoom !== 1 && (
                <span className="absolute -top-1 -right-1 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {zoom}x
                </span>
              )}
            </button>

            {/* Auto-height: card position indicator at chest height (front phase) */}
            {autoHeight && phase === 'front' && (
              <>
                <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                  <div className="w-24 h-[3.8rem] rounded-md border-2 border-accent bg-accent/10 animate-pulse flex items-center justify-center shadow-[0_0_25px_rgba(212,255,63,0.35)]">
                    <CreditCard className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <div className="absolute left-1/2 top-[55%] -translate-x-1/2 z-30 pointer-events-none px-4 w-full flex justify-center">
                  <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md border border-accent/40 px-4 py-2 rounded-full text-accent text-[11px] md:text-xs font-bold text-center">
                    <CreditCard className="h-3.5 w-3.5 flex-shrink-0" /> Hold any credit card flat against your chest
                  </div>
                </div>
              </>
            )}

            {/* Hidden debug overlay (press D three times to toggle) */}
            {debug && (
              <div className="absolute bottom-2 left-2 z-40 max-w-[75%] rounded-lg bg-black/85 border border-accent/40 p-3 text-[10px] font-mono text-accent leading-relaxed pointer-events-none">
                <div className="font-bold text-white mb-1">DEBUG · auto-height</div>
                {heightDebug ? (
                  <>
                    <div>height: {heightDebug.heightCm != null ? heightDebug.heightCm.toFixed(1) : '—'} cm</div>
                    <div>scale: {heightDebug.scaleMmPerPx != null ? heightDebug.scaleMmPerPx.toFixed(4) : '—'} mm/px</div>
                    <div>pixelSpan: {heightDebug.pixelSpan?.toFixed(1)} px</div>
                    <div>headOffset: {heightDebug.headOffset?.toFixed(1)} px</div>
                    <div>fullSpan: {heightDebug.fullSpan?.toFixed(1)} px</div>
                    <div>cardW: {heightDebug.cardWidthPx != null ? heightDebug.cardWidthPx.toFixed(1) : '—'} px · aspect {heightDebug.aspect != null ? heightDebug.aspect.toFixed(2) : '—'}</div>
                    <div>cardConf: {heightDebug.confidence != null ? (heightDebug.confidence * 100).toFixed(0) + '%' : '—'}</div>
                    <div>cardBox: {heightDebug.cardBox ? `${heightDebug.cardBox.x | 0},${heightDebug.cardBox.y | 0} ${heightDebug.cardBox.w | 0}×${heightDebug.cardBox.h | 0}` : 'none'}</div>
                  </>
                ) : <div className="text-neutral-400">waiting for front capture…</div>}
              </div>
            )}
          </div>

          <AnimatePresence>
            {showToast && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 right-4 bg-neutral-900/90 backdrop-blur-md text-white px-4 py-2 rounded-lg text-xs font-medium shadow-xl z-20 border border-white/10"
              >
                No additional camera detected.
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {heightToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 text-black px-4 py-2 rounded-lg text-xs font-semibold shadow-xl max-w-[85%] text-center"
              >
                Couldn't measure height automatically — you can enter it manually after the scan.
              </motion.div>
            )}
          </AnimatePresence>

          {captureFlash && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/25 backdrop-blur-sm z-30">
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-black font-bold shadow-lg">
                <CheckCircle className="h-6 w-6" />
                {captureFlash === 'front' ? 'Front view recorded' : 'Side view recorded'}
              </div>
            </div>
          )}

          {phase !== 'done' && (
            <div className="p-4 z-10 md:mt-4 md:p-0">
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

          <div className="hidden md:flex mt-4 relative z-10 items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-800 pt-3">
            <span>{autoHeight ? 'Height: auto (card)' : `${height} cm`}{weight != null ? ` · ${weight} kg` : ''} · {gender}</span>
            <button onClick={onEditDetails}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <Pencil className="h-3 w-3" /> Edit details
            </button>
          </div>
        </div>

        <div className="hidden md:block">
          <TipsCard />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Results. No camera. Reads persisted store data, so it shows on return
// until the user leaves the site or hits Rescan.
// ---------------------------------------------------------------------------
function ResultsView({ onRescan, onEditDetails, debug }) {
  const navigate = useNavigate();
  const {
    height, weight, gender, silhouette, autoHeight, detectedHeight, heightDebug,
    setWeight, setHeight, setDetectedHeight, setBodyProfile, addScanToHistory,
  } = useMeasurementStore();

  const [showPassport, setShowPassport] = useState(false);
  const [editingHeight, setEditingHeight] = useState(false);

  const sex = gender === 'Men' ? 'male' : 'female';
  const predictions = predictMeasurements({ heightCm: height, weightKg: weight, sex });
  const bodyShape = classifyBodyShape(silhouette, gender);
  const profile = predictions ? profileFromStore(height, weight, gender) : null;

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

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3.5 w-3.5" /> Scan complete
          </span>

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

          <button
            onClick={onRescan}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-black font-bold text-sm py-3 hover:brightness-95 transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Rescan
          </button>

          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
            <span>{(detectedHeight || height) ? `${detectedHeight || height} cm` : '—'}{weight != null ? ` · ${weight} kg` : ''} · {gender}</span>
            <button onClick={onEditDetails}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <Pencil className="h-3 w-3" /> Edit details
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 md:p-8 shadow-xl relative">
          {debug && heightDebug && (
            <div className="absolute top-3 right-3 z-20 rounded-lg bg-black/85 border border-accent/40 p-2.5 text-[10px] font-mono text-accent leading-relaxed pointer-events-none">
              <div className="font-bold text-white mb-1">DEBUG · height</div>
              <div>final: {heightDebug.heightCm != null ? heightDebug.heightCm.toFixed(1) : '—'} cm</div>
              <div>scale: {heightDebug.scaleMmPerPx != null ? heightDebug.scaleMmPerPx.toFixed(4) : '—'}</div>
              <div>span: {heightDebug.pixelSpan?.toFixed(0)}+{heightDebug.headOffset?.toFixed(0)}px</div>
              <div>cardW: {heightDebug.cardWidthPx != null ? heightDebug.cardWidthPx.toFixed(0) : '—'}px</div>
            </div>
          )}
          <h3 className="text-lg font-bold text-white tracking-tight mb-5">Your measurements</h3>

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

              {/* Auto-detected height chip — tap to correct manually */}
              {autoHeight && detectedHeight && (
                <div className="mb-4">
                  {!editingHeight ? (
                    <button
                      onClick={() => setEditingHeight(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/40 px-3 py-1.5 text-[11px] text-accent font-semibold hover:bg-accent/15 transition-colors cursor-pointer"
                    >
                      <Ruler className="h-3.5 w-3.5" /> Detected height: {detectedHeight} cm
                      <Pencil className="h-3 w-3 opacity-70" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number" inputMode="numeric" defaultValue={detectedHeight} autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Number(e.currentTarget.value);
                            if (v > 0) { setHeight(v); setDetectedHeight(v); }
                            setEditingHeight(false);
                          }
                        }}
                        className="w-24 bg-black border border-accent/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousSibling;
                          const v = Number(input.value);
                          if (v > 0) { setHeight(v); setDetectedHeight(v); }
                          setEditingHeight(false);
                        }}
                        className="rounded-lg bg-accent text-black text-xs font-bold px-3 py-2 cursor-pointer"
                      >
                        Save
                      </button>
                      <span className="text-[10px] text-neutral-500">cm</span>
                    </div>
                  )}
                </div>
              )}

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

              <div className="mt-3 w-full">
                <button
                  onClick={() => setShowPassport((v) => !v)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm py-3 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Size Passport
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPassport ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {showPassport && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden w-full"
                    >
                      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl mb-4">
                        <SizePassport profile={profile} gender={gender} bodyShape={bodyShape} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-[11px] text-neutral-600 leading-relaxed mt-4">
                Measurements are estimated from height, weight &amp; sex. The ±cm is the model&apos;s real average error.
                Body type uses your silhouette proportions, so it doesn&apos;t depend on exact measurements.
              </p>
            </>
          ) : (
            // Missing height (auto-detect may have failed) and/or weight. Graceful
            // manual fallback — never a hard error.
            <div className="rounded-2xl border border-neutral-700 bg-black/40 p-5 space-y-5">
              {!height && (
                <div>
                  <p className="text-sm text-white font-semibold mb-1">Add your height to finish</p>
                  <p className={`text-[11px] mb-3 ${autoHeight ? 'text-amber-400' : 'text-neutral-500'}`}>
                    {autoHeight
                      ? "Couldn't measure your height automatically — please enter it manually."
                      : 'The measurement estimate needs your height.'}
                  </p>
                  <label className="block text-[11px] text-neutral-400">
                    Height (cm)
                    <input type="number" inputMode="numeric" placeholder="170"
                      onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : 0)}
                      className="mt-1.5 w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent" />
                  </label>
                </div>
              )}
              {!!height && !weight && (
                <div>
                  <p className="text-sm text-white font-semibold mb-1">Add your weight to finish</p>
                  <p className="text-[11px] text-neutral-500 mb-3">
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
  const [debug, setDebug] = useState(false);

  // Hidden debug overlay: press "D" three times quickly to toggle.
  useEffect(() => {
    const taps = [];
    const onKey = (e) => {
      if (e.key !== 'd' && e.key !== 'D') return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't hijack typing
      const now = Date.now();
      taps.push(now);
      while (taps.length && now - taps[0] > 800) taps.shift();
      if (taps.length >= 3) { taps.length = 0; setDebug((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (step === 'details') {
    return <ScanDetailsForm onContinue={() => setStep('scan')} />;
  }
  if (step === 'scan') {
    return <ScanCamera debug={debug} onComplete={() => setStep('results')} onEditDetails={() => setStep('details')} />;
  }
  return (
    <ResultsView
      debug={debug}
      onRescan={() => { setScanComplete(false); setStep('scan'); }}
      onEditDetails={() => setStep('details')}
    />
  );
}
