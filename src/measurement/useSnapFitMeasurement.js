// useSnapFitMeasurement.js — the entire measurement core as one React hook.
// The teammate's UI just calls this hook, attaches videoRef + canvasRef to a
// <video>/<canvas>, and renders whatever it wants from the returned state.
// No UI layout is baked in here.

import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  extractFrontMetrics, extractSideMetrics,
  checkFrontAlignment, checkSideAlignment, chestGirthProxy,
} from './poseMetrics';
import { sizeFromRatio, measurementsForSize } from './sizeChart';
import { drawFrontGuide, drawSideGuide } from './alignmentGuide';

const HOLD_MS = 1000; // must stay aligned this long before auto-capture

export function useSnapFitMeasurement() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);

  // Per-frame mutable state (refs, so the 60fps loop never triggers re-renders).
  const phaseRef = useRef('front');
  const alignedSinceRef = useRef(null);
  const frontRef = useRef(null);
  const sideRef = useRef(null);
  const tickRef = useRef(0);

  // Render-facing state.
  const [phase, setPhase] = useState('front');   // 'front' | 'side' | 'done'
  const [status, setStatus] = useState('Loading model…');
  const [aligned, setAligned] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [reasons, setReasons] = useState([]);
  const [debug, setDebug] = useState(null);   // live raw metrics (calibration)
  const [result, setResult] = useState(null); // { size, measurements, front, side }

  const goPhase = (p) => { phaseRef.current = p; setPhase(p); };

  const reset = useCallback(() => {
    frontRef.current = null;
    sideRef.current = null;
    alignedSinceRef.current = null;
    setResult(null);
    setHoldProgress(0);
    setAligned(false);
    setReasons([]);
    goPhase('front');
  }, []);

  // 1) Camera + model setup (runs once).
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
        );
        const lm = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          outputSegmentationMasks: true, // needed for Method A side-depth
        });
        if (cancelled) return;
        landmarkerRef.current = lm;
        setStatus('Ready');
      } catch (err) {
        setStatus('Camera/model error: ' + err.message);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // 2) Detection loop (runs once; reads phase from a ref to avoid stale closures).
  useEffect(() => {
    let raf;

    function capture(cur, metrics) {
      alignedSinceRef.current = null;
      setHoldProgress(0);
      if (cur === 'front') {
        frontRef.current = metrics;
        goPhase('side');
      } else if (cur === 'side') {
        sideRef.current = metrics;
        const front = frontRef.current;
        const size = sizeFromRatio(front.ratio);
        setResult({
          size,
          measurements: measurementsForSize(size),
          front,
          side: sideRef.current,
          girth: chestGirthProxy(front, sideRef.current),
        });
        goPhase('done');
      }
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const lmer = landmarkerRef.current;

      if (video && canvas && lmer && video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        const res = lmer.detectForVideo(video, performance.now());
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cur = phaseRef.current;

        // Copy the segmentation mask we need (side phase only), then close all
        // masks immediately — they hold GPU memory and leak if not released.
        let maskObj = null;
        if (res.segmentationMasks && res.segmentationMasks.length) {
          if (cur === 'side') {
            const m = res.segmentationMasks[0];
            maskObj = { data: m.getAsFloat32Array(), width: m.width, height: m.height };
          }
          for (const m of res.segmentationMasks) m.close();
        }

        if (cur !== 'done' && res.landmarks && res.landmarks.length) {
          const lm = res.landmarks[0];

          // Bright cyan dots with a dark outline — readable on skin, walls, and
          // dark clothing alike, and visible from a distance.
          ctx.fillStyle = '#00e5ff';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.lineWidth = 1.5;
          for (const p of lm) {
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }

          const isFront = cur === 'front';
          const check = (isFront ? checkFrontAlignment : checkSideAlignment)(lm);
          (isFront ? drawFrontGuide : drawSideGuide)(ctx, canvas.width, canvas.height, check.aligned);

          const metrics = isFront
            ? extractFrontMetrics(lm, canvas.width, canvas.height)
            : extractSideMetrics(lm, canvas.width, canvas.height, maskObj);

          setAligned(check.aligned);
          // Throttle the chattier state to ~every 6th frame to limit re-renders.
          if ((tickRef.current++ % 6) === 0) {
            setReasons(check.reasons);
            setDebug({ phase: cur, ...metrics });
          }

          if (check.aligned) {
            if (alignedSinceRef.current == null) alignedSinceRef.current = performance.now();
            const held = performance.now() - alignedSinceRef.current;
            setHoldProgress(Math.min(held / HOLD_MS, 1));
            if (held >= HOLD_MS) capture(cur, metrics);
          } else {
            alignedSinceRef.current = null;
            setHoldProgress(0);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return {
    videoRef, canvasRef,
    phase, status, aligned, holdProgress, reasons, debug, result,
    reset,
  };
}
