import { useState } from 'react';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firestore } from '../services/firebase';
import { Plus, Trash2, Code, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { BrandData, SizeChart } from '../types/brands';

type TabOption = 'manual' | 'json' | 'csv';

export default function BrandUploadForm() {
  const { addCustomBrand } = useMeasurementStore();
  const [activeTab, setActiveTab] = useState<TabOption>('manual');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- MANUAL FORM STATE ---
  const [brandName, setBrandName] = useState('');
  const [gender, setGender] = useState<'Men' | 'Women'>('Men');
  const [fitName, setFitName] = useState('Regular');
  
  interface SizeRow {
    size: string;
    min: string;
    max: string;
    length: string;
  }
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([
    { size: 'S', min: '88', max: '95', length: '68' },
    { size: 'M', min: '96', max: '103', length: '71' },
    { size: 'L', min: '104', max: '111', length: '74' }
  ]);

  // --- JSON STATE ---
  const [jsonText, setJsonText] = useState(JSON.stringify({
    brand: "CustomWear",
    gender: "Men",
    fits: {
      Regular: {
        S: { chest_cm: [88, 95], length_cm: 68 },
        M: { chest_cm: [96, 103], length_cm: 71 },
        L: { chest_cm: [104, 111], length_cm: 74 }
      }
    }
  }, null, 2));

  // --- CSV STATE ---
  const [csvText, setCsvText] = useState(
    "size,min_cm,max_cm,length_cm\nS,88,95,68\nM,96,103,71\nL,104,111,74"
  );
  const [csvBrandName, setCsvBrandName] = useState('CSVBrand');
  const [csvGender, setCsvGender] = useState<'Men' | 'Women'>('Men');
  const [csvFitName, setCsvFitName] = useState('Regular');

  // Add row in manual form
  const addRow = () => {
    setSizeRows([...sizeRows, { size: '', min: '', max: '', length: '' }]);
  };

  // Remove row in manual form
  const removeRow = (idx: number) => {
    setSizeRows(sizeRows.filter((_, i) => i !== idx));
  };

  // Update row value
  const updateRow = (idx: number, field: keyof SizeRow, value: string) => {
    const updated = [...sizeRows];
    updated[idx][field] = value;
    setSizeRows(updated);
  };

  // VALIDATION & SUBMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      let submissionData: BrandData;

      if (activeTab === 'manual') {
        // Validate manual fields
        if (!brandName.trim()) throw new Error("Brand Name is required.");
        if (!fitName.trim()) throw new Error("Fit Name is required.");
        if (sizeRows.length === 0) throw new Error("At least one size row must be defined.");

        const sizeChart: SizeChart = {};
        for (const r of sizeRows) {
          if (!r.size.trim()) throw new Error("All size labels must be defined.");
          const minNum = Number(r.min);
          const maxNum = Number(r.max);
          const lenNum = Number(r.length);

          if (isNaN(minNum) || isNaN(maxNum) || isNaN(lenNum)) {
            throw new Error(`Size ${r.size}: Measurements must be valid numeric values.`);
          }
          if (minNum >= maxNum) {
            throw new Error(`Size ${r.size}: Minimum measurement must be less than Maximum.`);
          }

          if (gender === 'Men') {
            sizeChart[r.size.trim().toUpperCase()] = {
              chest_cm: [minNum, maxNum],
              length_cm: lenNum
            };
          } else {
            sizeChart[r.size.trim().toUpperCase()] = {
              bust_cm: [minNum, maxNum],
              length_cm: lenNum
            };
          }
        }

        submissionData = {
          brand: brandName.trim(),
          gender,
          fits: {
            [fitName.trim()]: sizeChart
          }
        };

      } else if (activeTab === 'json') {
        // Parse & Validate JSON
        let parsed: any;
        try {
          parsed = JSON.parse(jsonText);
        } catch (err) {
          throw new Error("Invalid JSON formatting. Please check syntax commas/brackets.");
        }

        if (!parsed.brand || !parsed.gender || !parsed.fits) {
          throw new Error("JSON missing required root keys: 'brand', 'gender', 'fits'.");
        }
        if (parsed.gender !== 'Men' && parsed.gender !== 'Women') {
          throw new Error("Gender must be 'Men' or 'Women'.");
        }

        submissionData = parsed as BrandData;

      } else {
        // Parse CSV
        if (!csvBrandName.trim()) throw new Error("CSV Brand Name is required.");
        if (!csvFitName.trim()) throw new Error("CSV Fit Name is required.");
        
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          throw new Error("CSV must contain a header row and at least one data row.");
        }

        // Standard columns expected: size, min_cm, max_cm, length_cm
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const sizeIdx = headers.indexOf('size');
        const minIdx = headers.indexOf('min_cm');
        const maxIdx = headers.indexOf('max_cm');
        const lenIdx = headers.indexOf('length_cm');

        if (sizeIdx === -1 || minIdx === -1 || maxIdx === -1 || lenIdx === -1) {
          throw new Error("CSV headers must include: 'size', 'min_cm', 'max_cm', and 'length_cm'.");
        }

        const sizeChart: SizeChart = {};
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < headers.length) continue;

          const sizeLabel = cols[sizeIdx];
          const minVal = Number(cols[minIdx]);
          const maxVal = Number(cols[maxIdx]);
          const lenVal = Number(cols[lenIdx]);

          if (isNaN(minVal) || isNaN(maxVal) || isNaN(lenVal)) {
            throw new Error(`CSV Line ${i + 1}: Measurements must be valid numeric values.`);
          }

          if (csvGender === 'Men') {
            sizeChart[sizeLabel.toUpperCase()] = {
              chest_cm: [minVal, maxVal],
              length_cm: lenVal
            };
          } else {
            sizeChart[sizeLabel.toUpperCase()] = {
              bust_cm: [minVal, maxVal],
              length_cm: lenVal
            };
          }
        }

        submissionData = {
          brand: csvBrandName.trim(),
          gender: csvGender,
          fits: {
            [csvFitName.trim()]: sizeChart
          }
        };
      }

      // Write to LocalStorage DB (Simulating Firestore)
      const savedBrand = await firestore.saveBrand(submissionData);
      
      // Update global Zustand state
      addCustomBrand(savedBrand);

      // Trigger success state
      setSuccess(true);
      
      // Reset form
      if (activeTab === 'manual') {
        setBrandName('');
        setSizeRows([{ size: 'S', min: '88', max: '95', length: '68' }]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-xl">
      {/* Header Info */}
      <div className="mb-8 text-center sm:text-left">
        <h2 className="text-2xl font-black text-white tracking-tight">Size Chart Upload Portal</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Submit brand size chart configurations to add them to the recommended sizing engine instantly.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1 mb-8">
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); setErrorMsg(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'manual' ? 'bg-slate-950 text-white border border-slate-800 shadow' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Manual Entry</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('json'); setErrorMsg(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'json' ? 'bg-slate-950 text-white border border-slate-800 shadow' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Code className="h-4 w-4" />
          <span>Paste JSON</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('csv'); setErrorMsg(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'csv' ? 'bg-slate-950 text-white border border-slate-800 shadow' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>CSV Upload</span>
        </button>
      </div>

      {/* Notification Banners */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-950/20 border border-red-900/30 p-4 mb-6">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">Validation Error</h4>
            <p className="text-xs text-red-300 mt-1 leading-normal">{errorMsg}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 p-4 mb-6">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Brand Saved Successfully!</h4>
            <p className="text-xs text-emerald-350 mt-1 leading-normal">
              Your sizing configurations have been validated and added to Firestore. Go check the consumer grid!
            </p>
          </div>
        </div>
      )}

      {/* Forms submission */}
      <form onSubmit={handleSubmit}>
        {/* 1. MANUAL ENTRY FORM */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Adidas"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-650 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gender Category</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Men' | 'Women')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                >
                  <option value="Men">Men (chest_cm path)</option>
                  <option value="Women">Women (bust_cm path)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fit Style Label</label>
              <input
                type="text"
                placeholder="e.g. Regular, Oversized, Athletic"
                value={fitName}
                onChange={(e) => setFitName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500/80 focus:outline-none"
              />
            </div>

            {/* Sizes Rows Editor */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sizes & Ranges</span>
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Size Row</span>
                </button>
              </div>

              <div className="space-y-3">
                {sizeRows.map((row, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    {/* Size Label */}
                    <div className="w-20">
                      <input
                        type="text"
                        placeholder="Size"
                        value={row.size}
                        onChange={(e) => updateRow(idx, 'size', e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-center text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                      />
                    </div>
                    {/* Min measurement */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Min Width (cm)"
                        value={row.min}
                        onChange={(e) => updateRow(idx, 'min', e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-center text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                      />
                    </div>
                    {/* Max measurement */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Max Width (cm)"
                        value={row.max}
                        onChange={(e) => updateRow(idx, 'max', e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-center text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                      />
                    </div>
                    {/* Length measurement */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Length (cm)"
                        value={row.length}
                        onChange={(e) => updateRow(idx, 'length', e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-center text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                      />
                    </div>
                    {/* Trash Action */}
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={sizeRows.length <= 1}
                      className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-500 hover:text-red-400 hover:border-red-900/50 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. PASTE JSON */}
        {activeTab === 'json' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Raw JSON Size Chart Configuration</label>
              <textarea
                rows={12}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-indigo-300 p-4 focus:border-indigo-500/80 focus:outline-none leading-relaxed"
              />
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-850 p-4 flex gap-2">
              <Code className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-slate-500 leading-normal">
                Make sure the root keys match the schema exactly. Men uses <code className="text-slate-400 font-semibold">chest_cm: [min, max]</code>. Women uses <code className="text-slate-400 font-semibold">bust_cm: [min, max]</code>.
              </p>
            </div>
          </div>
        )}

        {/* 3. CSV UPLOAD */}
        {activeTab === 'csv' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CSV Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Puma"
                  value={csvBrandName}
                  onChange={(e) => setCsvBrandName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gender Path</label>
                <select
                  value={csvGender}
                  onChange={(e) => setCsvGender(e.target.value as 'Men' | 'Women')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                >
                  <option value="Men">Men (chest_cm)</option>
                  <option value="Women">Women (bust_cm)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fit Style</label>
                <input
                  type="text"
                  value={csvFitName}
                  onChange={(e) => setCsvFitName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500/80 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Paste CSV Data</label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-white p-4 focus:border-indigo-500/80 focus:outline-none"
              />
            </div>

            <div className="rounded-xl bg-slate-900 border border-slate-850 p-4 flex gap-2">
              <FileText className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-slate-500 leading-normal">
                Header row columns: <code className="text-slate-400 font-semibold">size, min_cm, max_cm, length_cm</code>. Delimit values using standard commas, and place each row on a new line.
              </p>
            </div>
          </div>
        )}

        {/* Submit Action */}
        <div className="mt-8 pt-6 border-t border-slate-900 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm px-8 py-3.5 shadow-lg shadow-indigo-600/10 transition-all cursor-pointer disabled:opacity-40"
          >
            <span>{loading ? 'Validating Sizing...' : 'Save Configuration'}</span>
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
