// poseMetrics.js — pure, UI-free measurement logic.
// Everything here takes raw MediaPipe landmarks and returns plain numbers, so it
// is trivially testable and decoupled from any UI layout.

// MediaPipe Pose landmark indices (33-point model).
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_ANKLE: 27, R_ANKLE: 28,
  L_HEEL: 29, R_HEEL: 30,
  L_FOOT: 31, R_FOOT: 32,
};

const vis = (lm, i) => lm[i]?.visibility ?? 0;

// Pixel distance between two normalized landmarks given the frame size.
export function distancePx(p1, p2, w, h) {
  const dx = (p1.x - p2.x) * w;
  const dy = (p1.y - p2.y) * h;
  return Math.sqrt(dx * dx + dy * dy);
}

// Bottom-of-body reference. We prefer foot-index (lowest, ~the sole), fall back
// to heel, then ankle. nose->ankle undercounts true height because the ankle is
// well above the floor; foot-index reaches much closer to the ground while
// staying just as consistent frame-to-frame.
function bottomY(lm) {
  const pairs = [
    [LM.L_FOOT, LM.R_FOOT],
    [LM.L_HEEL, LM.R_HEEL],
    [LM.L_ANKLE, LM.R_ANKLE],
  ];
  for (const [l, r] of pairs) {
    if (vis(lm, l) > 0.5 && vis(lm, r) > 0.5) return (lm[l].y + lm[r].y) / 2;
  }
  return (lm[LM.L_ANKLE].y + lm[LM.R_ANKLE].y) / 2;
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Scan the segmentation mask horizontally at a given normalized y to recover the
// TRUE outer body silhouette edges. Landmarks 23/24 sit on the hip JOINTS, which
// drift inward toward the waist (consistently narrower than the real hip), so we
// read the actual body edge from the mask instead.
//
// We sample a small band of rows around `yNorm` and, for each row, take the
// WIDEST CONTIGUOUS run of foreground pixels — the torso. That way a detached arm
// or hand blob beside the body (front view, arms slightly out) forms a separate
// run and does not inflate the width. The median row is returned for robustness.
//
// Returns { widthMaskPx, leftX, rightX } in MASK pixels, or null. `band` is in
// normalized y (fraction of frame height).
export function maskEdgeWidthAtY(maskData, maskW, maskH, yNorm, band = 0.03) {
  const rows = 7;
  const y0 = yNorm - band / 2;
  const y1 = yNorm + band / 2;
  const found = [];
  for (let i = 0; i < rows; i++) {
    const yn = y0 + (y1 - y0) * (i / (rows - 1));
    const py = Math.round(yn * maskH);
    if (py < 0 || py >= maskH) continue;
    const base = py * maskW;
    // Longest contiguous foreground run in this row.
    let bestLen = 0, bestL = -1, bestR = -1, runStart = -1;
    for (let x = 0; x < maskW; x++) {
      const fg = maskData[base + x] > 0.5;
      if (fg && runStart === -1) runStart = x;
      if ((!fg || x === maskW - 1) && runStart !== -1) {
        const end = fg ? x : x - 1;
        const len = end - runStart + 1;
        if (len > bestLen) { bestLen = len; bestL = runStart; bestR = end; }
        runStart = -1;
      }
    }
    if (bestLen > 0) found.push({ widthMaskPx: bestLen, leftX: bestL, rightX: bestR });
  }
  if (!found.length) return null;
  found.sort((a, b) => a.widthMaskPx - b.widthMaskPx);
  return found[Math.floor(found.length / 2)]; // median row
}

// Widest contiguous foreground run width at a single mask row (mask px), or 0.
// Same "widest run" idea as maskEdgeWidthAtY so raised arms beside the torso
// (separate blobs) don't get counted into the body width.
function rowRunWidth(maskData, maskW, py) {
  if (py < 0) return 0;
  const base = py * maskW;
  let best = 0, runStart = -1;
  for (let x = 0; x < maskW; x++) {
    const fg = maskData[base + x] > 0.5;
    if (fg && runStart === -1) runStart = x;
    if ((!fg || x === maskW - 1) && runStart !== -1) {
      const end = fg ? x : x - 1;
      best = Math.max(best, end - runStart + 1);
      runStart = -1;
    }
  }
  return best;
}

// Measure bust / waist / hip silhouette WIDTHS from the front mask. Body-shape
// classification only needs RATIOS (which are scale-invariant — no depth/scale
// needed), so we return raw mask-pixel widths and let the classifier divide.
//   bust  = fullest width in the upper-torso band
//   waist = narrowest width in the mid-torso band (the waist is, by definition,
//           the narrowest part — far more reliable than guessing a y-row)
//   hip   = fullest width around/just below the hip joints (true widest hip)
export function measureFrontSilhouette(maskData, maskW, maskH, lm) {
  const shoulderY = (lm[LM.L_SHOULDER].y + lm[LM.R_SHOULDER].y) / 2;
  const hipY = (lm[LM.L_HIP].y + lm[LM.R_HIP].y) / 2;
  const span = hipY - shoulderY;
  if (span <= 0) return null;
  const sample = (t) => rowRunWidth(maskData, maskW, Math.round((shoulderY + t * span) * maskH));

  let bust = 0, waist = Infinity, hip = 0;
  for (let t = 0.05; t <= 0.30 + 1e-9; t += 0.03) bust = Math.max(bust, sample(t));
  for (let t = 0.35; t <= 0.75 + 1e-9; t += 0.03) { const wd = sample(t); if (wd) waist = Math.min(waist, wd); }
  for (let t = 0.80; t <= 1.08 + 1e-9; t += 0.03) hip = Math.max(hip, sample(t));

  if (!bust || !hip || !isFinite(waist)) return null;
  return { bustW: bust, waistW: waist, hipW: hip };
}

const SHAPE_LABELS = {
  hourglass: 'Hourglass',
  pear: 'Pear',
  invertedTriangle: 'Inverted Triangle',
  rectangle: 'Rectangle',
  apple: 'Apple',
  trapezoid: 'Trapezoid',
};

const SHAPE_BLURB = {
  hourglass: 'Bust and hips balanced with a defined waist.',
  pear: 'Hips wider than the bust — weight sits lower.',
  invertedTriangle: 'Bust/shoulders wider than the hips.',
  rectangle: 'Bust, waist and hips run close to a straight line.',
  apple: 'Fullest through the midsection.',
  trapezoid: 'Shoulders wider than hips with a defined waist.',
};

// Classify body shape from front silhouette widths. Everything is a RATIO, so it
// is scale-invariant and works without knowing real cm. `gender` only swaps a
// couple of labels (men rarely read as "hourglass"). Returns a shape, a human
// label/blurb, a confidence %, and the raw ratios for transparency.
export function classifyBodyShape(sil, gender = 'Women') {
  if (!sil) return null;
  const { bustW: bust, waistW: waist, hipW: hip } = sil;
  if (!bust || !waist || !hip) return null;

  const bustHip = bust / hip;
  const waistToHip = waist / hip;
  const waistToBust = waist / bust;
  const balance = Math.abs(bust - hip) / Math.max(bust, hip); // 0 => bust == hip
  const isMen = gender === 'Men';

  let key, confidence;
  if (waist >= bust * 0.97 && waist >= hip * 0.97) {
    // Midsection is the widest part.
    key = 'apple';
    confidence = 0.70 + (waist / Math.max(bust, hip) - 0.97) * 3;
  } else if ((hip - bust) / hip > 0.07) {
    key = 'pear';
    confidence = 0.60 + ((hip - bust) / hip - 0.07) * 4;
  } else if ((bust - hip) / bust > 0.07) {
    key = isMen ? 'trapezoid' : 'invertedTriangle';
    confidence = 0.60 + ((bust - hip) / bust - 0.07) * 4;
  } else {
    // Bust ≈ hip — the call comes down to how defined the waist is.
    const waistDefined = waistToHip <= 0.78 && waistToBust <= 0.78;
    if (waistDefined) {
      key = isMen ? 'trapezoid' : 'hourglass';
      confidence = 0.60 + (0.78 - Math.max(waistToHip, waistToBust)) * 3;
    } else {
      key = 'rectangle';
      confidence = 0.62 + (0.07 - balance) * 2;
    }
  }
  confidence = Math.round(Math.max(0.55, Math.min(0.95, confidence)) * 100);

  return {
    shape: key,
    label: SHAPE_LABELS[key],
    blurb: SHAPE_BLURB[key],
    confidence,
    ratios: {
      bustHip: Math.round(bustHip * 100) / 100,
      waistToHip: Math.round(waistToHip * 100) / 100,
      waistToBust: Math.round(waistToBust * 100) / 100,
    },
  };
}

// FRONT-VIEW measurements (all pixels; the final `ratio` is scale-independent).
// When a segmentation mask is supplied we ALSO compute a mask-edge hip width
// (the reliable one); the landmark hip width is kept alongside it so the two can
// be logged and compared against real tape measurements before we switch over.
export function extractFrontMetrics(lm, w, h, mask) {
  const shoulderWidthPx = distancePx(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER], w, h);
  const hipWidthPx = distancePx(lm[LM.L_HIP], lm[LM.R_HIP], w, h); // weak: drifts inward
  const torsoLengthPx = distancePx(
    mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]),
    mid(lm[LM.L_HIP], lm[LM.R_HIP]),
    w, h,
  );
  const pixelHeightPx = Math.abs(bottomY(lm) - lm[LM.NOSE].y) * h;
  const ratio = pixelHeightPx ? shoulderWidthPx / pixelHeightPx : 0;

  // Mask-edge hip width, converted from mask px to frame px so it is directly
  // comparable to the landmark-based hipWidthPx (same units). We also pull the
  // bust/waist/hip silhouette widths used for body-shape classification.
  let hipWidthMaskPx = null;
  let silhouette = null;
  if (mask && mask.data) {
    const hipY = (lm[LM.L_HIP].y + lm[LM.R_HIP].y) / 2;
    const edge = maskEdgeWidthAtY(mask.data, mask.width, mask.height, hipY);
    if (edge) hipWidthMaskPx = edge.widthMaskPx * (w / mask.width);
    silhouette = measureFrontSilhouette(mask.data, mask.width, mask.height, lm);
  }

  return { shoulderWidthPx, hipWidthPx, hipWidthMaskPx, silhouette, torsoLengthPx, pixelHeightPx, ratio };
}

// In a side view, the body's horizontal silhouette width AT CHEST LEVEL *is* the
// real front-to-back torso depth. We read it from the segmentation mask, which is
// appearance-based and so survives the profile pose far better than landmark x/z.
// maskData is a Float32Array (foreground confidence 0..1), row-major maskW x maskH.
export function measureSideDepthPx(maskData, maskW, maskH, lm) {
  const shoulderY = (lm[LM.L_SHOULDER].y + lm[LM.R_SHOULDER].y) / 2;
  const hipY = (lm[LM.L_HIP].y + lm[LM.R_HIP].y) / 2;
  // Sample a band of rows across the chest/upper-torso and take the median width
  // (median = robust to a stray noisy row).
  const yStart = shoulderY + 0.04 * (hipY - shoulderY);
  const yEnd = shoulderY + 0.45 * (hipY - shoulderY);
  const widths = [];
  const rows = 9;
  for (let i = 0; i < rows; i++) {
    const yNorm = yStart + (yEnd - yStart) * (i / (rows - 1));
    const py = Math.round(yNorm * maskH);
    if (py < 0 || py >= maskH) continue;
    let minX = -1, maxX = -1;
    const base = py * maskW;
    for (let x = 0; x < maskW; x++) {
      if (maskData[base + x] > 0.5) { if (minX === -1) minX = x; maxX = x; }
    }
    if (minX !== -1 && maxX > minX) widths.push(maxX - minX);
  }
  if (!widths.length) return 0;
  widths.sort((a, b) => a - b);
  return widths[Math.floor(widths.length / 2)];
}

// SIDE-VIEW measurements. With a mask we measure REAL silhouette depth
// (depthCalibrated:true); without one we fall back to a flagged landmark proxy.
export function extractSideMetrics(lm, w, h, mask) {
  const pixelHeightPx = Math.abs(bottomY(lm) - lm[LM.NOSE].y) * h;
  if (mask && mask.data) {
    const torsoDepthPx = measureSideDepthPx(mask.data, mask.width, mask.height, lm);
    // Independent hip estimate the front view physically can't give: the
    // front-to-back BODY DEPTH at hip height, read the same way (mask edges).
    const hipY = (lm[LM.L_HIP].y + lm[LM.R_HIP].y) / 2;
    const hipEdge = maskEdgeWidthAtY(mask.data, mask.width, mask.height, hipY);
    const hipDepthPx = hipEdge ? hipEdge.widthMaskPx * (w / mask.width) : null;
    return {
      torsoDepthPx,
      hipDepthPx,
      pixelHeightPx,
      depthRatio: pixelHeightPx ? torsoDepthPx / pixelHeightPx : 0,
      hipDepthRatio: pixelHeightPx && hipDepthPx ? hipDepthPx / pixelHeightPx : 0,
      depthCalibrated: true,
    };
  }
  const shoulderMidX = (lm[LM.L_SHOULDER].x + lm[LM.R_SHOULDER].x) / 2;
  const hipMidX = (lm[LM.L_HIP].x + lm[LM.R_HIP].x) / 2;
  const torsoDepthProxyPx = Math.abs(shoulderMidX - hipMidX) * w; // noisy hint only
  return { torsoDepthProxyPx, pixelHeightPx, depthCalibrated: false };
}

// Ramanujan's ellipse-perimeter approximation. We model the chest cross-section
// as an ellipse with half-width a (FRONT) and half-depth b (SIDE) — the standard
// way to estimate a girth from two orthogonal widths. Returns pixels.
export function ellipsePerimeterPx(a, b) {
  const t = ((a - b) ** 2) / ((a + b) ** 2);
  return Math.PI * (a + b) * (1 + (3 * t) / (10 + Math.sqrt(4 - 3 * t)));
}

// Combine front width + side depth into a scale-independent chest-girth signal.
// This is the measurement the two-angle capture unlocks that a single front
// photo physically cannot produce.
export function chestGirthProxy(front, side) {
  if (!front || !side || !side.torsoDepthPx) return null;
  const a = front.shoulderWidthPx / 2; // front half-width (shoulder as chest proxy)
  const b = side.torsoDepthPx / 2;     // side half-depth
  const girthPx = ellipsePerimeterPx(a, b);
  return {
    girthPx,
    chestGirthRatio: front.pixelHeightPx ? girthPx / front.pixelHeightPx : 0,
  };
}

// FRONT alignment. Every tolerance is in normalized 0..1 space. A pose is only
// accepted when all checks pass; `reasons` explains any failure for the debug UI.
export function checkFrontAlignment(lm) {
  const noseY = lm[LM.NOSE].y;
  const centerX = (lm[LM.L_SHOULDER].x + lm[LM.R_SHOULDER].x) / 2;
  const shoulderSpan = Math.abs(lm[LM.L_SHOULDER].x - lm[LM.R_SHOULDER].x);
  const wristSpan = Math.abs(lm[LM.L_WRIST].x - lm[LM.R_WRIST].x);
  const minVis = Math.min(
    ...[LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP, LM.L_ANKLE, LM.R_ANKLE]
      .map((i) => vis(lm, i)),
  );

  const checks = {
    headInFrame: noseY > 0.06 && noseY < 0.20,
    feetInFrame: bottomY(lm) > 0.85,
    centered: Math.abs(centerX - 0.5) < 0.12,
    armsOut: wristSpan > shoulderSpan * 1.15, // hands wider than shoulders => armpits visible
    confident: minVis > 0.6,
  };
  const reasons = [];
  if (!checks.headInFrame) reasons.push('Move your head into the top circle');
  if (!checks.feetInFrame) reasons.push('Step back — feet must be in frame');
  if (!checks.centered) reasons.push('Center yourself left-to-right');
  if (!checks.armsOut) reasons.push('Raise arms slightly away from your body');
  if (!checks.confident) reasons.push('Improve lighting / face the camera');

  return { aligned: Object.values(checks).every(Boolean), checks, reasons };
}

// SIDE alignment. Hardest case — we detect "profile-ish" by the shoulders and
// hips collapsing horizontally (front-back aligned => tiny x-gap). Approximate.
export function checkSideAlignment(lm) {
  const noseY = lm[LM.NOSE].y;
  const centerX = (lm[LM.L_SHOULDER].x + lm[LM.R_SHOULDER].x) / 2;
  const shoulderGap = Math.abs(lm[LM.L_SHOULDER].x - lm[LM.R_SHOULDER].x);
  const hipGap = Math.abs(lm[LM.L_HIP].x - lm[LM.R_HIP].x);

  const checks = {
    headInFrame: noseY > 0.06 && noseY < 0.20,
    feetInFrame: bottomY(lm) > 0.85,
    centered: Math.abs(centerX - 0.5) < 0.15,
    profile: shoulderGap < 0.08 && hipGap < 0.08, // stacked => sideways
  };
  const reasons = [];
  if (!checks.headInFrame) reasons.push('Move your head into the top circle');
  if (!checks.feetInFrame) reasons.push('Step back — feet must be in frame');
  if (!checks.centered) reasons.push('Center yourself left-to-right');
  if (!checks.profile) reasons.push('Turn 90° — stand fully sideways to the camera');

  return { aligned: Object.values(checks).every(Boolean), checks, reasons };
}
