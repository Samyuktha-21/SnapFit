// heightEstimator.js — metric height from a single camera using a credit card
// as the scale reference.
//
// ---------------------------------------------------------------------------
// WHY THE OBVIOUS METHOD IS WRONG
//
// The tempting approach is: measure the card's width in pixels, divide 85.6 mm
// by it to get mm-per-pixel, multiply by the head-to-foot pixel span. That is
// what the previous implementation did, and it is biased low by roughly 5%
// (about 9 cm on a 175 cm person) for one unavoidable reason:
//
//   The card is held at the CHEST. The chest surface sits ~125 mm closer to the
//   camera than the body's mid-plane. Under perspective, apparent size scales
//   as 1/depth, so the card is imaged about (1 + 125/d) times larger than
//   anything in the body's own plane. At d = 2.5 m that is +5%, and it lands
//   directly on the answer.
//
// A second, smaller error comes from camera tilt: if the phone is pitched, the
// body's vertical line is no longer fronto-parallel, and a single scalar
// mm-per-pixel does not apply along it.
//
// ---------------------------------------------------------------------------
// WHAT THIS DOES INSTEAD
//
//   1. Detect the card as a QUADRILATERAL with sub-pixel corners.
//   2. Fit the homography from the card's known mm rectangle to those corners.
//   3. Recover the FOCAL LENGTH from that homography (Zhang's constraints) —
//      the card's perspective distortion carries it, no calibration needed.
//   4. Recover the card's full 3D POSE, giving its true distance in mm and the
//      orientation of its plane.
//   5. Define the body's mid-coronal plane as the card plane pushed back by
//      half the subject's chest depth (from an ANSUR II regression, solved
//      self-consistently with the height it is used to compute).
//   6. Back-project the crown and sole image points and INTERSECT them with
//      that plane. This is exact 3D reconstruction, so camera pitch, roll and
//      the depth offset are all handled by construction rather than patched.
//   7. Fuse many frames with a weighted median and MAD outlier rejection.
//
// Every step degrades gracefully: if the card is fronto-parallel the focal
// length is unobservable and we fall back to a lens prior (flagged); if the
// segmentation mask is missing we fall back to landmarks (flagged).
// ---------------------------------------------------------------------------

import { detectCardQuad } from './cardDetect.js';
import {
  homographyFrom4, reprojError, focalFromHomography, poseFromHomography,
  mat3Inv, mat3Apply, dot3, norm3, sub3, scale3, unit3,
} from './linalg.js';

// MediaPipe pose landmark indices used here.
const NOSE = 0, L_SHOULDER = 11, R_SHOULDER = 12, L_HIP = 23, R_HIP = 24;
const L_ANKLE = 27, R_ANKLE = 28, L_FOOT = 31, R_FOOT = 32;

// --- Tunable physical constants ---------------------------------------------
export const CONFIG = {
  // Chest depth from stature, ANSUR II (n=6068), least squares, millimetres.
  // Residual SD ~26 mm, so the half-depth we actually use is good to ~13 mm.
  chestDepth: {
    Male:   { a: 105.821, b: 0.08429 },
    Female: { a:  87.951, b: 0.09792 },
  },
  // The silhouette's top pixel is the top of the HAIR; stature is measured to
  // the skull vertex with hair compressed. A small, honest constant.
  hairAllowanceMm: 8,
  // Set when the subject is wearing shoes; a typical sole adds ~20 mm.
  shoeAllowanceMm: 0,
  // Lens prior used only when the card is too fronto-parallel for its
  // perspective to reveal a focal length. ~65 deg horizontal FOV.
  focalPriorRatio: 0.80,
  // Plausible human range (mm) — anything outside is a detection failure.
  minHeightMm: 1200,
  maxHeightMm: 2250,
  // Rejection gates.
  maxReprojErrorPx: 2.0,
  minCardLongEdgePx: 45,
  maxTiltDeg: 55,
  // Imaged aspect below this means the card is turned too far from the
  // camera for its apparent size to be a trustworthy scale reference.
  // 1.545 / 1.5857 = cos(13 deg), so this bounds the scale error near 1%.
  minCardAspect: 1.545,
  // ...and above this the card is leaned too far to be trusted as flat.
  // 1.5857 / cos(20 deg) = 1.687.
  maxCardAspect: 1.687,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Body-plane normal for a camera pitched by `pitchRad`.
 *
 * A standing person's plane is vertical no matter what, so the only thing that
 * tips it relative to the image is the CAMERA's own pitch. That is worth a real
 * measurement: an 8 degree phone tilt costs about 8 cm of height if ignored.
 *
 * We deliberately do NOT try to read this off the card. The card's recovered
 * normal is both noisy AND biased at the size a card occupies in a full-body
 * shot (a true 18 degree tilt comes back as anything from 14 to 53 degrees, and
 * a flat card reads as ~14 degrees tilted), so averaging it over frames does not
 * converge on the truth — it converges on the bias. The phone's own inclinometer
 * (DeviceOrientationEvent.beta) measures the same quantity properly.
 *
 * Sign convention: positive pitch tips the top of the phone away from the user,
 * matching the test harness's pitchDeg.
 */
export function normalFromCameraPitch(pitchRad) {
  return [0, -Math.sin(pitchRad), Math.cos(pitchRad)];
}

// Half the chest depth == how far the card sits in front of the body mid-plane.
function chestHalfDepthMm(statureMm, sex) {
  const k = CONFIG.chestDepth[sex === 'Male' ? 'Male' : 'Female'];
  return (k.a + k.b * statureMm) / 2;
}

// ---------------------------------------------------------------------------
// Body extent from the segmentation mask.
//
// The mask is a soft confidence field, so we can find where it crosses 0.5 with
// sub-row interpolation instead of snapping to the nearest mask row. That
// matters: a 256-row mask over a 720-row frame quantizes to ~2.8 frame px,
// which is several millimetres of height.
// ---------------------------------------------------------------------------
function bodyExtentFromMask(mask, W, H) {
  const { data, width: mw, height: mh } = mask;
  const rowMax = new Float32Array(mh);
  const rowCx = new Float32Array(mh);
  for (let y = 0; y < mh; y++) {
    let best = 0, sum = 0, sumX = 0;
    const base = y * mw;
    for (let x = 0; x < mw; x++) {
      const v = data[base + x];
      if (v > best) best = v;
      if (v > 0.5) { sum += v; sumX += v * x; }
    }
    rowMax[y] = best;
    rowCx[y] = sum > 0 ? sumX / sum : -1;
  }

  // Topmost and bottommost rows that actually contain body.
  let top = -1, bot = -1;
  for (let y = 0; y < mh; y++) if (rowMax[y] >= 0.5) { top = y; break; }
  for (let y = mh - 1; y >= 0; y--) if (rowMax[y] >= 0.5) { bot = y; break; }
  if (top < 0 || bot < 0 || bot <= top) return null;

  // Sub-row crossing of the 0.5 iso-contour, linearly interpolated.
  const lerpCross = (yIn, yOut) => {
    if (yOut < 0 || yOut >= mh) return yIn;
    const vIn = rowMax[yIn], vOut = rowMax[yOut];
    const den = vIn - vOut;
    if (Math.abs(den) < 1e-6) return yIn;
    const t = clamp((vIn - 0.5) / den, 0, 1);
    return yIn + (yOut - yIn) * t;
  };
  const topSub = lerpCross(top, top - 1);
  const botSub = lerpCross(bot, bot + 1);

  // Guard against a mask clipped by the frame edge — the person is cut off and
  // any height from it would be a silent undercount.
  const clipped = top <= 0 || bot >= mh - 1;

  const sx = W / mw, sy = H / mh;
  const cxTop = rowCx[top] >= 0 ? rowCx[top] : mw / 2;
  const cxBot = rowCx[bot] >= 0 ? rowCx[bot] : mw / 2;
  return {
    crown: [(cxTop + 0.5) * sx, topSub * sy],
    sole: [(cxBot + 0.5) * sx, botSub * sy],
    clipped,
    source: 'mask',
  };
}

// Landmark fallback when no segmentation mask is available. Less accurate:
// MediaPipe has no crown landmark, so the top of the head is extrapolated from
// the nose-to-mouth drop.
function bodyExtentFromLandmarks(lm, W, H) {
  const noseY = lm[NOSE].y * H;
  const mouthY = ((lm[9].y + lm[10].y) / 2) * H;
  const noseToChin = Math.abs(mouthY - noseY) * 2.0;
  const crownY = noseY - noseToChin * 1.15;
  const footVis = (lm[L_FOOT]?.visibility ?? 0) > 0.5 && (lm[R_FOOT]?.visibility ?? 0) > 0.5;
  const bottom = footVis
    ? [(lm[L_FOOT].x + lm[R_FOOT].x) / 2, (lm[L_FOOT].y + lm[R_FOOT].y) / 2]
    : [(lm[L_ANKLE].x + lm[R_ANKLE].x) / 2, (lm[L_ANKLE].y + lm[R_ANKLE].y) / 2];
  return {
    crown: [lm[NOSE].x * W, crownY],
    sole: [bottom[0] * W, bottom[1] * H],
    clipped: false,
    source: 'landmarks',
  };
}

// Chest region where the card is expected. Generous: hands wander.
export function chestRoi(lm, W, H) {
  const cx = ((lm[L_SHOULDER].x + lm[R_SHOULDER].x) / 2) * W;
  const span = Math.abs(lm[L_SHOULDER].x - lm[R_SHOULDER].x) * W;
  const shoulderY = ((lm[L_SHOULDER].y + lm[R_SHOULDER].y) / 2) * H;
  const hipY = ((lm[L_HIP].y + lm[R_HIP].y) / 2) * H;
  const torso = Math.max(1, hipY - shoulderY);
  return {
    x0: cx - span * 1.15,
    x1: cx + span * 1.15,
    y0: shoulderY - torso * 0.10,
    y1: shoulderY + torso * 0.95,
  };
}

// ---------------------------------------------------------------------------
// Core single-frame estimate
// ---------------------------------------------------------------------------

/**
 * The pure geometry: card corners + two body points in, metric height out.
 * Kept free of image processing and MediaPipe so it can be verified directly
 * against synthetic scenes with known ground truth (scripts/test-height.mjs).
 *
 * @param {object} a
 * @param {[number,number][]} a.corners  card corners in image px (TL,TR,BR,BL)
 * @param {[number,number][]} a.model    matching card coords in mm
 * @param {[number,number]} a.crown      top-of-head image point
 * @param {[number,number]} a.sole       bottom-of-foot image point
 * @param {number} a.W @param {number} a.H
 * @param {number} [a.longEdgePx] @param {number} [a.rectangularity]
 * @param {number} [a.edgeSupport]
 * @param {'Male'|'Female'} [a.sex] @param {boolean} [a.shoes]
 */
export function solveGeometry(a) {
  const {
    corners, model, crown, sole, W, H,
    rectangularity = 1, edgeSupport = 1,
  } = a;
  const sex = a.sex === 'Male' ? 'Male' : 'Female';
  const shoeMm = a.shoes ? 20 : CONFIG.shoeAllowanceMm;
  const debug = {};
  const longEdgePx = a.longEdgePx
    ?? Math.max(Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]),
                Math.hypot(corners[2][0] - corners[1][0], corners[2][1] - corners[1][1]));

  // --- 2. Homography, card mm -> image px ----------------------------------
  const Hm = homographyFrom4(model, corners);
  if (!Hm) return { ok: false, reason: 'homography-failed', debug };
  const rms = reprojError(Hm, model, corners);
  debug.reprojPx = rms;
  if (!(rms < CONFIG.maxReprojErrorPx)) return { ok: false, reason: 'bad-homography', debug };

  // --- 3. Focal length from the card's own perspective ----------------------
  //
  // The focal length lives entirely in the card's perspective distortion, so
  // how well we can see it depends on how much the card is TILTED. A card held
  // flat to the camera carries no focal information at all, and pushing noisy
  // corners through the closed form there produces a confident-looking number
  // that can be off by a factor of three.
  //
  // So we shrink toward a lens prior, with the weight set by how observable the
  // quantity actually is: the card's foreshortening (how far its imaged aspect
  // has fallen below the true 1.586) and how well the two independent
  // constraints agree with each other. This is the difference between the
  // estimator degrading gracefully and it going haywire on a small card.
  const cx = W / 2, cy = H / 2;
  const fEst = focalFromHomography(Hm, cx, cy);
  const fPrior = CONFIG.focalPriorRatio * Math.max(W, H);
  const M = Math.max(W, H);

  const sideLen = (i, j) => Math.hypot(corners[j][0] - corners[i][0], corners[j][1] - corners[i][1]);
  const eH = (sideLen(0, 1) + sideLen(3, 2)) / 2;
  const eV = (sideLen(1, 2) + sideLen(0, 3)) / 2;
  const aspectObs = Math.max(eH, eV) / Math.max(1e-6, Math.min(eH, eV));
  // Foreshortening angle implied by the imaged aspect: a proxy for tilt that
  // does not itself depend on knowing f.
  const tiltProxyDeg = Math.acos(clamp(aspectObs / 1.5857, 0, 1)) * 180 / Math.PI;

  let f, focalSource;
  const usable = fEst.f && isFinite(fEst.f) && fEst.f > 0.35 * M && fEst.f < 3.0 * M;
  if (!usable) {
    f = fPrior; focalSource = 'prior';
  } else {
    const observability = clamp((tiltProxyDeg - 5) / 12, 0, 1);
    const wH = observability * clamp(fEst.agreement, 0, 1);
    f = wH * fEst.f + (1 - wH) * fPrior;
    focalSource = wH > 0.6 ? 'homography' : (wH < 0.15 ? 'prior' : 'blended');
    debug.focalWeight = wH;
  }
  debug.focal = {
    f, prior: fPrior, source: focalSource, raw: fEst.f,
    agreement: fEst.agreement, tiltProxyDeg, candidates: fEst.candidates,
  };

  const K = new Float64Array([f, 0, cx, 0, f, cy, 0, 0, 1]);
  const Ki = mat3Inv(K);

  // --- 4. Card pose in 3D ---------------------------------------------------
  const pose = poseFromHomography(Hm, K);
  if (!pose || !isFinite(pose.distance) || pose.distance <= 0) {
    return { ok: false, reason: 'pose-failed', debug };
  }
  // Plane normal, forced to point AWAY from the camera so that adding a
  // positive offset along it moves us back into the body.
  const nCard = pose.normal[2] >= 0 ? pose.normal : scale3(pose.normal, -1);
  const tiltDeg = Math.acos(clamp(Math.abs(nCard[2]), 0, 1)) * 180 / Math.PI;
  debug.pose = {
    distanceMm: pose.distance, tiltDeg,
    orthoResidual: pose.orthoResidual, normal: nCard,
  };
  if (tiltDeg > CONFIG.maxTiltDeg) return { ok: false, reason: 'card-too-tilted', debug };
  // Scale error propagates 1:1 into height, so a foreshortened card is the most
  // expensive thing that can go wrong. Held FLAT against the chest a card images
  // at its true 1.586 aspect; the further below that it falls, the more it is
  // turned away from us and the more our scale under-reads. Reject rather than
  // quietly absorb it — the UI can just ask the user to flatten the card.
  //
  // The gate is deliberately two-sided, and the two sides mean different things:
  //   aspect BELOW 1.586 -> the long edge is foreshortened (card yawed about
  //     the vertical). This corrupts the scale directly, so it must be rejected.
  //   aspect ABOVE 1.586 -> only the short edge is foreshortened (card leaned
  //     about the horizontal). The scale rule already ignores the short edge, so
  //     this is harmless in itself — but a large lean signals a card that is not
  //     flat against the chest, and the dangerous case below hides behind it.
  if (aspectObs < CONFIG.minCardAspect || aspectObs > CONFIG.maxCardAspect) {
    return { ok: false, reason: 'card-not-flat', debug };
  }
  // A full-body shot puts the subject between roughly 1 m and 5 m away.
  if (pose.distance < 400 || pose.distance > 6000) {
    return { ok: false, reason: 'implausible-distance', debug };
  }

  // --- 5. Reconstruct against the body plane, solving for the offset --------
  // The offset depends on the subject's chest depth, which depends on their
  // height, which is what we are computing. Three fixed-point iterations are
  // more than enough: the map is a contraction with a tiny gradient.
  const rayOf = (p) => unit3(mat3Apply(Ki, [p[0], p[1], 1]));
  const rCrown = rayOf(crown);
  const rSole = rayOf(sole);

  // --- Robust distance ------------------------------------------------------
  // The card's pose gives a distance, but on a small card that number inherits
  // all the instability of the recovered tilt (measured: a true 18 deg tilt
  // comes back anywhere from 14 to 53 deg with half-pixel corner noise, and
  // drags the distance 200 mm low with it).
  //
  // Edge LENGTHS are far steadier than the tilt is. Perspective foreshortening
  // can only ever SHRINK an imaged edge, never stretch it, so the axis that
  // looks longest relative to its true size is the least foreshortened one and
  // therefore the best scale estimate available. This needs no angle at all.
  const dimX = Math.hypot(model[1][0] - model[0][0], model[1][1] - model[0][1]);
  const dimY = Math.hypot(model[3][0] - model[0][0], model[3][1] - model[0][1]);
  const pxPerMm = Math.max(eH / dimX, eV / dimY);
  if (!(pxPerMm > 0)) return { ok: false, reason: 'degenerate-scale', debug };
  const dCard = f / pxPerMm;
  if (dCard < 400 || dCard > 6000) return { ok: false, reason: 'implausible-distance', debug };

  // --- Body plane orientation ----------------------------------------------
  // We do NOT simply reuse the card's measured normal. Two reasons:
  //   1. On a small card it is too noisy to be worth anything (above).
  //   2. It is confounded even when clean: a card LEANED in the subject's hand
  //      and a camera PITCHED on its tripod produce the same card normal, but
  //      only the second one tilts the body's plane. The body stays vertical
  //      either way.
  // So the model is a fronto-parallel body plane, nudged toward the measured
  // normal only in proportion to how much we can actually trust it.
  //
  // A caller that has watched many frames can hand us a stabilised normal
  // (see HeightAccumulator.finalize): the per-frame normal is noisy but very
  // nearly unbiased, so its median over ~20 frames is worth far more than any
  // single frame's, and it is the only practical way to see camera pitch.
  let n, normalTrust;
  if (a.normalOverride) {
    n = unit3(a.normalOverride);
    if (n[2] < 0) n = scale3(n, -1);
    normalTrust = 1;
  } else {
    normalTrust = clamp((longEdgePx - 55) / 145, 0, 1)
      * clamp(fEst.agreement, 0, 1)
      * clamp(1 - pose.orthoResidual * 4, 0, 1)
      * 0.7; // capped: card lean can never be fully separated from camera pitch
    n = unit3([
      normalTrust * nCard[0],
      normalTrust * nCard[1],
      (1 - normalTrust) + normalTrust * nCard[2],
    ]);
  }
  debug.normalTrust = normalTrust;

  // Put the card's centre in 3D at the robust distance, and hang the plane off
  // that rather than off the pose translation.
  const cCentre = [(corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
                   (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4];
  const rCentre = rayOf(cCentre);
  const cardCentre3 = scale3(rCentre, dCard / rCentre[2]);
  const nDotT = dot3(n, cardCentre3);

  let statureMm = 1700, halfDepth = 0, pCrown = null, pSole = null;
  for (let iter = 0; iter < 4; iter++) {
    halfDepth = chestHalfDepthMm(statureMm, sex);
    // Body mid-coronal plane: the card plane, pushed back by half a chest.
    const planeD = nDotT + halfDepth;
    // A ray nearly parallel to the body plane gives an intersection that shoots
    // off to infinity. For a person framed head-to-toe these dot products sit
    // near 1; anything below 0.3 means the recovered plane is nonsense.
    const sc = dot3(n, rCrown), ss = dot3(n, rSole);
    if (Math.abs(sc) < 0.3 || Math.abs(ss) < 0.3) {
      return { ok: false, reason: 'degenerate-rays', debug };
    }
    pCrown = scale3(rCrown, planeD / sc);
    pSole = scale3(rSole, planeD / ss);
    if (pCrown[2] <= 0 || pSole[2] <= 0) return { ok: false, reason: 'behind-camera', debug };
    statureMm = norm3(sub3(pCrown, pSole));
  }

  // Cross-check against the world vertical implied by the card's own upright
  // orientation. A large disagreement means the subject is leaning, or the card
  // was held at an angle — either way the number is less trustworthy.
  const gUp = unit3(pose.yAxis);
  const verticalMm = Math.abs(dot3(sub3(pCrown, pSole), gUp));
  const leanRatio = statureMm > 0 ? verticalMm / statureMm : 0;

  const rawMm = statureMm;
  const correctedMm = rawMm - CONFIG.hairAllowanceMm - shoeMm;

  debug.reconstruction = {
    halfDepthMm: halfDepth,
    bodyDistanceMm: dCard + halfDepth,
    cardDistanceMm: dCard,
    rawMm, correctedMm, verticalMm, leanRatio,
  };

  if (correctedMm < CONFIG.minHeightMm || correctedMm > CONFIG.maxHeightMm) {
    return { ok: false, reason: 'out-of-range', heightCm: correctedMm / 10, debug };
  }

  // --- 7. Honest uncertainty ------------------------------------------------
  // Three dominant, roughly independent error sources, combined in quadrature.
  const dBody = dCard + halfDepth;
  // (a) Card corner localisation: ~0.3 px sub-pixel, over the long edge.
  const relScale = 0.3 / longEdgePx;
  // (b) Chest-depth spread in the population (ANSUR residual SD / 2).
  const relOffset = 13 / dBody;
  // (c) Focal length error, which only reaches the answer through the offset
  //     ratio — a good reason this method is forgiving about lens calibration.
  const fRelErr = focalSource === 'homography' ? 0.05 : (focalSource === 'blended' ? 0.10 : 0.15);
  const relF = fRelErr * (halfDepth / dBody);
  // (d) Residual foreshortening. max(eH/dimX, eV/dimY) removes rotation about a
  //     single axis exactly, but a card that is BOTH yawed and leaned by
  //     similar amounts shrinks both edges together and leaves the imaged
  //     aspect looking perfectly normal. At this card size the keystoning that
  //     would reveal it is sub-pixel, so it is genuinely unobservable — the
  //     honest response is to carry it as uncertainty rather than pretend to
  //     have corrected it. Bounded by the aspect gate at roughly 1%.
  const relForeshorten = 0.010;
  const sigmaMm = correctedMm * Math.sqrt(relScale ** 2 + relOffset ** 2 + relF ** 2 + relForeshorten ** 2);

  // Confidence blends detection quality with geometric conditioning.
  const qReproj = clamp(1 - rms / CONFIG.maxReprojErrorPx, 0, 1);
  const qSize = clamp(longEdgePx / 140, 0.2, 1);
  const qShape = clamp(rectangularity, 0, 1);
  const qEdge = clamp(edgeSupport, 0, 1);
  const qFocal = focalSource === 'homography' ? clamp(fEst.agreement, 0.3, 1)
    : (focalSource === 'blended' ? 0.6 : 0.45);
  const qLean = clamp(1 - (1 - leanRatio) * 6, 0, 1);
  const confidence = clamp(
    0.26 * qReproj + 0.20 * qSize + 0.16 * qShape + 0.14 * qEdge + 0.14 * qFocal + 0.10 * qLean,
    0, 1,
  );
  debug.quality = { qReproj, qSize, qShape, qEdge, qFocal, qLean, sigmaMm };

  return {
    ok: true,
    cardNormal: nCard,
    heightCm: correctedMm / 10,
    sigmaCm: sigmaMm / 10,
    confidence,
    distanceMm: dBody,
    debug,
  };
}

/**
 * One captured frame -> one height estimate. Finds the card and the body's
 * silhouette extent, then hands both to solveGeometry.
 *
 * @param {Uint8ClampedArray} data  full-frame RGBA
 * @param {number} W @param {number} H
 * @param {Array} lm  MediaPipe normalized landmarks
 * @param {{data:Float32Array,width:number,height:number}|null} mask
 * @param {{sex?:'Male'|'Female', shoes?:boolean}} opts
 */
export function estimateHeightFrame(data, W, H, lm, mask, opts = {}) {
  const roi = chestRoi(lm, W, H);
  const card = detectCardQuad(data, W, H, roi);
  if (!card) return { ok: false, reason: 'no-card', debug: { roi } };
  if (card.longEdgePx < CONFIG.minCardLongEdgePx) {
    return { ok: false, reason: 'card-too-small', debug: { roi, card } };
  }

  const extent = (mask && mask.data ? bodyExtentFromMask(mask, W, H) : null)
    || bodyExtentFromLandmarks(lm, W, H);
  if (extent.clipped) return { ok: false, reason: 'body-clipped', debug: { roi, card, extent } };

  // Keep the solver's inputs alongside the answer. HeightAccumulator stores
  // them so a whole capture can be re-solved later against a measured camera
  // pitch, without holding on to any video frames.
  const frame = {
    corners: card.corners,
    model: card.model,
    crown: extent.crown,
    sole: extent.sole,
    longEdgePx: card.longEdgePx,
    rectangularity: card.rectangularity,
    edgeSupport: card.edgeSupport,
    W, H, sex: opts.sex, shoes: opts.shoes,
  };
  const out = solveGeometry(frame);
  out.frame = frame;
  out.debug = { ...out.debug, roi, card, extent };
  // A landmark-derived crown is a guess, not a measurement. Say so in the
  // confidence rather than letting it look as solid as a mask-derived one.
  if (out.ok && extent.source === 'landmarks') {
    out.confidence *= 0.6;
    out.sigmaCm = Math.sqrt(out.sigmaCm ** 2 + 1.8 ** 2);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Temporal fusion
//
// One frame is never the answer. Hands shake, autofocus breathes, and the card
// detector occasionally latches onto a sleeve. We collect estimates over a
// short window, throw out anything more than 2.5 MADs from the median, and
// return a confidence-weighted median of what survives. The median (not the
// mean) is the point: a single bad detection cannot drag it.
// ---------------------------------------------------------------------------
export class HeightAccumulator {
  constructor({ minSamples = 6, maxSamples = 40, madK = 2.5 } = {}) {
    this.minSamples = minSamples;
    this.maxSamples = maxSamples;
    this.madK = madK;
    this.samples = [];
    this.rejected = 0;
  }

  reset() { this.samples = []; this.rejected = 0; }

  /**
   * @param est   the result of estimateHeightFrame / solveGeometry
   * @param frame the inputs that produced it, kept so finalize() can re-solve
   *              them once the camera's orientation is better known
   */
  add(est, frame = null) {
    if (!est || !est.ok) { this.rejected++; return; }
    this.samples.push({
      h: est.heightCm,
      w: Math.max(0.05, est.confidence),
      sigma: est.sigmaCm,
      normal: est.cardNormal || null,
      frame,
    });
    if (this.samples.length > this.maxSamples) this.samples.shift();
  }

  get count() { return this.samples.length; }
  get ready() { return this.samples.length >= this.minSamples; }

  // Weighted median + MAD rejection over an explicit list of samples.
  _fuse(list, total) {
    const n = list.length;
    if (!n) return null;
    const hs = list.map((s) => s.h).sort((x, y) => x - y);
    const median = hs[n >> 1];
    const devs = hs.map((h) => Math.abs(h - median)).sort((x, y) => x - y);
    // 1.4826 rescales the MAD to be comparable to a standard deviation.
    const mad = Math.max(0.35, devs[n >> 1] * 1.4826);

    const kept = list.filter((s) => Math.abs(s.h - median) <= this.madK * mad);
    if (!kept.length) return null;

    kept.sort((x, y) => x.h - y.h);
    const wTotal = kept.reduce((acc, s) => acc + s.w, 0);
    let acc = 0, wMedian = kept[kept.length - 1].h;
    for (const s of kept) { acc += s.w; if (acc >= wTotal / 2) { wMedian = s.h; break; } }

    // The spread of the survivors is a direct, empirical read on stability.
    // Combine it with the per-frame model uncertainty rather than trusting
    // either one alone.
    const mean = kept.reduce((a2, s) => a2 + s.h, 0) / kept.length;
    const spread = Math.sqrt(kept.reduce((a2, s) => a2 + (s.h - mean) ** 2, 0) / kept.length);
    const modelSigma = kept.reduce((a2, s) => a2 + s.sigma, 0) / kept.length;
    const sigmaCm = Math.sqrt(modelSigma ** 2 + (spread / Math.sqrt(kept.length)) ** 2);

    const agreement = clamp(1 - spread / 4, 0, 1);
    const meanConf = kept.reduce((a2, s) => a2 + s.w, 0) / kept.length;
    const confidence = clamp(
      meanConf * (0.55 + 0.45 * agreement) * clamp(kept.length / this.minSamples, 0, 1), 0, 1);

    return {
      heightCm: wMedian, sigmaCm, confidence,
      nUsed: kept.length, nTotal: total, spreadCm: spread, kept,
    };
  }

  /** Live estimate, good enough to display while the user is still holding still. */
  result() {
    if (this.samples.length < this.minSamples) return null;
    const r = this._fuse(this.samples, this.samples.length + this.rejected);
    if (r) delete r.kept;
    return r;
  }

  /**
   * Final estimate. Does one extra thing the live path cannot:
   *
   * A single frame cannot tell us how the camera is PITCHED — the card's
   * recovered normal is far too noisy on a card only ~40 px across, which is
   * why the live path mostly assumes a fronto-parallel body plane. But that
   * noise is close to unbiased, so the MEDIAN normal over a whole capture is a
   * genuinely useful measurement of the camera's orientation. We take it, then
   * re-solve every stored frame with that stabilised plane before fusing.
   *
   * On a tripod-level camera this changes almost nothing; on a phone propped at
   * an angle it removes several centimetres of bias.
   */
  /**
   * Final estimate.
   *
   * Pass `normalOverride` (see normalFromCameraPitch) when the device's
   * inclinometer is available: every stored frame is then re-solved against a
   * correctly-tilted body plane before fusing, which is worth several
   * centimetres on a phone propped at an angle. Without it this is just the
   * robust fuse, and the un-measured pitch is carried as uncertainty instead.
   */
  finalize({ normalOverride = null } = {}) {
    const total = this.samples.length + this.rejected;
    const first = this._fuse(this.samples, total);
    if (!first) return null;

    if (!normalOverride) {
      delete first.kept;
      return { ...first, pitchCorrected: false };
    }

    const resolved = [];
    for (const s of first.kept) {
      if (!s.frame) continue;
      const r = solveGeometry({ ...s.frame, normalOverride });
      if (r.ok) resolved.push({ h: r.heightCm, w: Math.max(0.05, r.confidence), sigma: r.sigmaCm });
    }
    delete first.kept;
    if (resolved.length < Math.max(4, this.minSamples - 2)) {
      return { ...first, pitchCorrected: false };
    }
    const second = this._fuse(resolved, total);
    if (!second) return { ...first, pitchCorrected: false };
    delete second.kept;
    return { ...second, pitchCorrected: true };
  }
}
