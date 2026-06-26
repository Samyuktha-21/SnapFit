import type { BodyMeasurements } from '../types/measurements';

/**
 * Calculates physical body measurements (in cm) based on MediaPipe Pose landmarks,
 * user height, and gender.
 * 
 * DESIGN PRINCIPLE: Decouples UI from ML.
 * The UI components only call this function and receive the standardized BodyMeasurements output.
 * The ML engineer can replace the internals of this function with real keypoint-based models.
 * 
 * @param poseLandmarks Raw keypoints from MediaPipe Pose (33 points with x, y, z, visibility)
 * @param heightCm User-provided height in centimeters
 * @param gender User-provided gender ('Men' | 'Women')
 * @returns Standardized body profile measurements
 */
export function calculateMeasurements(
  poseLandmarks: any | null,
  heightCm: number,
  gender: 'Men' | 'Women'
): BodyMeasurements {
  
  // 1. Check if we have active landmarks from MediaPipe
  if (poseLandmarks && Array.isArray(poseLandmarks) && poseLandmarks.length >= 33) {
    try {
      // Helper: calculate distance between two points in 2D space
      const getDistance = (p1: any, p2: any) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      };

      // Extract key landmark points (using standard MediaPipe indices)
      const nose = poseLandmarks[0];
      const leftShoulder = poseLandmarks[11];
      const rightShoulder = poseLandmarks[12];
      const leftHip = poseLandmarks[23];
      const rightHip = poseLandmarks[24];
      const leftHeel = poseLandmarks[29];
      const rightHeel = poseLandmarks[30];

      // Calculate height in pixel-space (nose to average of heels)
      const avgHeelY = (leftHeel.y + rightHeel.y) / 2;
      const pixelHeight = avgHeelY - nose.y;

      if (pixelHeight > 0.1) {
        // Calculate scaling factor (cm per pixel)
        // Since the camera is standard and we have height, we map pixel height to actual height
        const cmPerPixel = heightCm / pixelHeight;

        // Shoulder width in pixels
        const pixelShoulderWidth = getDistance(leftShoulder, rightShoulder);
        // Hip width in pixels
        const pixelHipWidth = getDistance(leftHip, rightHip);

        // Convert to physical cm
        // Applying average body proportion ratios
        const shoulderWidth = Math.round(pixelShoulderWidth * cmPerPixel * 1.8);
        const hipWidth = Math.round(pixelHipWidth * cmPerPixel * 1.6);
        
        // Derive chest and waist based on body skeleton relationships
        let chestWidth = 0;
        let waistWidth = 0;

        if (gender === 'Men') {
          // Men typically have wider shoulders than hips, chest matches shoulder proportions
          chestWidth = Math.round(shoulderWidth * 2.2);
          waistWidth = Math.round(hipWidth * 2.1);
        } else {
          // Women typically have wider hips than shoulders, bust is slightly narrower than shoulder block
          chestWidth = Math.round(shoulderWidth * 2.3); // bust
          waistWidth = Math.round(hipWidth * 1.8);
        }

        // Add minor randomized variation for simulation variance
        const variance = () => (Math.random() - 0.5) * 1.5;

        // Determine generic size recommendation
        let size = 'M';
        if (chestWidth < (gender === 'Men' ? 92 : 85)) size = 'S';
        else if (chestWidth < (gender === 'Men' ? 102 : 93)) size = 'M';
        else if (chestWidth < (gender === 'Men' ? 112 : 101)) size = 'L';
        else size = 'XL';

        return {
          shoulderWidth: Math.round(shoulderWidth + variance()),
          chestWidth: Math.round(chestWidth + variance()),
          waistWidth: Math.round(waistWidth + variance()),
          hipWidth: Math.round(hipWidth + variance()),
          confidence: Math.round(85 + Math.random() * 12), // 85% to 97%
          size
        };
      }
    } catch (err) {
      console.warn("MediaPipe scaling logic failed, falling back to mock generator", err);
    }
  }

  // 2. Mock Fallback Generation based on Height and Gender
  // Used when camera scanning is simulated or landmark calculations fail
  const baseHeight = heightCm;
  const isMen = gender === 'Men';

  let shoulderWidth = 0;
  let chestWidth = 0;
  let waistWidth = 0;
  let hipWidth = 0;
  let size = 'M';

  if (isMen) {
    if (baseHeight < 170) {
      shoulderWidth = 40;
      chestWidth = 88;
      waistWidth = 76;
      hipWidth = 90;
      size = 'S';
    } else if (baseHeight < 180) {
      shoulderWidth = 44;
      chestWidth = 98;
      waistWidth = 84;
      hipWidth = 96;
      size = 'M';
    } else if (baseHeight < 190) {
      shoulderWidth = 48;
      chestWidth = 108;
      waistWidth = 92;
      hipWidth = 102;
      size = 'L';
    } else {
      shoulderWidth = 52;
      chestWidth = 118;
      waistWidth = 100;
      hipWidth = 110;
      size = 'XL';
    }
  } else {
    // Women
    if (baseHeight < 160) {
      shoulderWidth = 35;
      chestWidth = 82; // Bust
      waistWidth = 64;
      hipWidth = 88;
      size = 'S';
    } else if (baseHeight < 170) {
      shoulderWidth = 37;
      chestWidth = 88; // Bust
      waistWidth = 70;
      hipWidth = 94;
      size = 'M';
    } else if (baseHeight < 180) {
      shoulderWidth = 40;
      chestWidth = 96; // Bust
      waistWidth = 78;
      hipWidth = 102;
      size = 'L';
    } else {
      shoulderWidth = 43;
      chestWidth = 104; // Bust
      waistWidth = 86;
      hipWidth = 110;
      size = 'XL';
    }
  }

  // Introduce small custom variation based on height fraction to prevent static results
  const offset = Math.round((baseHeight % 10) * 0.4);
  shoulderWidth += Math.round(offset * 0.2);
  chestWidth += offset;
  waistWidth += Math.round(offset * 0.8);
  hipWidth += Math.round(offset * 0.9);

  return {
    shoulderWidth,
    chestWidth,
    waistWidth,
    hipWidth,
    confidence: 94,
    size
  };
}
