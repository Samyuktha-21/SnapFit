export interface SizeRange {
  chest_cm?: [number, number];    // [min, max] for Men
  bust_cm?: [number, number];     // [min, max] for Women
  waist_cm?: [number, number];    // [min, max]
  hip_cm?: [number, number];      // [min, max]
  shoulder_cm?: [number, number]; // [min, max]
  length_cm?: number;
}

export interface SizeChart {
  [sizeLabel: string]: SizeRange;
}

export interface BrandFitCharts {
  Regular?: SizeChart;
  Oversized?: SizeChart;
  [fitName: string]: SizeChart | undefined;
}

export interface BrandData {
  id?: string; // Optional Firestore doc ID
  brand: string;
  gender: 'Men' | 'Women';
  fits: BrandFitCharts;
  logoUrl?: string;
}

export interface MatchResult {
  brand: string;
  fit: string;
  recommendedSize: string;
  confidence: number;
  minVal: number;
  maxVal: number;
  userVal: number;
  isBorderline: boolean;
  borderlineMessage?: string;
  explanation: string;
  // Full measurement ranges of the recommended size (for display).
  chest_cm?: [number, number];
  waist_cm?: [number, number];
  hip_cm?: [number, number];
  shoulder_cm?: [number, number];
}

export type FitPref = 'Slim' | 'True' | 'Relaxed';
