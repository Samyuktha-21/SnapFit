// alignmentGuide.js — pure canvas overlays. No state, no React.
// The teammate's UI can restyle around these; they only draw onto a 2D context.

function marker(ctx, x, y) {
  ctx.beginPath(); ctx.arc(x, y, 9, 0, 2 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 2 * Math.PI); ctx.fill();
}

function colorFor(aligned) {
  // High-contrast, visible from across a room: bright cyan while adjusting,
  // bright green when locked. (Yellow/amber washed out at distance.)
  return aligned ? '#22c55e' : '#22d3ee';
}

// FRONT guide: head circle, full-body box, raised-hand targets (arms away from
// torso so armpit/torso edges aren't occluded), and shoulder-width foot marks.
export function drawFrontGuide(ctx, w, h, aligned) {
  const c = colorFor(aligned);
  ctx.save();
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 5;

  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.13, h * 0.06, 0, 2 * Math.PI); ctx.stroke();

  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(w * 0.27, h * 0.04, w * 0.46, h * 0.94, 28);
  else ctx.rect(w * 0.27, h * 0.04, w * 0.46, h * 0.94);
  ctx.stroke();
  ctx.setLineDash([]);

  marker(ctx, w * 0.16, h * 0.40); // left hand
  marker(ctx, w * 0.84, h * 0.40); // right hand
  marker(ctx, w * 0.40, h * 0.95); // left foot
  marker(ctx, w * 0.60, h * 0.95); // right foot
  ctx.restore();
}

// SIDE guide: a narrow centered profile band + head circle.
export function drawSideGuide(ctx, w, h, aligned) {
  const c = colorFor(aligned);
  ctx.save();
  ctx.strokeStyle = c; ctx.lineWidth = 5;

  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.13, h * 0.06, 0, 2 * Math.PI); ctx.stroke();

  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(w * 0.38, h * 0.04, w * 0.24, h * 0.94, 24);
  else ctx.rect(w * 0.38, h * 0.04, w * 0.24, h * 0.94);
  ctx.stroke();
  ctx.restore();
}
