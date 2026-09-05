// alignmentGuide.js — pure canvas overlays. No state, no React.
// The teammate's UI can restyle around these; they only draw onto a 2D context.
//
// About `safe`: the canvas is sized to the VIDEO's pixel dimensions, but it is
// displayed with object-fit: cover, so whenever the frame's shape differs from
// the video's shape the browser crops the overflow. Drawing the guide across
// the full canvas therefore pushes its edges outside what the user can see —
// on a landscape webcam shown in a portrait frame, most of the width is cropped
// and the guide's sides and hand markers disappear entirely.
//
// `safe` is that visible window in normalized coordinates. Every guide is laid
// out inside it, so the outline always lands on screen whatever the frame shape.

function region(safe) {
  const x0 = safe?.x0 ?? 0, x1 = safe?.x1 ?? 1;
  const y0 = safe?.y0 ?? 0, y1 = safe?.y1 ?? 1;
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}

function marker(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, 2 * Math.PI); ctx.fill();
}

function colorFor(aligned) {
  // High-contrast, visible from across a room: bright cyan while adjusting,
  // bright green when locked. (Yellow/amber washed out at distance.)
  return aligned ? '#22c55e' : '#22d3ee';
}

// FRONT guide: head circle, full-body box, raised-hand targets (arms away from
// torso so armpit/torso edges aren't occluded), and shoulder-width foot marks.
export function drawFrontGuide(ctx, w, h, aligned, safe) {
  const R = region(safe);
  const X = (u) => (R.x0 + R.w * u) * w;
  const Y = (v) => (R.y0 + R.h * v) * h;
  const unit = Math.min(R.w * w, R.h * h);

  const c = colorFor(aligned);
  ctx.save();
  ctx.strokeStyle = c; ctx.fillStyle = c;
  ctx.lineWidth = Math.max(3, unit * 0.008);

  ctx.beginPath();
  ctx.arc(X(0.5), Y(0.12), R.h * h * 0.055, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.setLineDash([unit * 0.03, unit * 0.025]);
  const bx = X(0.20), by = Y(0.03);
  const bw = X(0.80) - bx, bh = Y(0.98) - by;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, unit * 0.05);
  else ctx.rect(bx, by, bw, bh);
  ctx.stroke();
  ctx.setLineDash([]);

  const mr = Math.max(6, unit * 0.022);
  marker(ctx, X(0.10), Y(0.40), mr); // left hand
  marker(ctx, X(0.90), Y(0.40), mr); // right hand
  marker(ctx, X(0.38), Y(0.95), mr); // left foot
  marker(ctx, X(0.62), Y(0.95), mr); // right foot
  ctx.restore();
}

// SIDE guide: a narrow centered profile band + head circle.
export function drawSideGuide(ctx, w, h, aligned, safe) {
  const R = region(safe);
  const X = (u) => (R.x0 + R.w * u) * w;
  const Y = (v) => (R.y0 + R.h * v) * h;
  const unit = Math.min(R.w * w, R.h * h);

  const c = colorFor(aligned);
  ctx.save();
  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(3, unit * 0.008);

  ctx.beginPath();
  ctx.arc(X(0.5), Y(0.12), R.h * h * 0.055, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.setLineDash([unit * 0.03, unit * 0.025]);
  const bx = X(0.34), by = Y(0.03);
  const bw = X(0.66) - bx, bh = Y(0.98) - by;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, unit * 0.045);
  else ctx.rect(bx, by, bw, bh);
  ctx.stroke();
  ctx.restore();
}

/**
 * The part of the video actually on screen, in normalized coordinates.
 *
 * The <canvas> and <video> are both object-fit: cover, which scales by the
 * LARGER of the two axis ratios and crops the overflow evenly on both sides.
 * Reproducing that here tells the guides where they can safely draw.
 */
export function visibleRegion(videoW, videoH, boxW, boxH) {
  if (!videoW || !videoH || !boxW || !boxH) return { x0: 0, x1: 1, y0: 0, y1: 1 };
  const scale = Math.max(boxW / videoW, boxH / videoH);
  const visW = Math.min(videoW, boxW / scale);
  const visH = Math.min(videoH, boxH / scale);
  const mx = (1 - visW / videoW) / 2;
  const my = (1 - visH / videoH) / 2;
  return { x0: mx, x1: 1 - mx, y0: my, y1: 1 - my };
}
