import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';
import type { BodyMeasurements } from '../types/measurements';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { fmtVal } from '../utils/units';

interface Props {
  profile: BodyMeasurements;
  gender: 'Men' | 'Women';
  bodyShape?: { label: string; confidence: number } | null;
}

// An attractive, shareable size card the user can download as a PNG and pull up
// while shopping, or send to whoever is buying for them.
export default function SizePassport({ profile, gender, bodyShape }: Props) {
  const { unit } = useMeasurementStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.download = 'snapfit-size-passport.png';
      a.href = dataUrl;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, number][] = [
    ['Shoulder', profile.shoulderWidth],
    [gender === 'Women' ? 'Bust' : 'Chest', profile.chestWidth],
    ['Waist', profile.waistWidth],
    ['Hip', profile.hipWidth],
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={download}
        disabled={busy}
        className="flex items-center gap-2 rounded-xl bg-accent text-black font-bold text-sm px-5 py-3 hover:brightness-95 transition cursor-pointer disabled:opacity-60"
      >
        <Download className="h-4 w-4" /> {busy ? 'Preparing…' : 'Download Size Passport'}
      </button>

      {/* Exported card */}
      <div
        ref={cardRef}
        className="w-[360px] rounded-3xl overflow-hidden border border-accent/30 bg-neutral-950 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-neutral-900 pointer-events-none" />
        <div className="relative p-7">
          <div className="flex items-center justify-between mb-7">
            <span className="font-display text-2xl text-white">SnapFit</span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-accent font-bold">Size Passport</span>
          </div>

          <span className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Recommended size</span>
          <div className="flex items-end justify-between">
            <span className="font-display text-[5.5rem] text-accent leading-none">{profile.size}</span>
            {bodyShape && (
              <div className="text-right pb-2">
                <span className="block text-[9px] uppercase tracking-widest text-neutral-500">Body type</span>
                <span className="block text-base font-bold text-white leading-tight">{bodyShape.label}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {rows.map(([label, cm]) => (
              <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                <span className="block text-[9px] uppercase tracking-widest text-neutral-500">{label}</span>
                <span className="block text-lg font-black text-white tabular-nums">{fmtVal(cm, unit)}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[10px] text-neutral-500 leading-relaxed">
            Estimated from a camera scan and a body model. Show it at checkout or send it to whoever shops for you.
          </p>
        </div>
      </div>
    </div>
  );
}
