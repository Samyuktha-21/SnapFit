export interface SizeRange {
  chest_cm?: [number, number]; // [min, max] for Men
  bust_cm?: [number, number];  // [min, max] for Women
  waist_cm?: [number, number]; // [min, max]
  length_cm: number;
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
}
