// ScanFit.jsx — our real measurement model, mounted as the /scanfit page inside
// the SnapFit frontend. Front + side guided capture, then height/weight/sex ->
// ANSUR measurement estimate, written into the shared store so Brand Grid and
// Comparison produce real results.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, LayoutGrid, RotateCcw } from 'lucide-react';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { useSnapFitMeasurement } from '../scanfit/useSnapFitMeasurement';
import { predictMeasurements, cmToIn } from '../scanfit/bodyModel';
import TipsCard from '../components/TipsCard';

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

export default function ScanFit() {
  const navigate = useNavigate();
  const { setHeight, setGender, setBodyProfile, addScanToHistory } = useMeasurementStore();

  const {
    videoRef, canvasRef,
    phase, status, aligned, holdProgress, reasons, result, captureFlash,
    reset,
  } = useSnapFitMeasurement();

  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [sex, setSex] = useState('female');
  const predictions = predictMeasurements({ heightCm, weightKg, sex });

  const buildProfile = () => {
    const isMen = sex === 'male';
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

  // Persist to the shared store, then go to brand results.
  const saveAndGo = (dest) => {
    if (!predictions) return;
    setHeight(Number(heightCm));
    setGender(sex === 'male' ? 'Men' : 'Women');
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
        </div>

        {/* RIGHT — tips while scanning, results when done */}
        {phase !== 'done' ? (
          <TipsCard />
        ) : (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 md:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white tracking-tight">Your measurements</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-5">
              Enter your height &amp; weight — we estimate the rest from a model trained on 6,068 adults (ANSUR II).
            </p>

            {/* Inputs */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <label className="flex flex-col gap-1 text-[11px] text-neutral-400">
                Height (cm)
                <input type="number" value={heightCm} placeholder="160"
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neutral-500" />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-neutral-400">
                Weight (kg)
                <input type="number" value={weightKg} placeholder="55"
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neutral-500" />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-neutral-400">
                Sex
                <select value={sex} onChange={(e) => setSex(e.target.value)}
                  className="bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neutral-500">
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
            </div>

            {predictions ? (
              <>
                {/* Size + measurements table */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] uppercase tracking-widest text-neutral-500">Recommended size</span>
                  <span className="text-2xl font-black text-white">
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
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm py-3 transition-colors cursor-pointer">
                    Brand Sizes <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => saveAndGo('/comparison')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm py-3 transition-colors cursor-pointer">
                    <LayoutGrid className="h-4 w-4" /> Compare
                  </button>
                </div>

                <p className="text-[11px] text-neutral-600 leading-relaxed mt-4">
                  Measurements are estimated from height, weight &amp; sex — the ±cm is the model&apos;s real average error.
                </p>
              </>
            ) : (
              <p className="text-xs text-neutral-500">Enter your height &amp; weight to see your measurements.</p>
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
