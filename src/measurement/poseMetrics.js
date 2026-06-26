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

// FRONT-VIEW measurements (all pixels; the final `ratio` is scale-independent).
export function extractFrontMetrics(lm, w, h) {
  const shoulderWidthPx = distancePx(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER], w, h);
  const hipWidthPx = distancePx(lm[LM.L_HIP], lm[LM.R_HIP], w, h); // weak: drifts inward
  const torsoLengthPx = distancePx(
    mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]),
    mid(lm[LM.L_HIP], lm[LM.R_HIP]),
    w, h,
  );
  const pixelHeightPx = Math.abs(bottomY(lm) - lm[LM.NOSE].y) * h;
  const ratio = pixelHeightPx ? shoulderWidthPx / pixelHeightPx : 0;
  return { shoulderWidthPx, hipWidthPx, torsoLengthPx, pixelHeightPx, ratio };
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
    return {
      torsoDepthPx,
      pixelHeightPx,
      depthRatio: pixelHeightPx ? torsoDepthPx / pixelHeightPx : 0,
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
