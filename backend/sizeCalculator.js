// ---------------------------------------------------------------------------
// sizeCalculator.js
//
// Pure geometry + sizing logic, kept in its own module so it has NO knowledge
// of HTTP. That separation is deliberate: the same function can be unit-tested,
// re-used, or moved back into the frontend without touching any Express code.
//
// The math here is lifted directly from the frontend pose code — we are MOVING
// it to the server, not redesigning it. The server is just a cleaner home for
// the rule so it can evolve (calibration, logging) without shipping a new build
// of the React app every time.
// ---------------------------------------------------------------------------

// MediaPipe PoseLandmarker landmark indices we rely on.
// (The model returns 33 of these; we only need four.)
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

// 2D Euclidean distance between two landmarks.
// Landmarks are normalized 0..1, so this is a normalized distance — but because
// the final number is a RATIO of two such distances, the units cancel out and
// the result is scale-invariant. That is the whole reason this works regardless
// of how far the user stands from the camera.
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Size thresholds on the shoulder-width / body-height ratio.
//
// HONESTY NOTE FOR THE PITCH:
//   Only the S/M boundary (0.227) has been validated against real measured test
//   data. The other cut points are reasoned ESTIMATES spaced around it and have
//   NOT been individually validated. We surface that uncertainty to the client
//   through the `confidence` field rather than hiding it.
const SIZE_THRESHOLDS = [
  { size: 'XS', max: 0.21 },   // estimated
  { size: 'S', max: 0.227 },  // VALIDATED boundary (S vs M) against real data
  { size: 'M', max: 0.25 },   // estimated
  { size: 'L', max: 0.27 },   // estimated
  { size: 'XL', max: 0.29 },   // estimated
  // anything >= 0.29 falls through to XXL
];

// The ratio range we have actually tested. Inside this band we trust the
// result ("high"); outside it we are extrapolating ("low").
const VALIDATED_MIN = 0.21;
const VALIDATED_MAX = 0.25;

/**
 * Turn a set of MediaPipe pose landmarks into a clothing size.
 *
 * @param {Array<{x:number,y:number,z:number}>} landmarks - 33 normalized points
 * @returns {{ size: string, ratio: number, confidence: 'high'|'low' }}
 */
export function calculateSize(landmarks) {
  // Shoulder width: straight-line distance between the two shoulder joints.
  const shoulderWidth = distance(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]);

  // Body height proxy: distance from the nose down to the midpoint between the
  // ankles. We average the two ankle points so a slightly uneven stance doesn't
  // skew the height, then measure to that single foot point.
  const ankleMidpoint = {
    x: (landmarks[LEFT_ANKLE].x + landmarks[RIGHT_ANKLE].x) / 2,
    y: (landmarks[LEFT_ANKLE].y + landmarks[RIGHT_ANKLE].y) / 2,
  };
  const bodyHeight = distance(landmarks[NOSE], ankleMidpoint);

  // Guard against a degenerate pose (e.g. all points collapsed) that would make
  // the height ~0 and blow the ratio up to Infinity.
  if (bodyHeight === 0) {
    throw new Error('Invalid pose: body height resolved to zero.');
  }

  const ratio = shoulderWidth / bodyHeight;

  // First threshold whose ceiling the ratio falls under wins; otherwise XXL.
  const match = SIZE_THRESHOLDS.find((t) => ratio < t.max);
  const size = match ? match.size : 'XXL';

  // We only claim "high" confidence inside the range we've measured against.
  const confidence = ratio >= VALIDATED_MIN && ratio <= VALIDATED_MAX ? 'high' : 'low';

  // Round the ratio for a clean response; keep enough precision to be useful.
  return { size, ratio: Number(ratio.toFixed(4)), confidence };
}
