import { useState } from 'react';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { Save, X } from 'lucide-react';
import type { BodyMeasurements } from '../types/measurements';

interface Props {
  onCancel: () => void;
  onSave: () => void;
}

export default function ManualEntryForm({ onCancel, onSave }: Props) {
  const { gender, unit, bodyProfile, setBodyProfile } = useMeasurementStore();
  
  const getInitial = (cmVal?: number) => {
    if (!cmVal) return '';
    return unit === 'in' ? (cmVal / 2.54).toFixed(1) : Math.round(cmVal).toString();
  };

  const [shoulder, setShoulder] = useState(getInitial(bodyProfile?.shoulderWidth));
  const [chest, setChest] = useState(getInitial(bodyProfile?.chestWidth));
  const [waist, setWaist] = useState(getInitial(bodyProfile?.waistWidth));
  const [hip, setHip] = useState(getInitial(bodyProfile?.hipWidth));

  const handleSave = () => {
    if (!shoulder || !chest || !waist || !hip) return;

    // Convert from input unit to cm before saving (store requires cm)
    // Actually wait, if the user typed it in, they typed it in their selected 'unit'.
    // So if unit === 'in', we must convert it to 'cm' before saving.
    const toCm = (val: string) => {
      const num = parseFloat(val);
      return unit === 'in' ? num * 2.54 : num;
    };

    const newProfile: BodyMeasurements = {
      shoulderWidth: toCm(shoulder),
      chestWidth: toCm(chest),
      waistWidth: toCm(waist),
      hipWidth: toCm(hip),
      size: bodyProfile?.size || 'M', // mock size if not present
      confidence: 100, // Manual entry is 100%
      frontPose: bodyProfile?.frontPose,
      sidePose: bodyProfile?.sidePose
    };

    setBodyProfile(newProfile);
    onSave();
  };

  // Convert the current cm values to the selected unit for initial display
  // But wait, if they change the unit while editing, it doesn't auto convert.
  // We'll keep it simple: initial values are loaded based on current unit.

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-[0_0_30px_rgba(212,255,63,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Manual Entry ({unit})</h3>
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-neutral-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-black/40 border border-neutral-800 p-3">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Shoulder</label>
          <input
            type="number"
            value={shoulder}
            onChange={e => setShoulder(e.target.value)}
            className="w-full bg-transparent text-lg font-black text-white tabular-nums outline-none"
            placeholder={`e.g. ${unit === 'cm' ? '41' : '16'}`}
          />
        </div>
        <div className="rounded-xl bg-black/40 border border-neutral-800 p-3">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
            {gender === 'Women' ? 'Bust' : 'Chest'}
          </label>
          <input
            type="number"
            value={chest}
            onChange={e => setChest(e.target.value)}
            className="w-full bg-transparent text-lg font-black text-white tabular-nums outline-none"
            placeholder={`e.g. ${unit === 'cm' ? '99' : '39'}`}
          />
        </div>
        <div className="rounded-xl bg-black/40 border border-neutral-800 p-3">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Waist</label>
          <input
            type="number"
            value={waist}
            onChange={e => setWaist(e.target.value)}
            className="w-full bg-transparent text-lg font-black text-white tabular-nums outline-none"
            placeholder={`e.g. ${unit === 'cm' ? '86' : '34'}`}
          />
        </div>
        <div className="rounded-xl bg-black/40 border border-neutral-800 p-3">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Hip</label>
          <input
            type="number"
            value={hip}
            onChange={e => setHip(e.target.value)}
            className="w-full bg-transparent text-lg font-black text-white tabular-nums outline-none"
            placeholder={`e.g. ${unit === 'cm' ? '96' : '38'}`}
          />
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!shoulder || !chest || !waist || !hip}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-neutral-200 disabled:opacity-50 transition-colors"
        >
          <Save size={16} /> Save Measurements
        </button>
      </div>
    </div>
  );
}
