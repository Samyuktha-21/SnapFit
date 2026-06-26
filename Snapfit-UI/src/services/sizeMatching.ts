import type { BrandData, MatchResult, SizeRange } from '../types/brands';
import type { BodyMeasurements } from '../types/measurements';

// 1. Seeded Brand Size Charts (Nike, Zara, Uniqlo)
// Handled as separate data paths for Men (chest_cm) and Women (bust_cm)
export const SEEDED_BRANDS: BrandData[] = [
  {
    brand: "Nike",
    gender: "Men",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
    fits: {
      Regular: {
        S: { chest_cm: [86, 93], length_cm: 68 },
        M: { chest_cm: [94, 101], length_cm: 71 },
        L: { chest_cm: [102, 109], length_cm: 74 },
        XL: { chest_cm: [110, 118], length_cm: 77 }
      },
      Oversized: {
        S: { chest_cm: [92, 99], length_cm: 72 },
        M: { chest_cm: [100, 107], length_cm: 75 },
        L: { chest_cm: [108, 115], length_cm: 78 },
        XL: { chest_cm: [116, 124], length_cm: 81 }
      }
    }
  },
  {
    brand: "Nike",
    gender: "Women",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
    fits: {
      Regular: {
        S: { bust_cm: [80, 87], length_cm: 60 },
        M: { bust_cm: [88, 95], length_cm: 62 },
        L: { bust_cm: [96, 103], length_cm: 64 },
        XL: { bust_cm: [104, 112], length_cm: 66 }
      },
      Oversized: {
        S: { bust_cm: [86, 93], length_cm: 64 },
        M: { bust_cm: [94, 101], length_cm: 66 },
        L: { bust_cm: [102, 109], length_cm: 68 },
        XL: { bust_cm: [110, 118], length_cm: 70 }
      }
    }
  },
  {
    brand: "Zara",
    gender: "Men",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Zara_Logo.svg",
    fits: {
      Regular: {
        S: { chest_cm: [88, 95], length_cm: 69 },
        M: { chest_cm: [96, 103], length_cm: 71 },
        L: { chest_cm: [104, 111], length_cm: 73 },
        XL: { chest_cm: [112, 120], length_cm: 75 }
      },
      Oversized: {
        S: { chest_cm: [94, 101], length_cm: 72 },
        M: { chest_cm: [102, 109], length_cm: 74 },
        L: { chest_cm: [110, 117], length_cm: 76 },
        XL: { chest_cm: [118, 126], length_cm: 78 }
      }
    }
  },
  {
    brand: "Zara",
    gender: "Women",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Zara_Logo.svg",
    fits: {
      Regular: {
        S: { bust_cm: [82, 89], length_cm: 58 },
        M: { bust_cm: [90, 97], length_cm: 60 },
        L: { bust_cm: [98, 105], length_cm: 62 },
        XL: { bust_cm: [106, 114], length_cm: 64 }
      },
      Oversized: {
        S: { bust_cm: [88, 95], length_cm: 62 },
        M: { bust_cm: [96, 103], length_cm: 64 },
        L: { bust_cm: [104, 111], length_cm: 66 },
        XL: { bust_cm: [112, 120], length_cm: 68 }
      }
    }
  },
  {
    brand: "Uniqlo",
    gender: "Men",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/92/UNIQLO_logo.svg",
    fits: {
      Regular: {
        S: { chest_cm: [84, 91], length_cm: 67 },
        M: { chest_cm: [92, 99], length_cm: 70 },
        L: { chest_cm: [100, 107], length_cm: 73 },
        XL: { chest_cm: [108, 116], length_cm: 76 }
      },
      Oversized: {
        S: { chest_cm: [90, 97], length_cm: 70 },
        M: { chest_cm: [98, 105], length_cm: 73 },
        L: { chest_cm: [106, 113], length_cm: 76 },
        XL: { chest_cm: [114, 122], length_cm: 79 }
      }
    }
  },
  {
    brand: "Uniqlo",
    gender: "Women",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/92/UNIQLO_logo.svg",
    fits: {
      Regular: {
        S: { bust_cm: [78, 85], length_cm: 59 },
        M: { bust_cm: [86, 93], length_cm: 61 },
        L: { bust_cm: [94, 101], length_cm: 63 },
        XL: { bust_cm: [102, 110], length_cm: 65 }
      },
      Oversized: {
        S: { bust_cm: [84, 91], length_cm: 63 },
        M: { bust_cm: [92, 99], length_cm: 65 },
        L: { bust_cm: [100, 107], length_cm: 67 },
        XL: { bust_cm: [108, 116], length_cm: 69 }
      }
    }
  }
];

/**
 * Matches a user's chest/bust measurement against a specific brand's fit size chart
 * and calculates the recommendation, confidence, and explanations.
 */
export function matchBrandSize(
  brandData: BrandData,
  bodyProfile: BodyMeasurements,
  gender: 'Men' | 'Women',
  fitType: 'Regular' | 'Oversized' = 'Regular'
): MatchResult {
  const isMen = gender === 'Men';
  const userVal = bodyProfile.chestWidth; // Men chest width vs Women bust width
  
  const sizeChart = brandData.fits[fitType];
  
  if (!sizeChart || Object.keys(sizeChart).length === 0) {
    return {
      brand: brandData.brand,
      fit: fitType,
      recommendedSize: 'N/A',
      confidence: 0,
      minVal: 0,
      maxVal: 0,
      userVal,
      isBorderline: false,
      explanation: `No size chart found for ${brandData.brand} (${fitType}).`
    };
  }

  // Find size ranges
  const sizes = Object.keys(sizeChart);
  let bestSize = '';
  let bestRange: [number, number] = [0, 0];
  let minDiff = Infinity;
  let exactMatchFound = false;

  for (const size of sizes) {
    const range: SizeRange = sizeChart[size];
    const limits = isMen ? range.chest_cm : range.bust_cm;
    
    if (!limits) continue;
    
    const [min, max] = limits;
    
    // Check if measurement falls within bounds
    if (userVal >= min && userVal <= max) {
      bestSize = size;
      bestRange = [min, max];
      exactMatchFound = true;
      break;
    }

    // Keep track of closest size in case it falls outside all ranges
    const center = (min + max) / 2;
    const diff = Math.abs(userVal - center);
    if (diff < minDiff) {
      minDiff = diff;
      bestSize = size;
      bestRange = [min, max];
    }
  }

  if (!bestSize) {
    // Default fallback
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
    // Compute confidence based on closeness to center (100%) vs edges (70%)
    const distFromCenter = Math.abs(userVal - center);
    const maxPossibleDist = rangeWidth / 2;
    
    if (maxPossibleDist > 0) {
      confidence = Math.round(100 - (distFromCenter / maxPossibleDist) * 30);
    }

    // Borderline flags if user is within 1.5 cm of boundaries
    const borderThreshold = 1.5;
    if (userVal - min <= borderThreshold) {
      isBorderline = true;
      borderlineMessage = `Borderline — runs slightly loose at ${userVal}cm (size boundary is ${min}cm), consider sizing down if you prefer a slim fit.`;
    } else if (max - userVal <= borderThreshold) {
      isBorderline = true;
      borderlineMessage = `Borderline — runs slightly tight at ${userVal}cm (size boundary is ${max}cm), consider sizing up if you prefer a relaxed fit.`;
    }
  } else {
    // Outside of chart ranges entirely
    const distFromEdge = userVal < min ? min - userVal : userVal - max;
    confidence = Math.max(50, Math.round(70 - (distFromEdge / 3) * 15));
    isBorderline = true;
    
    if (userVal < min) {
      borderlineMessage = `Substantially smaller than the ${bestSize} range. Fit will be very loose/oversized.`;
    } else {
      borderlineMessage = `Substantially larger than the ${bestSize} range. Fit will be very tight/slim.`;
    }
  }

  const measurementName = isMen ? 'chest' : 'bust';
  const explanation = `Recommended ${bestSize} because your ${measurementName} is ${userVal}cm, which aligns with ${brandData.brand}'s ${bestSize} range (${min}-${max}cm) for ${fitType} fit.`;

  return {
    brand: brandData.brand,
    fit: fitType,
    recommendedSize: bestSize,
    confidence,
    minVal: min,
    maxVal: max,
    userVal,
    isBorderline,
    borderlineMessage,
    explanation
  };
}
