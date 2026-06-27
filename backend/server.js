// ---------------------------------------------------------------------------
// server.js
//
// SnapFit size-calculation API. A deliberately tiny, stateless Express service
// with exactly one job: receive pose landmarks from the browser and return a
// clothing size. No database, no auth, no sessions.
//
// WHY A SEPARATE BACKEND AT ALL (the pitch answer):
//   - The React app stays a pure static site (cheap to host on Vercel).
//   - The sizing *rule* lives server-side, so we can recalibrate thresholds,
//     add logging, or A/B test sizing WITHOUT shipping a new frontend build.
//   - Landmarks are tiny JSON (99 numbers), so the request is light and the
//     user's camera image NEVER leaves their device — only abstract points do.
// ---------------------------------------------------------------------------

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { calculateSize } from './sizeCalculator.js';

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS ------------------------------------------------------------------
// The frontend is hosted on a different origin (Vercel) than this API (Render),
// so the browser will block calls unless we explicitly allow that origin.
// FRONTEND_URL pins it in production; if unset we fall back to "*" so local dev
// and the hackathon demo "just work".
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: allowedOrigin }));

// Parse JSON bodies. Landmarks are small, but we cap the size to keep the
// endpoint from being used as a dumping ground.
app.use(express.json({ limit: '100kb' }));

// --- Health check ----------------------------------------------------------
// Render (and any uptime monitor) pings this to confirm the service is alive.
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'snapfit-backend' });
});

// --- The one real endpoint -------------------------------------------------
// POST /api/calculate-size
// Body: { landmarks: [...33 points], height: number, sex: "male" | "female" }
app.post('/api/calculate-size', (req, res) => {
  const { landmarks, height, sex } = req.body || {};

  // --- Input validation ---------------------------------------------------
  // Reject anything that isn't a proper 33-point landmark array up front, so
  // the geometry code can assume clean input.
  if (!Array.isArray(landmarks)) {
    return res.status(400).json({ error: 'Field "landmarks" must be an array.' });
  }
  if (landmarks.length !== 33) {
    return res.status(400).json({
      error: `Expected 33 pose landmarks, received ${landmarks.length}.`,
    });
  }
  // Every point we actually read must have numeric x/y. (We don't require z —
  // the ratio math is purely 2D.)
  const hasValidPoints = landmarks.every(
    (p) => p && typeof p.x === 'number' && typeof p.y === 'number',
  );
  if (!hasValidPoints) {
    return res.status(400).json({ error: 'Each landmark must have numeric x and y values.' });
  }

  // height and sex are captured for validation + future calibration (e.g.
  // sex-specific thresholds). The current ratio method is scale-invariant, so
  // they don't affect this calculation — but we still sanity-check them so the
  // contract is honest about what it accepts.
  if (height !== undefined && (typeof height !== 'number' || height <= 0)) {
    return res.status(400).json({ error: 'Field "height" must be a positive number.' });
  }
  if (sex !== undefined && sex !== 'male' && sex !== 'female') {
    return res.status(400).json({ error: 'Field "sex" must be "male" or "female".' });
  }

  // --- Calculation --------------------------------------------------------
  try {
    const result = calculateSize(landmarks);
    return res.json(result);
  } catch (err) {
    // The only throw path is a degenerate pose (zero body height).
    return res.status(422).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SnapFit backend listening on port ${PORT}`);
});
