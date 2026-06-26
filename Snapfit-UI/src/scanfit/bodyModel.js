// bodyModel.js — body-measurement predictor trained offline on ANSUR II
// (6,068 real adults). Coefficients only ship to the browser; no dataset, no
// backend. Each model is a linear fit: value = b0 + b1*heightCm + b2*sexMale +
// b3*weightKg. `mae` is the real held-out average error in cm (honest ± to show).
// Retrain via scripts/train_ansur.py.

export const BODY_MODEL = {
  chest:    { beta: [98.96844, -0.29467,  3.4902,  0.64499], mae: 2.9 },
  waist:    { beta: [101.93238, -0.4382, -0.99166, 0.81936], mae: 3.6 },
  hip:      { beta: [86.60758, -0.14023, -8.43752, 0.56603], mae: 2.2 },
  shoulder: { beta: [16.43367,  0.10107,  2.78653, 0.05376], mae: 1.2 },
};

// inputs: { heightCm, weightKg, sex: 'male' | 'female' }
// returns: { chest:{cm,mae}, waist:{...}, hip:{...}, shoulder:{...} } or null.
export function predictMeasurements({ heightCm, weightKg, sex }) {
  const h = Number(heightCm), w = Number(weightKg);
  if (!h || !w) return null;
  const male = sex === 'male' ? 1 : 0;
  const out = {};
  for (const [name, { beta, mae }] of Object.entries(BODY_MODEL)) {
    const cm = beta[0] + beta[1] * h + beta[2] * male + beta[3] * w;
    out[name] = { cm: Math.round(cm * 10) / 10, mae };
  }
  return out;
}

export const cmToIn = (cm) => Math.round((cm / 2.54) * 10) / 10;
