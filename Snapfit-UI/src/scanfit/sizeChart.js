// sizeChart.js — size definitions + the ratio->size mapping.
// Standard WOMEN'S top body-measurement chart (inches), incl. shoulder width.
// This is a sensible general chart — SWAP it for your specific brand's t-shirt
// chart when you have it. It's isolated here so changing it touches nothing else.
// Sanity check: size S here = chest ~82-86cm, which matches a real ~82cm chest.
export const SIZE_CHART = {
  XS:  { shoulder: [14, 14.75],     chest: [31, 32.5],   waist: [24, 25],     hip: [33, 34.5] },
  S:   { shoulder: [14.75, 15.25],  chest: [32.5, 34],   waist: [25, 27],     hip: [34.5, 36.5] },
  M:   { shoulder: [15.25, 15.75],  chest: [34, 36],     waist: [27, 29],     hip: [36.5, 38.5] },
  L:   { shoulder: [15.75, 16.5],   chest: [36, 38.5],   waist: [29, 31.5],   hip: [38.5, 41] },
  XL:  { shoulder: [16.5, 17.25],   chest: [38.5, 41],   waist: [31.5, 34],   hip: [41, 43.5] },
  XXL: { shoulder: [17.25, 18.25],  chest: [41, 44],     waist: [34, 37.5],   hip: [43.5, 46.5] },
};

export const inToCm = (inches) => Math.round(inches * 2.54);
export const fmtIn = ([lo, hi]) => `${lo}–${hi}"`;
export const fmtCm = ([lo, hi]) => `${inToCm(lo)}–${inToCm(hi)} cm`;

// Map the dimensionless shoulder/height ratio to a size.
// Only the S/M boundary (~0.227) is backed by real data (2 people so far);
// the others are estimates — the validation/calibration panel exists to fix them.
export function sizeFromRatio(ratio) {
  if (ratio < 0.21) return 'XS';
  if (ratio < 0.227) return 'S';
  if (ratio < 0.25) return 'M';
  if (ratio < 0.27) return 'L';
  if (ratio < 0.29) return 'XL';
  return 'XXL';
}

export const measurementsForSize = (size) => SIZE_CHART[size] ?? null;
