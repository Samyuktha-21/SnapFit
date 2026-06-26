import { useMeasurementStore } from '../store/useMeasurementStore';

// Compact cm / in segmented control. Reads + writes the global unit.
export default function UnitToggle() {
  const { unit, setUnit } = useMeasurementStore();
  const opts: ('cm' | 'in')[] = ['cm', 'in'];

  return (
    <div className="inline-flex rounded-full border border-neutral-700 bg-black p-0.5">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => setUnit(o)}
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            unit === o ? 'bg-accent text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
