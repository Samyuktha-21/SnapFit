// cardDetect.js — find a credit card in an image region as a QUADRILATERAL
// with sub-pixel corners.
//
// Why a quad and not a bounding box: a card held by hand is essentially never
// fronto-parallel and never axis-aligned. An axis-aligned bounding box of a
// tilted card is far larger than the card itself, and it throws away the
// perspective information that lets us recover the camera's focal length and
// the card's true distance. The four corners keep all of it.
//
// Pipeline:  ROI grayscale -> blur -> Sobel -> non-max suppression ->
//            hysteresis -> connected components -> convex hull ->
//            max-area quadrilateral -> sub-pixel edge refit
//
// Sub-pixel refinement is what takes corner accuracy from roughly +/-2 px to
// better than +/-0.3 px. Because the card's pixel size sets the scale for the
// whole height measurement, that difference propagates directly into the
// final centimetres.

// ISO/IEC 7810 ID-1 — the physical size of every credit/debit/ID card.
export const CARD_LONG_MM = 85.60;
export const CARD_SHORT_MM = 53.98;
export const CARD_ASPECT = CARD_LONG_MM / CARD_SHORT_MM; // 1.5857

// ---------------------------------------------------------------------------
// Small geometry helpers
// ---------------------------------------------------------------------------
const cross2 = (ox, oy, ax, ay, bx, by) => (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const triArea = (a, b, c) => Math.abs(cross2(a[0], a[1], b[0], b[1], c[0], c[1])) / 2;

// Andrew's monotone chain convex hull. Points are [x, y]; returns CCW hull.
function convexHull(pts) {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross2(lower[lower.length - 2][0], lower[lower.length - 2][1],
      lower[lower.length - 1][0], lower[lower.length - 1][1], q[0], q[1]) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross2(upper[upper.length - 2][0], upper[upper.length - 2][1],
      upper[upper.length - 1][0], upper[upper.length - 1][1], q[0], q[1]) <= 0) upper.pop();
    upper.push(q);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

// Ramer-Douglas-Peucker on a CLOSED polygon, to keep the max-area quad search
// cheap. A convex hull traced from noisy edge pixels can carry a hundred
// near-collinear vertices; none of them add information.
function simplifyClosed(poly, eps) {
  if (poly.length <= 8) return poly;
  const keep = new Uint8Array(poly.length);
  keep[0] = 1;
  const stack = [[0, poly.length - 1]];
  keep[poly.length - 1] = 1;
  while (stack.length) {
    const seg = stack.pop();
    const i0 = seg[0], i1 = seg[1];
    if (i1 <= i0 + 1) continue;
    const a = poly[i0], b = poly[i1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    let bestD = -1, bestI = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const d = Math.abs((poly[i][0] - a[0]) * dy - (poly[i][1] - a[1]) * dx) / len;
      if (d > bestD) { bestD = d; bestI = i; }
    }
    if (bestD > eps && bestI > 0) {
      keep[bestI] = 1;
      stack.push([i0, bestI], [bestI, i1]);
    }
  }
  const out = [];
  for (let i = 0; i < poly.length; i++) if (keep[i]) out.push(poly[i]);
  return out.length >= 4 ? out : poly;
}

// Largest-area quadrilateral whose vertices are hull vertices. On a convex
// polygon this is the standard way to recover the "true" corners even when the
// detected outline is rounded or partially broken.
function maxAreaQuad(hull) {
  const m = hull.length;
  if (m < 4) return null;
  if (m === 4) return hull.slice();
  let best = null, bestArea = -1;
  for (let i = 0; i < m; i++) {
    for (let k = i + 2; k < m; k++) {
      // Diagonal i..k splits the polygon; pick the best apex on each side.
      let jBest = -1, jArea = -1;
      for (let j = i + 1; j < k; j++) {
        const a = triArea(hull[i], hull[j], hull[k]);
        if (a > jArea) { jArea = a; jBest = j; }
      }
      let lBest = -1, lArea = -1;
      for (let l = k + 1; l < m + i; l++) {
        const a = triArea(hull[k], hull[l % m], hull[i]);
        if (a > lArea) { lArea = a; lBest = l % m; }
      }
      if (jBest < 0 || lBest < 0) continue;
      const area = jArea + lArea;
      if (area > bestArea) { bestArea = area; best = [hull[i], hull[jBest], hull[k], hull[lBest]]; }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Image stage: grayscale, blur, Sobel, NMS, hysteresis
// ---------------------------------------------------------------------------

// Pull a (possibly decimated) grayscale patch out of an RGBA frame buffer.
function grayPatch(data, W, roi, step) {
  const pw = Math.floor((roi.x1 - roi.x0) / step);
  const ph = Math.floor((roi.y1 - roi.y0) / step);
  const g = new Float32Array(pw * ph);
  for (let y = 0; y < ph; y++) {
    const sy = roi.y0 + y * step;
    for (let x = 0; x < pw; x++) {
      const i = (sy * W + (roi.x0 + x * step)) * 4;
      g[y * pw + x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  return { g, pw, ph };
}

// Separable 5-tap Gaussian (sigma ~1.0). Suppresses sensor noise and card
// print/hologram texture that would otherwise fragment the border edge.
function blur5(src, w, h) {
  const k = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let t = -2; t <= 2; t++) {
        const xx = Math.min(w - 1, Math.max(0, x + t));
        s += src[y * w + xx] * k[t + 2];
      }
      tmp[y * w + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let t = -2; t <= 2; t++) {
        const yy = Math.min(h - 1, Math.max(0, y + t));
        s += tmp[yy * w + x] * k[t + 2];
      }
      out[y * w + x] = s;
    }
  }
  return out;
}

function sobel(g, w, h) {
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = g[i - w - 1], b = g[i - w], c = g[i - w + 1];
      const d = g[i - 1], f = g[i + 1];
      const p = g[i + w - 1], q = g[i + w], r = g[i + w + 1];
      const sx = (c + 2 * f + r) - (a + 2 * d + p);
      const sy = (p + 2 * q + r) - (a + 2 * b + c);
      gx[i] = sx; gy[i] = sy;
      mag[i] = Math.hypot(sx, sy);
    }
  }
  return { gx, gy, mag };
}

// Percentile of a Float32Array via a coarse histogram — much cheaper than a
// full sort and plenty accurate for choosing an edge threshold.
function percentile(arr, p) {
  let max = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
  if (max <= 0) return 0;
  const BINS = 256;
  const hist = new Int32Array(BINS);
  for (let i = 0; i < arr.length; i++) hist[Math.min(BINS - 1, (arr[i] / max * (BINS - 1)) | 0)]++;
  const target = arr.length * p;
  let acc = 0;
  for (let b = 0; b < BINS; b++) {
    acc += hist[b];
    if (acc >= target) return (b / (BINS - 1)) * max;
  }
  return max;
}

// Canny-style non-maximum suppression + hysteresis, producing a thin edge mask.
function edgeMask(gx, gy, mag, w, h, hiP, loP) {
  // Threshold by BOTH a high percentile and a fraction of the strongest
  // gradient in the region, taking whichever is stricter.
  //
  // A percentile alone fails badly here: the card's border is only a few
  // hundred pixels out of a ~90k-pixel search region, so even the 94th
  // percentile sits far below the card's own edge strength and admits
  // thousands of sensor-noise pixels as seeds. Hysteresis then floods them
  // into one enormous blob and the card is lost inside it. A card against
  // clothing is always among the strongest edges present, so anchoring to the
  // maximum is the more reliable half of this pair.
  let maxMag = 0;
  for (let i = 0; i < mag.length; i++) if (mag[i] > maxMag) maxMag = mag[i];
  const hi = Math.max(percentile(mag, hiP), 0.18 * maxMag);
  const lo = hi * loP;
  const thin = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const m = mag[i];
      if (m < lo) continue;
      // Quantize the gradient direction to one of four neighbour pairs.
      const ax = Math.abs(gx[i]), ay = Math.abs(gy[i]);
      let n1, n2;
      if (ax > 2.414 * ay) { n1 = mag[i - 1]; n2 = mag[i + 1]; }
      else if (ay > 2.414 * ax) { n1 = mag[i - w]; n2 = mag[i + w]; }
      else if (gx[i] * gy[i] > 0) { n1 = mag[i - w - 1]; n2 = mag[i + w + 1]; }
      else { n1 = mag[i - w + 1]; n2 = mag[i + w - 1]; }
      if (m >= n1 && m >= n2) thin[i] = m;
    }
  }
  // Hysteresis: strong pixels seed, weak pixels only survive if connected.
  const out = new Uint8Array(w * h);
  const stack = [];
  for (let i = 0; i < thin.length; i++) if (thin[i] >= hi) { out[i] = 1; stack.push(i); }
  while (stack.length) {
    const i = stack.pop();
    const y = (i / w) | 0, x = i - y * w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
        const ni = ny * w + nx;
        if (!out[ni] && thin[ni] >= lo) { out[ni] = 1; stack.push(ni); }
      }
    }
  }
  return out;
}

// 8-connected components. Returns the largest few, each as its extreme points
// per row/column (the convex hull only ever touches those, so carrying the
// full pixel list would be wasted work).
function components(mask, w, h, maxComps) {
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || label[s] !== -1) continue;
    const id = comps.length;
    const rowMin = new Map(), rowMax = new Map();
    const colMin = new Map(), colMax = new Map();
    let count = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    stack.length = 0; stack.push(s); label[s] = id;
    while (stack.length) {
      const i = stack.pop();
      const y = (i / w) | 0, x = i - y * w;
      count++;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (!rowMin.has(y) || x < rowMin.get(y)) rowMin.set(y, x);
      if (!rowMax.has(y) || x > rowMax.get(y)) rowMax.set(y, x);
      if (!colMin.has(x) || y < colMin.get(x)) colMin.set(x, y);
      if (!colMax.has(x) || y > colMax.get(x)) colMax.set(x, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (mask[ni] && label[ni] === -1) { label[ni] = id; stack.push(ni); }
        }
      }
    }
    const extremes = [];
    for (const [y, x] of rowMin) extremes.push([x, y]);
    for (const [y, x] of rowMax) extremes.push([x, y]);
    for (const [x, y] of colMin) extremes.push([x, y]);
    for (const [x, y] of colMax) extremes.push([x, y]);
    comps.push({ count, extremes, bw: maxx - minx, bh: maxy - miny });
  }
  comps.sort((a, b) => b.count - a.count);
  return comps.slice(0, maxComps);
}

// ---------------------------------------------------------------------------
// Sub-pixel edge refinement
// ---------------------------------------------------------------------------

// Bilinear sample of a scalar field.
function sampleBilinear(f, w, h, x, y) {
  if (x < 0 || y < 0 || x > w - 2 || y > h - 2) return 0;
  const x0 = x | 0, y0 = y | 0;
  const fx = x - x0, fy = y - y0;
  const i = y0 * w + x0;
  return f[i] * (1 - fx) * (1 - fy) + f[i + 1] * fx * (1 - fy)
       + f[i + w] * (1 - fx) * fy + f[i + w + 1] * fx * fy;
}

// Walk along a candidate side and, at each step, find the true edge crossing by
// searching perpendicular for the gradient-magnitude peak, refined to sub-pixel
// with a parabolic fit through the peak and its two neighbours.
// Returns a weighted total-least-squares line { px, py, dx, dy, support }.
function refineSide(mag, w, h, a, b, band) {
  const len = dist2(a, b);
  if (len < 6) return null;
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const nx = -uy, ny = ux;
  const steps = Math.max(8, Math.min(96, Math.round(len / 2)));
  const pts = [];
  // Skip the ends: near a corner two edges overlap and pull the fit off-line.
  for (let s = 0; s <= steps; s++) {
    const t = 0.12 + 0.76 * (s / steps);
    const cx = a[0] + ux * len * t, cy = a[1] + uy * len * t;
    let bestM = -1, bestK = 0;
    for (let k = -band; k <= band; k++) {
      const m = sampleBilinear(mag, w, h, cx + nx * k, cy + ny * k);
      if (m > bestM) { bestM = m; bestK = k; }
    }
    if (bestM <= 0 || Math.abs(bestK) >= band) continue;
    const mL = sampleBilinear(mag, w, h, cx + nx * (bestK - 1), cy + ny * (bestK - 1));
    const mR = sampleBilinear(mag, w, h, cx + nx * (bestK + 1), cy + ny * (bestK + 1));
    const den = mL - 2 * bestM + mR;
    const off = Math.abs(den) > 1e-6 ? 0.5 * (mL - mR) / den : 0;
    if (!isFinite(off) || Math.abs(off) > 1) continue;
    const k = bestK + off;
    pts.push({ x: cx + nx * k, y: cy + ny * k, wgt: bestM });
  }
  if (pts.length < 6) return null;

  // Weighted principal-axis (total least squares) line fit.
  let sw = 0, mx = 0, my = 0;
  for (const p of pts) { sw += p.wgt; mx += p.x * p.wgt; my += p.y * p.wgt; }
  mx /= sw; my /= sw;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pts) {
    const dx = p.x - mx, dy = p.y - my;
    sxx += p.wgt * dx * dx; sxy += p.wgt * dx * dy; syy += p.wgt * dy * dy;
  }
  sxx /= sw; sxy /= sw; syy /= sw;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc;
  let dx, dy;
  if (Math.abs(sxy) > 1e-9) { dx = l1 - syy; dy = sxy; }
  else if (sxx >= syy) { dx = 1; dy = 0; }
  else { dx = 0; dy = 1; }
  const dn = Math.hypot(dx, dy) || 1;
  return { px: mx, py: my, dx: dx / dn, dy: dy / dn, support: pts.length / (steps + 1) };
}

function intersectLines(L1, L2) {
  const den = L1.dx * (-L2.dy) - L1.dy * (-L2.dx);
  if (Math.abs(den) < 1e-9) return null; // near-parallel: no usable corner
  const rx = L2.px - L1.px, ry = L2.py - L1.py;
  const s = (rx * (-L2.dy) - ry * (-L2.dx)) / den;
  return [L1.px + L1.dx * s, L1.py + L1.dy * s];
}

// ---------------------------------------------------------------------------
// Corner ordering
// ---------------------------------------------------------------------------

// Order 4 corners as [top-left, top-right, bottom-right, bottom-left] in image
// space, then pair them with the card's physical mm coordinates. Keeping the
// image "down" direction aligned with the model's +y is what later lets the
// recovered card pose tell us which way is down in the world.
function orderAndModel(quad) {
  const byY = quad.slice().sort((a, b) => a[1] - b[1]);
  const top = byY.slice(0, 2).sort((a, b) => a[0] - b[0]);
  const bot = byY.slice(2, 4).sort((a, b) => b[0] - a[0]);
  const img = [top[0], top[1], bot[0], bot[1]]; // TL, TR, BR, BL

  const topLen = dist2(img[0], img[1]);
  const sideLen = dist2(img[1], img[2]);
  const landscape = topLen >= sideLen;
  const L = CARD_LONG_MM, S = CARD_SHORT_MM;
  const model = landscape
    ? [[0, 0], [L, 0], [L, S], [0, S]]
    : [[0, 0], [S, 0], [S, L], [0, L]];
  return { img, model, landscape, topLen, sideLen };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Detect a credit card inside `roi` of an RGBA frame.
 *
 * @param {Uint8ClampedArray} data  full-frame RGBA pixels
 * @param {number} W  frame width
 * @param {number} H  frame height
 * @param {{x0:number,y0:number,x1:number,y1:number}} roi  search region
 * @returns {null | {
 *   corners: [number,number][],   // sub-pixel, full-frame coords, TL/TR/BR/BL
 *   model:   [number,number][],   // matching card coords in mm
 *   score: number, aspect: number, longEdgePx: number,
 *   rectangularity: number, edgeSupport: number, landscape: boolean
 * }}
 */
export function detectCardQuad(data, W, H, roi, opts = {}) {
  const x0 = Math.max(0, Math.floor(roi.x0)), y0 = Math.max(0, Math.floor(roi.y0));
  const x1 = Math.min(W, Math.ceil(roi.x1)), y1 = Math.min(H, Math.ceil(roi.y1));
  const rw = x1 - x0, rh = y1 - y0;
  if (rw < 40 || rh < 30) return null;

  // Detect on a decimated patch (cheap), refine at full resolution (accurate).
  const targetPx = opts.detectPixels || 160000;
  const step = Math.max(1, Math.round(Math.sqrt((rw * rh) / targetPx)));
  const R = { x0, y0, x1, y1 };
  const patch = grayPatch(data, W, R, step);
  const { pw, ph } = patch;
  if (pw < 24 || ph < 20) return null;

  const g = blur5(patch.g, pw, ph);
  const { gx, gy, mag } = sobel(g, pw, ph);
  const mask = edgeMask(gx, gy, mag, pw, ph, opts.hiPercentile ?? 0.99, opts.loRatio ?? 0.4);
  const comps = components(mask, pw, ph, opts.maxComponents ?? 10);

  // Full-resolution gradient magnitude, used only for sub-pixel refinement.
  const full = grayPatch(data, W, R, 1);
  const fg = blur5(full.g, full.pw, full.ph);
  const fullMag = sobel(fg, full.pw, full.ph).mag;

  let best = null;
  for (const comp of comps) {
    if (comp.count < 40 || comp.bw < 12 || comp.bh < 8) continue;
    const hull = simplifyClosed(convexHull(comp.extremes), 1.2);
    const quadP = maxAreaQuad(hull);
    if (!quadP) continue;

    // Back to full-resolution ROI coordinates.
    let quad = quadP.map((p) => [p[0] * step, p[1] * step]);

    // Sub-pixel refit of all four sides, then corners from line intersections.
    const band = Math.max(3, Math.min(10, Math.round(2.5 * step)));
    const lines = [];
    let sideOk = true, support = 0;
    for (let i = 0; i < 4; i++) {
      const L = refineSide(fullMag, full.pw, full.ph, quad[i], quad[(i + 1) % 4], band);
      if (!L) { sideOk = false; break; }
      lines.push(L); support += L.support;
    }
    if (sideOk) {
      const refined = [];
      for (let i = 0; i < 4; i++) {
        const c = intersectLines(lines[(i + 3) % 4], lines[i]);
        if (!c) { sideOk = false; break; }
        refined.push(c);
      }
      // Reject a refit that ran away from the seed — that means we latched onto
      // a different edge (a sleeve seam, the card's magnetic stripe) rather than
      // sharpening the one we found.
      if (sideOk) {
        let maxShift = 0;
        for (let i = 0; i < 4; i++) maxShift = Math.max(maxShift, dist2(refined[i], quad[i]));
        if (maxShift <= band * 1.5) quad = refined;
      }
    }
    const edgeSupport = sideOk ? support / 4 : 0;

    const ordered = orderAndModel(quad);
    const longPx = Math.max(ordered.topLen, ordered.sideLen);
    const shortPx = Math.min(ordered.topLen, ordered.sideLen);
    if (shortPx < 8 || longPx < 24) continue;

    // Opposite sides of a rectangle stay equal under perspective only
    // approximately, but a wild mismatch means this is not a rectangle at all.
    const w1 = dist2(ordered.img[0], ordered.img[1]), w2 = dist2(ordered.img[3], ordered.img[2]);
    const h1 = dist2(ordered.img[1], ordered.img[2]), h2 = dist2(ordered.img[0], ordered.img[3]);
    const rectangularity = Math.min(w1, w2) / Math.max(w1, w2) * Math.min(h1, h2) / Math.max(h1, h2);
    if (rectangularity < 0.55) continue;

    // Observed aspect is foreshortened by tilt, so it can only ever be SMALLER
    // than the true 1.586 — we allow a generous slack below and little above.
    const aspect = longPx / shortPx;
    if (aspect < 1.05 || aspect > 2.15) continue;
    const aspectScore = aspect <= CARD_ASPECT
      ? 0.55 + 0.45 * (aspect / CARD_ASPECT)
      : Math.max(0, 1 - (aspect - CARD_ASPECT) / 0.5);

    const sizeScore = Math.min(1, longPx / (rw * 0.35));
    const score = 0.40 * aspectScore + 0.25 * rectangularity + 0.20 * edgeSupport + 0.15 * sizeScore;

    if (!best || score > best.score) {
      best = {
        corners: ordered.img.map((p) => [p[0] + x0, p[1] + y0]),
        model: ordered.model,
        landscape: ordered.landscape,
        longEdgePx: longPx,
        shortEdgePx: shortPx,
        aspect,
        rectangularity,
        edgeSupport,
        score,
      };
    }
  }
  return best;
}
