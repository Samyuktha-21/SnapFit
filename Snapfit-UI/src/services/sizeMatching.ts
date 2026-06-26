import type { BrandData, MatchResult, SizeRange, SizeChart, FitPref } from '../types/brands';
import type { BodyMeasurements } from '../types/measurements';

// ---------------------------------------------------------------------------
// Brand size charts. Source ranges are in INCHES (as provided), converted to cm
// here so they match the user's measurements (which are in cm). Charts are
// unisex / gender-neutral, so each brand is registered for both Men and Women.
// ---------------------------------------------------------------------------
type Inch = [number, number];
interface UniSize { chest: Inch; waist?: Inch; hip?: Inch; shoulder?: Inch; }
type UniChart = Record<'XS' | 'S' | 'M' | 'L' | 'XL', UniSize>;

const inToCm = (n: number): number => Math.round(n * 2.54);
const cm = (r?: Inch): [number, number] | undefined =>
  r ? [inToCm(r[0]), inToCm(r[1])] : undefined;

const OVERSIZED_DELTA = 6; // cm: oversized garments run roomier

function buildChart(chart: UniChart, isWomen: boolean, delta = 0): SizeChart {
  const out: SizeChart = {};
  for (const [size, m] of Object.entries(chart)) {
    const chestCm = cm(m.chest)!;
    const range: SizeRange = {
      waist_cm: cm(m.waist),
      hip_cm: cm(m.hip),
      shoulder_cm: cm(m.shoulder),
    };
    const shift = (r?: [number, number]) =>
      r ? ([r[0] + delta, r[1] + delta] as [number, number]) : undefined;
    if (isWomen) range.bust_cm = shift(chestCm);
    else range.chest_cm = shift(chestCm);
    range.waist_cm = shift(range.waist_cm);
    range.hip_cm = shift(range.hip_cm);
    out[size] = range;
  }
  return out;
}

function unisexBrand(brand: string, chart: UniChart): BrandData[] {
  const make = (isWomen: boolean): BrandData => ({
    brand,
    gender: isWomen ? 'Women' : 'Men',
    fits: {
      Regular: buildChart(chart, isWomen, 0),
      Oversized: buildChart(chart, isWomen, OVERSIZED_DELTA),
    },
  });
  return [make(false), make(true)];
}

// Raw charts in inches (exactly as supplied). Non-numeric cuts are omitted.
const CHARTS: Record<string, UniChart> = {
  Nike: {
    XS: { chest: [31.5, 35], waist: [25.5, 29], hip: [31.5, 35] },
    S: { chest: [35, 37.5], waist: [29, 32], hip: [35, 37.5] },
    M: { chest: [37.5, 41], waist: [32, 35], hip: [37.5, 41] },
    L: { chest: [41, 44], waist: [35, 38], hip: [41, 44] },
    XL: { chest: [44, 48.5], waist: [38, 43], hip: [44, 47] },
  },
  Adidas: {
    XS: { chest: [32.5, 34], waist: [27.5, 29], hip: [32, 33.5] },
    S: { chest: [34.5, 36], waist: [29.5, 31.5], hip: [34, 36] },
    M: { chest: [36.5, 39], waist: [32, 34.5], hip: [36.5, 39] },
    L: { chest: [39.5, 42.5], waist: [35, 38], hip: [39.5, 42] },
    XL: { chest: [43, 46.5], waist: [38.5, 42], hip: [42.5, 45.5] },
  },
  Uniqlo: {
    XS: { chest: [32, 35], waist: [34, 34], hip: [34, 34], shoulder: [16.5, 16.5] },
    S: { chest: [35, 38], waist: [37, 37], hip: [37, 37], shoulder: [17, 17] },
    M: { chest: [38, 41], waist: [40, 40], hip: [40, 40], shoulder: [18, 18] },
    L: { chest: [41, 44], waist: [43, 43], hip: [43, 43], shoulder: [19, 19] },
    XL: { chest: [44, 47], waist: [46, 46], hip: [46, 46], shoulder: [20.5, 20.5] },
  },
  Puma: {
    XS: { chest: [33, 35], waist: [27, 29], hip: [34, 36] },
    S: { chest: [35, 38], waist: [29, 31], hip: [36, 38] },
    M: { chest: [38, 41], waist: [31, 34], hip: [38, 41] },
    L: { chest: [41, 44], waist: [34, 38], hip: [41, 44] },
    XL: { chest: [44, 48], waist: [38, 42], hip: [44, 47] },
  },
  'New Balance': {
    XS: { chest: [33, 35], waist: [27, 29], hip: [32, 34] },
    S: { chest: [35, 38], waist: [29, 31], hip: [34, 37] },
    M: { chest: [38, 41], waist: [31, 34], hip: [37, 40] },
    L: { chest: [41, 44], waist: [34, 37], hip: [40, 43] },
    XL: { chest: [44, 48], waist: [37, 41], hip: [43, 46] },
  },
  'The North Face': {
    XS: { chest: [33, 35], hip: [33, 34] },
    S: { chest: [36, 38], hip: [35, 37] },
    M: { chest: [39, 41], hip: [38, 40] },
    L: { chest: [42, 44], hip: [41, 43] },
    XL: { chest: [45, 48], hip: [44, 46] },
  },
  Gap: {
    XS: { chest: [34, 36], waist: [28, 29] },
    S: { chest: [36, 38], waist: [30, 31] },
    M: { chest: [39, 41], waist: [32, 34] },
    L: { chest: [42, 44], waist: [35, 37] },
    XL: { chest: [45, 47], waist: [38, 40] },
  },
  ASICS: {
    XS: { chest: [33, 36], waist: [27, 30], hip: [33, 36] },
    S: { chest: [36, 39], waist: [30, 33], hip: [36, 39] },
    M: { chest: [39, 41], waist: [33, 35], hip: [39, 41] },
    L: { chest: [41, 43], waist: [36, 38], hip: [41, 43] },
    XL: { chest: [43, 46], waist: [38, 42], hip: [43, 46] },
  },
  'Carhartt WIP': {
    XS: { chest: [34, 36], waist: [26, 28], hip: [31, 33] },
    S: { chest: [37, 39], waist: [29, 31], hip: [34, 36] },
    M: { chest: [40, 42], waist: [32, 34], hip: [37, 39] },
    L: { chest: [43, 45], waist: [35, 37], hip: [40, 42] },
    XL: { chest: [46, 48], waist: [38, 40], hip: [43, 45] },
  },
  Converse: {
    XS: { chest: [33, 35], waist: [27, 29], hip: [35, 37] },
    S: { chest: [36, 38], waist: [29, 31], hip: [37, 39] },
    M: { chest: [39, 41], waist: [31, 33], hip: [39, 41.5] },
    L: { chest: [42, 44], waist: [33, 37], hip: [41.5, 44] },
    XL: { chest: [45, 48], waist: [37, 41], hip: [44, 46.5] },
  },
  Champion: {
    XS: { chest: [30, 32], waist: [24, 26] },
    S: { chest: [34, 36], waist: [28, 30] },
    M: { chest: [38, 40], waist: [32, 34] },
    L: { chest: [42, 44], waist: [36, 38] },
    XL: { chest: [46, 48], waist: [40, 42] },
  },
  "Levi's": {
    XS: { chest: [32, 34], waist: [26, 28], hip: [32, 34] },
    S: { chest: [35, 37], waist: [29, 31], hip: [35, 37] },
    M: { chest: [38, 40], waist: [32, 34], hip: [38, 40] },
    L: { chest: [41, 43], waist: [35, 37], hip: [41, 43] },
    XL: { chest: [44, 46], waist: [38, 40], hip: [44, 46] },
  },
  Vans: {
    XS: { chest: [28.5, 32], waist: [26, 28], hip: [26, 28] },
    S: { chest: [32.5, 36], waist: [29, 31], hip: [29, 31] },
    M: { chest: [36.5, 40], waist: [32, 34], hip: [32, 34] },
    L: { chest: [40.5, 44], waist: [35, 38], hip: [35, 38] },
    XL: { chest: [44.5, 48], waist: [39, 42], hip: [39, 42] },
  },
  'H&M': {
    XS: { chest: [32, 34], waist: [28, 30], hip: [33, 35] },
    S: { chest: [35, 37], waist: [31, 33], hip: [36, 38] },
    M: { chest: [38, 40], waist: [34, 36], hip: [39, 41] },
    L: { chest: [41, 43], waist: [37, 39], hip: [42, 44] },
    XL: { chest: [44, 46], waist: [40, 42], hip: [45, 47] },
  },
};

export const SEEDED_BRANDS: BrandData[] = Object.entries(CHARTS).flatMap(
  ([brand, chart]) => unisexBrand(brand, chart),
);

// Fit preference nudges the effective chest: Relaxed reads you larger (roomier
// pick), Slim reads you smaller (closer pick), True is neutral.
const FIT_PREF_DELTA: Record<FitPref, number> = { Slim: -4, True: 0, Relaxed: 4 };

/**
 * Matches a user's chest/bust measurement against a brand's fit chart.
 */
export function matchBrandSize(
  brandData: BrandData,
  bodyProfile: BodyMeasurements,
  gender: 'Men' | 'Women',
  fitType: 'Regular' | 'Oversized' = 'Regular',
  fitPref: FitPref = 'True',
): MatchResult {
  const isMen = gender === 'Men';
  const userVal = bodyProfile.chestWidth + FIT_PREF_DELTA[fitPref];

  const sizeChart = brandData.fits[fitType];

  if (!sizeChart || Object.keys(sizeChart).length === 0) {
    return {
      brand: brandData.brand, fit: fitType, recommendedSize: 'N/A',
      confidence: 0, minVal: 0, maxVal: 0, userVal,
      isBorderline: false,
      explanation: `No size chart found for ${brandData.brand} (${fitType}).`,
    };
  }

  const sizes = Object.keys(sizeChart);
  let bestSize = '';
  let bestRange: [number, number] = [0, 0];
  let minDiff = Infinity;
  let exactMatchFound = false;

  for (const size of sizes) {
    const range = sizeChart[size];
    const limits = isMen ? range.chest_cm : range.bust_cm;
    if (!limits) continue;
    const [min, max] = limits;

    if (userVal >= min && userVal <= max) {
      bestSize = size; bestRange = [min, max]; exactMatchFound = true; break;
    }
    const center = (min + max) / 2;
    const diff = Math.abs(userVal - center);
    if (diff < minDiff) { minDiff = diff; bestSize = size; bestRange = [min, max]; }
  }

  if (!bestSize) {
    bestSize = 'M';
    bestRange = isMen ? [94, 101] : [88, 95];
  }

  const [min, max] = bestRange;
  const center = (min + max) / 2;
  const rangeWidth = max - min;

  let confidence = 100;
  let isBorderline = false;
  let borderlineMessage = '';

  if (exactMatchFound) {
    const distFromCenter = Math.abs(userVal - center);
    const maxPossibleDist = rangeWidth / 2;
    if (maxPossibleDist > 0) {
      confidence = Math.round(100 - (distFromCenter / maxPossibleDist) * 30);
    }
    const borderThreshold = 1.5;
    if (userVal - min <= borderThreshold) {
      isBorderline = true;
      borderlineMessage = `Borderline. Runs slightly loose at ${userVal}cm, consider sizing down for a slim fit.`;
    } else if (max - userVal <= borderThreshold) {
      isBorderline = true;
      borderlineMessage = `Borderline. Runs slightly tight at ${userVal}cm, consider sizing up for a relaxed fit.`;
    }
  } else {
    const distFromEdge = userVal < min ? min - userVal : userVal - max;
    confidence = Math.max(50, Math.round(70 - (distFromEdge / 3) * 15));
    isBorderline = true;
    borderlineMessage = userVal < min
      ? `Smaller than the ${bestSize} range. Fit will be loose.`
      : `Larger than the ${bestSize} range. Fit will be tight.`;
  }

  const matchedRange = sizeChart[bestSize] ?? {};
  const measurementName = isMen ? 'chest' : 'bust';
  const explanation = `Recommended ${bestSize}: your ${measurementName} is ${userVal}cm, aligning with ${brandData.brand}'s ${bestSize} range (${min}-${max}cm) for ${fitType} fit.`;

  return {
    brand: brandData.brand, fit: fitType, recommendedSize: bestSize,
    confidence, minVal: min, maxVal: max, userVal,
    isBorderline, borderlineMessage, explanation,
    chest_cm: isMen ? matchedRange.chest_cm : matchedRange.bust_cm,
    waist_cm: matchedRange.waist_cm,
    hip_cm: matchedRange.hip_cm,
    shoulder_cm: matchedRange.shoulder_cm,
  };
}
