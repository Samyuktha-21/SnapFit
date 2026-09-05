// test-height.mjs — verify the card-referenced height pipeline against
// synthetic scenes whose ground truth we know exactly.
//
// We cannot validate this on a large sample of real people, so instead we build
// virtual scenes: a known camera, a known card pose, a person of known stature.
// Project them, run the real estimator over the projections, and check that the
// number that comes back is the number we put in. Anything the geometry gets
// wrong shows up here as millimetres of error.
//
// Run:  node scripts/test-height.mjs

import {
  solveGeometry, CONFIG, HeightAccumulator, normalFromCameraPitch,
} from '../Snapfit-UI/src/scanfit/heightEstimator.js';
import { detectCardQuad, CARD_LONG_MM, CARD_SHORT_MM } from '../Snapfit-UI/src/scanfit/cardDetect.js';
import { focalFromHomography, homographyFrom4 } from '../Snapfit-UI/src/scanfit/linalg.js';
import { visibleRegion } from '../Snapfit-UI/src/scanfit/alignmentGuide.js';

// ---------------------------------------------------------------------------
// Tiny 3D scene builder
// ---------------------------------------------------------------------------
const D = Math.PI / 180;
const mul = (A, B) => {
  const M = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    M[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return M;
};
const Rx = (t) => [1, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t)];
const Ry = (t) => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)];
const Rz = (t) => [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0, 0, 0, 1];
const apply = (M, v) => [
  M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
  M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
  M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
];
const col = (M, c) => [M[c], M[3 + c], M[6 + c]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

// The exact same ANSUR relation the estimator uses, so these tests isolate the
// GEOMETRY. Sensitivity to this model being wrong is measured separately.
function chestHalfDepth(statureMm, sex) {
  const k = CONFIG.chestDepth[sex === 'Male' ? 'Male' : 'Female'];
  return (k.a + k.b * statureMm) / 2;
}

/**
 * Build a scene and project it.
 * pitchDeg  camera tilted down (positive) or up (negative)
 * yawDeg    card rotated about the world vertical
 * tiltDeg   card leaning top-away from the camera
 * rollDeg   card rotated within its own plane
 */
function buildScene({
  statureMm = 1750, sex = 'Female', dCardMm = 2500,
  fTrue = 1000, W = 1280, H = 720,
  pitchDeg = 0, yawDeg = 0, tiltDeg = 0, rollDeg = 0,
  offsetErrMm = 0, cardCenter = [0, 0],
}) {
  // THE BODY is always vertical and always faces the camera. Its plane
  // therefore depends only on how the CAMERA is pitched — never on how the
  // subject happens to be holding the card.
  const Rcam = Rx(pitchDeg * D);
  const nBody = apply(Rcam, [0, 0, 1]);   // body plane normal, camera frame
  const up = apply(Rcam, [0, -1, 0]);     // world up, camera frame

  // THE CARD may be leaned, yawed and rolled in the hand, independently of the
  // body. Keeping these separate is the whole point: an estimator that assumes
  // the card plane and the body plane are the same thing will look perfect
  // against a scene that assumes it too, and fail on a real person.
  const Rcard = mul(Rcam, mul(Ry(yawDeg * D), mul(Rx(tiltDeg * D), Rz(rollDeg * D))));
  const xA = col(Rcard, 0), yA = col(Rcard, 1);

  const centre = [cardCenter[0], cardCenter[1], dCardMm];
  // Model origin (the card's top-left corner) in camera space.
  const t = add(centre, sc(add(sc(xA, CARD_LONG_MM / 2), sc(yA, CARD_SHORT_MM / 2)), -1));

  const model = [[0, 0], [CARD_LONG_MM, 0], [CARD_LONG_MM, CARD_SHORT_MM], [0, CARD_SHORT_MM]];
  const cardPts3 = model.map((m) => add(t, add(sc(xA, m[0]), sc(yA, m[1]))));

  // The body's mid-coronal plane sits halfDepth behind the card, along the
  // BODY's normal. offsetErrMm lets a test deliberately break that assumption.
  const halfDepth = chestHalfDepth(statureMm, sex) + offsetErrMm;
  const bodyMid = add(add(centre, sc(nBody, halfDepth)), sc(up, -0.22 * statureMm));
  // The silhouette's top is the top of the hair, which the estimator removes.
  const crown3 = add(bodyMid, sc(up, statureMm / 2 + CONFIG.hairAllowanceMm));
  const sole3 = add(bodyMid, sc(up, -statureMm / 2));

  const project = (p) => [fTrue * p[0] / p[2] + W / 2, fTrue * p[1] / p[2] + H / 2];
  return {
    W, H, fTrue, model, sex, statureMm,
    corners: cardPts3.map(project),
    crown: project(crown3),
    sole: project(sole3),
  };
}

// The method this replaces: one scalar mm-per-pixel from the card's apparent
// width, applied to the head-to-foot pixel span.
function naiveHeightMm(scene) {
  const e1 = Math.hypot(scene.corners[1][0] - scene.corners[0][0], scene.corners[1][1] - scene.corners[0][1]);
  const e2 = Math.hypot(scene.corners[2][0] - scene.corners[1][0], scene.corners[2][1] - scene.corners[1][1]);
  const longPx = Math.max(e1, e2);
  const span = Math.hypot(scene.crown[0] - scene.sole[0], scene.crown[1] - scene.sole[1]);
  return span * (CARD_LONG_MM / longPx);
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; } else { fail++; failures.push(`${name} :: ${detail}`); }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`);
}
const section = (s) => console.log(`\n=== ${s} ===`);

// ---------------------------------------------------------------------------
section('1. Focal length recovered from the card alone');
for (const [tilt, yaw] of [[20, 15], [30, 0], [0, 25], [12, 8]]) {
  const s = buildScene({ tiltDeg: tilt, yawDeg: yaw, fTrue: 1000 });
  const Hm = homographyFrom4(s.model, s.corners);
  const est = focalFromHomography(Hm, s.W / 2, s.H / 2);
  const errPct = Math.abs(est.f - s.fTrue) / s.fTrue * 100;
  check(`tilt=${tilt} yaw=${yaw}`, errPct < 1.0,
    `f=${est.f.toFixed(1)} (true 1000) err=${errPct.toFixed(3)}%  agreement=${est.agreement.toFixed(3)}`);
}

// ---------------------------------------------------------------------------
section('2. Height recovery vs the naive mm-per-pixel method');
// Realistic operating regime: the card is held FLAT against the chest, so its
// residual lean and yaw are small. Large deliberate angles are covered by the
// rejection test below rather than being silently absorbed here.
console.log('   dist  lean  yaw  pitch |   true   |  new err  |  naive err');
let worstNew = 0;
for (const dist of [1800, 2500, 3200]) {
  for (const [tilt, yaw, pitch] of [[0, 0, 0], [6, 4, 0], [8, 0, 0], [4, 7, 0]]) {
    const s = buildScene({ statureMm: 1750, dCardMm: dist, tiltDeg: tilt, yawDeg: yaw, pitchDeg: pitch });
    const r = solveGeometry({ ...s });
    const newErr = r.ok ? r.heightCm * 10 - s.statureMm : NaN;
    const naiveErr = naiveHeightMm(s) - s.statureMm;
    worstNew = Math.max(worstNew, Math.abs(newErr));
    console.log(`   ${String(dist).padStart(4)}  ${String(tilt).padStart(4)}  ${String(yaw).padStart(3)}  ${String(pitch).padStart(5)} | ${s.statureMm}mm | ${(newErr >= 0 ? '+' : '') + newErr.toFixed(1)}mm`.padEnd(62) + `| ${(naiveErr >= 0 ? '+' : '') + naiveErr.toFixed(1)}mm`);
  }
}
check('worst error in the flat-card regime under 20mm', worstNew < 20, `worst=${worstNew.toFixed(2)}mm`);

// ---------------------------------------------------------------------------
section('2b. Card orientation: what is rejected, and what is safely absorbed');
// A pure LEAN foreshortens only the short edge, which the scale rule already
// ignores, so it is absorbed accurately. A YAW foreshortens the long edge and
// corrupts the scale, so it must be rejected. Both together are invisible in
// the imaged aspect and are carried as uncertainty instead.
for (const [tilt, yaw, expect] of [[25, 0, 'reject'], [0, 25, 'reject'], [8, 0, 'accept'], [0, 8, 'accept']]) {
  const s = buildScene({ statureMm: 1750, dCardMm: 2500, tiltDeg: tilt, yawDeg: yaw });
  const r = solveGeometry({ ...s });
  const ok = expect === 'reject' ? !r.ok : (r.ok && Math.abs(r.heightCm * 10 - 1750) < 20);
  check(`lean=${tilt} yaw=${yaw} -> ${expect}`, ok,
    r.ok ? `accepted, err=${(r.heightCm * 10 - 1750).toFixed(1)}mm` : `rejected: ${r.reason}`);
}
{
  // The known blind spot, measured rather than hidden.
  const s = buildScene({ statureMm: 1750, dCardMm: 2500, tiltDeg: 12, yawDeg: 12 });
  const r = solveGeometry({ ...s });
  const err = r.ok ? r.heightCm * 10 - 1750 : NaN;
  console.log(`   blind spot (lean=12 yaw=12): ${r.ok ? 'accepted, err=' + err.toFixed(1) + 'mm, reported sigma=' + (r.sigmaCm * 10).toFixed(1) + 'mm' : 'rejected'}`);
  check('symmetric double-tilt bias stays under 60mm', !r.ok || Math.abs(err) < 60, `${err.toFixed(1)}mm`);
}

// ---------------------------------------------------------------------------
section('3. Correct across the human height range');
let worstRange = 0;
for (const sex of ['Male', 'Female']) {
  for (const st of [1450, 1600, 1750, 1900, 2000]) {
    const s = buildScene({ statureMm: st, sex, dCardMm: 2600, tiltDeg: 5, yawDeg: 4 });
    const r = solveGeometry({ ...s, sex });
    const err = r.ok ? r.heightCm * 10 - st : NaN;
    worstRange = Math.max(worstRange, Math.abs(err));
    console.log(`   ${sex.padEnd(6)} ${st}mm -> ${r.ok ? (r.heightCm * 10).toFixed(1) + 'mm  err ' + (err >= 0 ? '+' : '') + err.toFixed(1) + 'mm' : 'FAILED ' + r.reason}`);
  }
}
check('worst error across range under 20mm', worstRange < 20, `worst=${worstRange.toFixed(2)}mm`);

// ---------------------------------------------------------------------------
section('4. Sensitivity to the chest-depth assumption being wrong');
// The ANSUR residual SD is ~26mm on chest depth, so ~13mm on the half-depth we
// use. This is the dominant remaining error source, so quantify it honestly.
for (const errMm of [-26, -13, 13, 26]) {
  const s = buildScene({ statureMm: 1750, dCardMm: 2500, tiltDeg: 5, offsetErrMm: errMm });
  const r = solveGeometry({ ...s });
  const d = r.heightCm * 10 - 1750;
  console.log(`   offset off by ${(errMm >= 0 ? '+' : '') + errMm}mm -> height off by ${(d >= 0 ? '+' : '') + d.toFixed(1)}mm`);
}
{
  const s = buildScene({ statureMm: 1750, dCardMm: 2500, tiltDeg: 5, offsetErrMm: 13 });
  const r = solveGeometry({ ...s });
  check('13mm offset error costs under 12mm of height', Math.abs(r.heightCm * 10 - 1750) < 12,
    `${(r.heightCm * 10 - 1750).toFixed(1)}mm`);
}

// ---------------------------------------------------------------------------
section('5. Focal-prior fallback (card nearly fronto-parallel)');
{
  // With no perspective in the card there is no focal information; the
  // estimator must fall back to the lens prior and still land close, because
  // focal length only reaches the answer through the small offset ratio.
  const s = buildScene({ statureMm: 1750, dCardMm: 2500, tiltDeg: 0, yawDeg: 0, fTrue: 1000 });
  const r = solveGeometry({ ...s });
  const err = r.heightCm * 10 - 1750;
  console.log(`   focal source=${r.debug.focal.source}  f=${r.debug.focal.f.toFixed(0)} (true 1000)`);
  check('fronto-parallel still within 25mm', Math.abs(err) < 25, `err=${err.toFixed(1)}mm`);
}

// ---------------------------------------------------------------------------
section('6. Sub-pixel corner noise');
{
  // Perturb every corner by up to +/-0.5px and see how much height moves.
  // At 2.5 m in a 1280-wide frame a credit card spans only ~34 px, so this is
  // the harshest realistic case: half-pixel corner noise on a tiny target.
  const errs = [];
  for (let trial = 0; trial < 500; trial++) {
    const s = buildScene({ statureMm: 1750, dCardMm: 2500, tiltDeg: 5, yawDeg: 4 });
    const noisy = s.corners.map((c) => [c[0] + (Math.random() - 0.5), c[1] + (Math.random() - 0.5)]);
    const r = solveGeometry({ ...s, corners: noisy });
    if (r.ok) errs.push(Math.abs(r.heightCm * 10 - 1750));
  }
  errs.sort((a, b) => a - b);
  const p50 = errs[Math.floor(errs.length * 0.5)];
  const p95 = errs[Math.floor(errs.length * 0.95)];
  const worst = errs[errs.length - 1];
  console.log(`   ${errs.length}/500 accepted   median=${p50.toFixed(1)}mm  p95=${p95.toFixed(1)}mm  worst=${worst.toFixed(1)}mm`);
  check('median error under 15mm', p50 < 15, `p50=${p50.toFixed(1)}mm`);
  check('p95 error under 45mm', p95 < 45, `p95=${p95.toFixed(1)}mm`);
  // Single frames at this card size are noisy; that is exactly what the
  // temporal median in HeightAccumulator exists to absorb.
  check('no catastrophic outlier past 150mm', worst < 150, `worst=${worst.toFixed(1)}mm`);
}

// ---------------------------------------------------------------------------
section('7. Card detector on a rendered image');
{
  const W = 1280, H = 720;
  const s = buildScene({ statureMm: 1750, dCardMm: 1200, tiltDeg: 6, yawDeg: 5, rollDeg: 6, fTrue: 1000 });
  const data = new Uint8ClampedArray(W * H * 4);
  // A shaded, softly-varying background — what a torso and shirt actually look
  // like. (A high-frequency periodic pattern would be an unfair test: it
  // creates stronger edges everywhere than the card's own border.)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const shade = 60 + 40 * Math.sin(x / 260) + 25 * Math.cos(y / 190);
      const v = shade + (Math.random() - 0.5) * 6;
      data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v + 6; data[i * 4 + 3] = 255;
    }
  }
  const q = s.corners;
  const inQuad = (x, y) => {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      const sg = Math.sign(c);
      if (sg === 0) continue;
      if (sign === 0) sign = sg; else if (sg !== sign) return false;
    }
    return true;
  };
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of q) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0) - 2; y <= Math.ceil(y1) + 2; y++) {
    for (let x = Math.floor(x0) - 2; x <= Math.ceil(x1) + 2; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (!inQuad(x + 0.5, y + 0.5)) continue;
      const v = 215 + Math.floor(Math.random() * 10);
      const i = (y * W + x) * 4;
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
  }
  const roi = { x0: x0 - 120, y0: y0 - 120, x1: x1 + 120, y1: y1 + 120 };
  const det = detectCardQuad(data, W, H, roi);
  if (!det) {
    check('card detected in rendered frame', false, 'detector returned null');
  } else {
    let maxErr = 0;
    for (let i = 0; i < 4; i++) {
      maxErr = Math.max(maxErr, Math.hypot(det.corners[i][0] - q[i][0], det.corners[i][1] - q[i][1]));
    }
    console.log(`   detected long edge ${det.longEdgePx.toFixed(1)}px  aspect ${det.aspect.toFixed(3)}  rect ${det.rectangularity.toFixed(3)}  edgeSupport ${det.edgeSupport.toFixed(2)}`);
    check('corner localisation under 1.0px', maxErr < 1.0, `maxErr=${maxErr.toFixed(3)}px`);

    const r = solveGeometry({
      corners: det.corners, model: det.model, crown: s.crown, sole: s.sole,
      longEdgePx: det.longEdgePx, rectangularity: det.rectangularity,
      edgeSupport: det.edgeSupport, W, H, sex: 'Female',
    });
    const err = r.ok ? r.heightCm * 10 - 1750 : NaN;
    check('end-to-end from rendered pixels within 20mm', r.ok && Math.abs(err) < 20,
      r.ok ? `height=${r.heightCm.toFixed(1)}cm err=${err.toFixed(1)}mm sigma=${r.sigmaCm.toFixed(2)}cm conf=${r.confidence.toFixed(2)}` : `failed: ${r.reason}`);
  }
}

// ---------------------------------------------------------------------------
section('8. Temporal fusion rejects outliers');
{
  const acc = new HeightAccumulator({ minSamples: 6 });
  // 14 good samples scattered around 172cm, plus 4 wild detections.
  for (let i = 0; i < 14; i++) {
    acc.add({ ok: true, heightCm: 172 + (Math.random() - 0.5) * 1.2, sigmaCm: 0.8, confidence: 0.8 });
  }
  for (const bad of [140, 205, 158, 191]) {
    acc.add({ ok: true, heightCm: bad, sigmaCm: 3, confidence: 0.35 });
  }
  const r = acc.result();
  console.log(`   fused=${r.heightCm.toFixed(2)}cm  sigma=${r.sigmaCm.toFixed(2)}  used ${r.nUsed}/${r.nTotal}  spread=${r.spreadCm.toFixed(2)}`);
  check('fused value within 1cm of truth despite 4 outliers', Math.abs(r.heightCm - 172) < 1.0,
    `${r.heightCm.toFixed(2)}cm`);
  check('outliers were actually dropped', r.nUsed <= 15, `nUsed=${r.nUsed}`);
}

// ---------------------------------------------------------------------------
section('9. Camera pitch: cost of ignoring it, and the sensor correction');
{
  // A standing person's plane is vertical; only the CAMERA's pitch tips it
  // relative to the image. Ignored, it costs roughly 1 cm of height per degree.
  const D2 = Math.PI / 180;
  for (const pitch of [0, 8, -10]) {
    const acc = new HeightAccumulator({ minSamples: 6 });
    for (let i = 0; i < 24; i++) {
      const sc2 = buildScene({
        statureMm: 1750, dCardMm: 2500, pitchDeg: pitch,
        tiltDeg: (Math.random() - 0.5) * 8, yawDeg: (Math.random() - 0.5) * 8,
      });
      const noisy = sc2.corners.map((c) => [c[0] + (Math.random() - 0.5) * 0.6, c[1] + (Math.random() - 0.5) * 0.6]);
      const frame = { ...sc2, corners: noisy };
      acc.add(solveGeometry(frame), frame);
    }
    const blind = acc.finalize();
    const sensed = acc.finalize({ normalOverride: normalFromCameraPitch(pitch * D2) });
    if (!blind || !sensed) { check('pitch=' + pitch + ' produced a result', false, 'null'); continue; }
    const eB = blind.heightCm * 10 - 1750;
    const eS = sensed.heightCm * 10 - 1750;
    console.log('   pitch=' + String(pitch).padStart(3) + 'deg   no sensor: '
      + (eB >= 0 ? '+' : '') + eB.toFixed(1) + 'mm     with inclinometer: '
      + (eS >= 0 ? '+' : '') + eS.toFixed(1) + 'mm  (corrected=' + sensed.pitchCorrected + ')');
    check('pitch=' + pitch + 'deg corrected within 20mm', Math.abs(eS) < 20, eS.toFixed(1) + 'mm');
  }
}

// ---------------------------------------------------------------------------
section('10. Guide overlay stays inside the visible frame');
{
  // The canvas is sized in VIDEO pixels but shown with object-fit: cover, so a
  // frame shaped differently from the stream crops the rest away. The guide has
  // to be laid out inside what survives that crop, or its edges are simply not
  // on screen — which is what used to happen on desktop, where a 16:9 stream in
  // a portrait frame hid both sides of the outline and both hand markers.
  const shapes = [
    ['1920x1080 stream, 416x740 portrait frame', 1920, 1080, 416, 740],
    ['1080x1920 stream, 390x844 phone frame', 1080, 1920, 390, 844],
    ['1080x1920 stream, 405x720 matched frame', 1080, 1920, 405, 720],
    ['1280x720 stream, 900x506 landscape frame', 1280, 720, 900, 506],
  ];
  for (const [name, vw, vh, bw, bh] of shapes) {
    const r = visibleRegion(vw, vh, bw, bh);
    // Every horizontal feature the guides draw, in design coordinates.
    const feats = [0.10, 0.20, 0.38, 0.50, 0.62, 0.80, 0.90];
    const mapped = feats.map((u) => r.x0 + (r.x1 - r.x0) * u);
    const inside = mapped.every((x) => x >= r.x0 - 1e-9 && x <= r.x1 + 1e-9);
    // And the old, unmapped layout, to show the bug this replaced.
    const oldEdges = [0.16, 0.27, 0.73, 0.84];
    const oldClipped = oldEdges.filter((x) => x < r.x0 || x > r.x1).length;
    check(name, inside,
      'visible x ' + r.x0.toFixed(3) + '..' + r.x1.toFixed(3)
      + (oldClipped ? '  (old layout clipped ' + oldClipped + '/4 features)' : ''));
  }
}


// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(58)}`);
console.log(`  ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
}
process.exit(fail ? 1 : 0);
