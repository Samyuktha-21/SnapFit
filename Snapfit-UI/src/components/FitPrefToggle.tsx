import { useMeasurementStore } from '../store/useMeasurementStore';
import type { FitPref } from '../types/brands';

const OPTS: { key: FitPref; label: string; hint: string }[] = [
  { key: 'Slim', label: 'Slim', hint: 'Closer to the body' },
  { key: 'True', label: 'True', hint: 'As the brand intends' },
  { key: 'Relaxed', label: 'Relaxed', hint: 'Roomier, size up' },
];

// Slim / True / Relaxed preference. Shifts the recommended size brand-wide.
export default function FitPrefToggle() {
  const { fitPref, setFitPref } = useMeasurementStore();

  return (
    <div className="inline-flex rounded-2xl border border-neutral-800 bg-black p-1">
      {OPTS.map((o) => (
        <button
          key={o.key}
          onClick={() => setFitPref(o.key)}
          title={o.hint}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            fitPref === o.key ? 'bg-accent text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
