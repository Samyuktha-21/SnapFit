// linalg.js — the small, dependency-free linear-algebra kernel behind
// card-referenced height measurement.
//
// Everything here is plain math on plain arrays: 3x3 matrices are length-9
// row-major Float64Array, vectors are length-3 arrays. No allocation-heavy
// abstractions, because this runs inside a per-frame video loop.

// ---------------------------------------------------------------------------
// 3x3 matrix / vector primitives
// ---------------------------------------------------------------------------

export function mat3Mul(A, B) {
  const M = new Float64Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      M[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    }
  }
  return M;
}

export function mat3Apply(M, v) {
  return [
    M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
    M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
    M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
  ];
}

export function mat3Inv(M) {
  const a = M[0], b = M[1], c = M[2], d = M[3], e = M[4], f = M[5], g = M[6], h = M[7], i = M[8];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!isFinite(det) || Math.abs(det) < 1e-18) return null;
  const s = 1 / det;
  return new Float64Array([
    A * s, (c * h - b * i) * s, (b * f - c * e) * s,
    B * s, (a * i - c * g) * s, (c * d - a * f) * s,
    C * s, (b * g - a * h) * s, (a * e - b * d) * s,
  ]);
}

export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm3 = (a) => Math.sqrt(dot3(a, a));
export const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export function unit3(a) {
  const n = norm3(a);
  return n > 1e-12 ? scale3(a, 1 / n) : [0, 0, 0];
}

// ---------------------------------------------------------------------------
// Dense linear solve (Gaussian elimination, partial pivoting).
// A is n x n row-major, b is length n. Returns x, or null if singular.
// ---------------------------------------------------------------------------
export function solveDense(A, b, n) {
  const M = Float64Array.from(A);
  const y = Float64Array.from(b);
  for (let col = 0; col < n; col++) {
    let piv = col, best = Math.abs(M[col * n + col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r * n + col]);
      if (v > best) { best = v; piv = r; }
    }
    if (best < 1e-14) return null;
    if (piv !== col) {
      for (let c = 0; c < n; c++) {
        const t = M[col * n + c]; M[col * n + c] = M[piv * n + c]; M[piv * n + c] = t;
      }
      const t = y[col]; y[col] = y[piv]; y[piv] = t;
    }
    const d = M[col * n + col];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r * n + col] / d;
      if (factor === 0) continue;
      for (let c = col; c < n; c++) M[r * n + c] -= factor * M[col * n + c];
      y[r] -= factor * y[col];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = y[r];
    for (let c = r + 1; c < n; c++) s -= M[r * n + c] * x[c];
    x[r] = s / M[r * n + r];
  }
  return x;
}

// ---------------------------------------------------------------------------
// Hartley normalization: translate the centroid to the origin and scale so the
// mean distance from it is sqrt(2). Badly-conditioned DLT systems are the
// classic cause of a silently-wrong homography, and this is the standard fix.
// Returns { T, pts } where pts are the normalized points and T is the 3x3 with
// normalized = T * original (homogeneous).
// ---------------------------------------------------------------------------
export function normalizePoints(pts) {
  const n = pts.length;
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; }
  cx /= n; cy /= n;
  let meanDist = 0;
  for (const p of pts) meanDist += Math.hypot(p[0] - cx, p[1] - cy);
  meanDist /= n;
  const s = meanDist > 1e-12 ? Math.SQRT2 / meanDist : 1;
  const T = new Float64Array([s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1]);
  return { T, pts: pts.map((p) => [(p[0] - cx) * s, (p[1] - cy) * s]) };
}

// ---------------------------------------------------------------------------
// Homography from exactly 4 point correspondences (normalized DLT).
// src/dst are arrays of 4 [x, y]. Returns a 3x3 (row-major) normalized so
// H[8] === 1, or null.
// ---------------------------------------------------------------------------
export function homographyFrom4(src, dst) {
  if (src.length !== 4 || dst.length !== 4) return null;
  const ns = normalizePoints(src);
  const nd = normalizePoints(dst);

  const A = new Float64Array(64);
  const b = new Float64Array(8);
  for (let i = 0; i < 4; i++) {
    const X = ns.pts[i][0], Y = ns.pts[i][1];
    const u = nd.pts[i][0], v = nd.pts[i][1];
    const r0 = (2 * i) * 8, r1 = (2 * i + 1) * 8;
    A[r0] = X; A[r0 + 1] = Y; A[r0 + 2] = 1; A[r0 + 6] = -u * X; A[r0 + 7] = -u * Y;
    A[r1 + 3] = X; A[r1 + 4] = Y; A[r1 + 5] = 1; A[r1 + 6] = -v * X; A[r1 + 7] = -v * Y;
    b[2 * i] = u; b[2 * i + 1] = v;
  }
  const h = solveDense(A, b, 8);
  if (!h) return null;

  const Hn = new Float64Array([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]);
  const Tdi = mat3Inv(nd.T);
  if (!Tdi) return null;
  const H = mat3Mul(Tdi, mat3Mul(Hn, ns.T));
  if (Math.abs(H[8]) < 1e-15) return null;
  const s = 1 / H[8];
  for (let i = 0; i < 9; i++) H[i] *= s;
  return H;
}

// Project a source point through H. Returns [u, v], or null at infinity.
export function projectH(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-12) return null;
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

// RMS reprojection error of a homography over its correspondences, in px.
// This is the single best "is this detection trustworthy" signal we have.
export function reprojError(H, src, dst) {
  let s = 0, n = 0;
  for (let i = 0; i < src.length; i++) {
    const p = projectH(H, src[i][0], src[i][1]);
    if (!p) return Infinity;
    s += (p[0] - dst[i][0]) ** 2 + (p[1] - dst[i][1]) ** 2;
    n++;
  }
  return n ? Math.sqrt(s / n) : Infinity;
}

// ---------------------------------------------------------------------------
// Focal length from a single planar homography (Zhang's constraints).
//
// With K = [[f,0,cx],[0,f,cy],[0,0,1]] and H = lambda*K*[r1 r2 t], the fact
// that r1 and r2 are orthonormal columns of a rotation gives two independent
// equations in f^2:
//     orthogonality:  h1' * (K^-T K^-1) * h2 = 0
//     equal norm:     h1' * (K^-T K^-1) * h1 = h2' * (K^-T K^-1) * h2
// Each has a closed form. BOTH degenerate when the card is exactly
// fronto-parallel (h1z = h2z = 0): there is then genuinely no perspective
// information in the image to read a focal length from. We report that rather
// than returning a confident-looking garbage number.
// ---------------------------------------------------------------------------
export function focalFromHomography(H, cx, cy) {
  const a1 = H[0] - cx * H[6], a2 = H[3] - cy * H[6], a3 = H[6];
  const b1 = H[1] - cx * H[7], b2 = H[4] - cy * H[7], b3 = H[7];

  const cands = [];
  const denO = a3 * b3;
  if (Math.abs(denO) > 1e-16) {
    const f2 = -(a1 * b1 + a2 * b2) / denO;
    if (f2 > 0) cands.push({ f: Math.sqrt(f2), w: Math.abs(denO) });
  }
  const denN = a3 * a3 - b3 * b3;
  if (Math.abs(denN) > 1e-16) {
    const f2 = ((b1 * b1 + b2 * b2) - (a1 * a1 + a2 * a2)) / denN;
    if (f2 > 0) cands.push({ f: Math.sqrt(f2), w: Math.abs(denN) });
  }
  if (!cands.length) return { f: null, degenerate: true, agreement: 0, candidates: [] };

  // Weighted blend, each constraint weighted by how far it sits from degenerate.
  let sw = 0, sf = 0;
  for (const c of cands) { sw += c.w; sf += c.f * c.w; }
  const f = sf / sw;
  const agreement = cands.length === 2
    ? 1 - Math.min(1, Math.abs(cands[0].f - cands[1].f) / Math.max(cands[0].f, cands[1].f))
    : 0.5;
  return { f, degenerate: false, agreement, candidates: cands.map((c) => c.f) };
}

// ---------------------------------------------------------------------------
// Full metric pose of the planar card, from H and K.
//   H = lambda * K * [r1 r2 t]
// Returns { R, t (mm, camera frame), xAxis, yAxis, normal, distance }.
//
// The card's own axes come back too. Because the user holds the card upright
// against the chest, the recovered yAxis is a direct read on which way is DOWN
// in the world — that is how we correct camera pitch and roll with no sensor.
// ---------------------------------------------------------------------------
export function poseFromHomography(H, K) {
  const Ki = mat3Inv(K);
  if (!Ki) return null;
  const v1 = mat3Apply(Ki, [H[0], H[3], H[6]]);
  const v2 = mat3Apply(Ki, [H[1], H[4], H[7]]);
  const v3 = mat3Apply(Ki, [H[2], H[5], H[8]]);

  const n1 = norm3(v1), n2 = norm3(v2);
  if (n1 < 1e-12 || n2 < 1e-12) return null;
  // Average the two scale estimates; for a true rotation they agree.
  const lambda = 2 / (n1 + n2);

  let r1 = scale3(v1, lambda);
  let r2 = scale3(v2, lambda);
  let t = scale3(v3, lambda);

  // The card must be IN FRONT of the camera. Negative depth means we landed on
  // the wrong sign branch of the homography scale.
  if (t[2] < 0) { r1 = scale3(r1, -1); r2 = scale3(r2, -1); t = scale3(t, -1); }

  // Re-orthonormalize. r1 and r2 come from noisy corners and are not exactly
  // orthonormal; a symmetric correction splits the error evenly between them
  // rather than trusting r1 completely (as plain Gram-Schmidt would).
  const err = dot3(r1, r2) / 2;
  const c1 = unit3(sub3(r1, scale3(r2, err)));
  const c2 = unit3(sub3(r2, scale3(r1, err)));
  const c3 = unit3(cross3(c1, c2));

  const R = new Float64Array([
    c1[0], c2[0], c3[0],
    c1[1], c2[1], c3[1],
    c1[2], c2[2], c3[2],
  ]);
  return {
    R,
    t,
    xAxis: c1,      // card long-edge direction, camera frame
    yAxis: c2,      // card short-edge direction (points "down" on the card)
    normal: c3,     // card plane normal
    distance: t[2], // perpendicular depth of the card origin, mm
    orthoResidual: Math.abs(err) * 2, // 0 == perfectly consistent rotation
  };
}
