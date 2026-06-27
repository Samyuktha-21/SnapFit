import type { BodyMeasurements } from '../types/measurements';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { fmtVal } from '../utils/units';

interface Props {
  profile: BodyMeasurements;
  gender: 'Men' | 'Women';
}

// Tabular view of the user's measurements (from the ScanFit model), shown atop
// the Brand Grid and Comparison pages. Respects the global cm/in unit.
export default function MeasurementsTable({ profile, gender }: Props) {
  const { unit } = useMeasurementStore();

  const rows: [string, number][] = [
    ['Shoulder', profile.shoulderWidth],
    [gender === 'Women' ? 'Bust' : 'Chest', profile.chestWidth],
    ['Waist', profile.waistWidth],
    ['Hip', profile.hipWidth],
  ];

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-[0_0_30px_rgba(212,255,63,0.06)]">
      <div className="flex items-center justify-between mb-4 pr-12 md:pr-16">
        <h3 className="text-sm font-bold text-white">Your Measurements</h3>
        <span className="text-[11px] text-neutral-400">
          Size <span className="text-accent font-bold">{profile.size}</span> · {profile.confidence}% confidence
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.map(([label, cm]) => (
          <div key={label} className="rounded-xl bg-black/40 border border-neutral-800 p-3">
            <span className="block text-[10px] uppercase tracking-widest text-neutral-500">{label}</span>
            <span className="block text-lg font-black text-white tabular-nums mt-1">{fmtVal(cm, unit)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
