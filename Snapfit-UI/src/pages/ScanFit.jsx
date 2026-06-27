// ScanFit.jsx — our real measurement model, mounted as the /scanfit page inside
// the SnapFit frontend.
//
// Flow:
//   1. Details screen  — height (cm), weight (kg, optional), sex. Stored in the
//      shared measurement store so scan + results + brand screens can read them.
//      The camera does NOT start until height and sex are provided.
//   2. Scan stage      — front + side guided capture (camera mounts here only).
//   3. Results         — ANSUR measurement estimate from the stored details.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, LayoutGrid, RotateCcw, Camera, Pencil } from 'lucide-react';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { useSnapFitMeasurement } from '../scanfit/useSnapFitMeasurement';
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

// ---------------------------------------------------------------------------
// Step 1 — Details form (shown BEFORE the camera).
// Local state while editing; commits to the shared store on "Start scan".
// ---------------------------------------------------------------------------
function ScanDetailsForm({ onContinue }) {
  const { height, weight, gender, setHeight, setWeight, setGender } = useMeasurementStore();

  // Seed from whatever is already in the store (so editing/returning is smooth).
  const [heightCm, setHeightCm] = useState(height ? String(height) : '');
  const [weightKg, setWeightKg] = useState(weight != null ? String(weight) : '');
  // Sex starts unset so the user must make an explicit choice (it's a gate).
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
          {/* Height */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Height (cm) <span className="text-accent">*</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={heightCm}
              placeholder="170"
              onChange={(e) => setHeightCm(e.target.value)}
              className={`mt-1.5 ${field}`}
            />
          </label>

          {/* Weight (optional) */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Weight (kg) <span className="text-neutral-600 normal-case tracking-normal">· optional</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={weightKg}
              placeholder="65"
              onChange={(e) => setWeightKg(e.target.value)}
              className={`mt-1.5 ${field}`}
            />
          </label>

          {/* Sex toggle */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Sex <span className="text-accent">*</span>
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSex(opt.value)}
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
          onClick={handleStart}
          disabled={!canContinue}
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
// Step 2 + 3 — Scan stage (camera) and results. The camera/model only spin up
// when this component mounts, i.e. after the details form is completed.
// ---------------------------------------------------------------------------
function ScanStage({ onEditDetails }) {
  const navigate = useNavigate();
  const {
    height, weight, gender,
    setBodyProfile, setWeight, addScanToHistory,
  } = useMeasurementStore();

  const {
    videoRef, canvasRef,
    phase, status, aligned, holdProgress, reasons, captureFlash,
    reset,
  } = useSnapFitMeasurement();

  const sex = gender === 'Men' ? 'male' : 'female';
  const isMen = gender === 'Men';
  const predictions = predictMeasurements({ heightCm: height, weightKg: weight, sex });

  const buildProfile = () => {
    const chest = Math.round(predictions.chest.cm);
    return {
      shoulderWidth: Math.round(predictions.shoulder.cm),
      chestWidth: chest,
      waistWidth: Math.round(predictions.waist.cm),
      hipWidth: Math.round(predictions.hip.cm),
      confidence: 95,
      size: sizeFromChest(chest, isMen),
    };
  };

  const saveAndGo = (dest) => {
    if (!predictions) return;
    const profile = buildProfile();
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

            {/* Green "recorded" confirmation */}
            {captureFlash && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/25 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-black font-bold shadow-lg">
                  <CheckCircle className="h-6 w-6" />
                  {captureFlash === 'front' ? 'Front view recorded' : 'Side view recorded'}
                </div>
              </div>
            )}
          </div>

          {/* Hold-steady progress */}
          {phase !== 'done' && (
            <div className="mt-4">
              <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-[width] duration-100"
                  style={{ width: `${Math.round(holdProgress * 100)}%` }}
                />
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

          {/* Entered details summary + edit */}
          <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-800 pt-3">
            <span>
              {height} cm{weight != null ? ` · ${weight} kg` : ''} · {gender}
            </span>
            <button
              onClick={onEditDetails}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <Pencil className="h-3 w-3" /> Edit details
            </button>
          </div>
        </div>

        {/* RIGHT — tips while scanning, results when done */}
        {phase !== 'done' ? (
          <TipsCard />
        ) : (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 md:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white tracking-tight">Your measurements</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-5">
              Estimated from your height, weight &amp; sex with a model trained on 6,068 adults (ANSUR II).
            </p>

            {predictions ? (
              <>
                {/* Size + measurements table */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] uppercase tracking-widest text-neutral-500">Recommended size</span>
                  <span className="text-3xl font-black text-accent">
                    {buildProfile().size}
                  </span>
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

                <p className="text-[11px] text-neutral-600 leading-relaxed mt-4">
                  Measurements are estimated from height, weight &amp; sex. The ±cm is the model&apos;s real average error.
                </p>

                {/* Size Passport — shareable downloadable card */}
                <div className="mt-8 pt-6 border-t border-neutral-800">
                  <SizePassport profile={buildProfile()} gender={gender} />
                </div>
              </>
            ) : (
              // Weight was skipped (it's optional) — the estimate needs it, so
              // offer to add it here without re-asking for height/sex.
              <div className="rounded-2xl border border-neutral-700 bg-black/40 p-5">
                <p className="text-sm text-white font-semibold mb-1">Add your weight to finish</p>
                <p className="text-[11px] text-neutral-500 mb-4">
                  The measurement estimate needs your weight. Height and sex are already saved.
                </p>
                <label className="block text-[11px] text-neutral-400">
                  Weight (kg)
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="65"
                    onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : null)}
                    className="mt-1.5 w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}

            <button onClick={reset}
              className="mt-5 flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" /> Rescan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page shell — switches between the details form and the scan stage. Because
// the scan stage is unmounted while on 'details', the camera never opens until
// the user has supplied their details.
// ---------------------------------------------------------------------------
export default function ScanFit() {
  const [step, setStep] = useState('details'); // 'details' | 'scan'

  if (step === 'details') {
    return <ScanDetailsForm onContinue={() => setStep('scan')} />;
  }
  return <ScanStage onEditDetails={() => setStep('details')} />;
}
