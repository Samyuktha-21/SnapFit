import type { BodyMeasurements } from '../types/measurements';

const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;

interface Props {
  profile: BodyMeasurements;
  gender: 'Men' | 'Women';
}

// Tabular view of the user's measurements (from the ScanFit model), shown atop
// the Brand Grid and Comparison pages.
export default function MeasurementsTable({ profile, gender }: Props) {
  const rows: [string, number][] = [
    ['Shoulder', profile.shoulderWidth],
    [gender === 'Women' ? 'Bust' : 'Chest', profile.chestWidth],
    ['Waist', profile.waistWidth],
    ['Hip', profile.hipWidth],
  ];

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-[0_0_30px_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Your Measurements</h3>
        <span className="text-[11px] text-neutral-500">
          Size {profile.size} · {profile.confidence}% confidence
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-neutral-500 text-[11px]">
            <th className="text-left font-medium py-1"></th>
            <th className="text-right font-medium py-1">cm</th>
            <th className="text-right font-medium py-1">in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, cm]) => (
            <tr key={label} className="border-t border-neutral-800/70">
              <td className="text-left text-white font-semibold py-2">{label}</td>
              <td className="text-right text-neutral-200 py-2 tabular-nums">{cm}</td>
              <td className="text-right text-neutral-400 py-2 tabular-nums">{cmToIn(cm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
