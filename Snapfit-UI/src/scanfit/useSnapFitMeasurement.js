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
  const [silhouette, setSilhouette] = useState(null); // { bustW, waistW, hipW } from front mask — drives body-shape
  const [captureFlash, setCaptureFlash] = useState(null); // 'front' | 'side' — brief green "recorded" confirmation

  const goPhase = (p) => { phaseRef.current = p; setPhase(p); };

  const reset = useCallback(() => {
    frontRef.current = null;
    sideRef.current = null;
    alignedSinceRef.current = null;
    setResult(null);
    setSilhouette(null);
    setHoldProgress(0);
    setAligned(false);
    setReasons([]);
    setCaptureFlash(null);
    goPhase('front');
  }, []);

  // 1) Camera + model setup (runs once).
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          // Fires on insecure origins (http:// over a LAN IP) and old browsers —
          // getUserMedia only exists in a secure context (https or localhost).
          throw new Error('Camera needs HTTPS (or localhost). Open the site over https on your phone.');
        }
        // `ideal` (not `exact`) keeps this from throwing on devices that can't
        // satisfy it — desktops with one webcam just ignore facingMode, phones
        // pick the front/selfie camera which is what a self-scan wants.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
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
        // NotAllowedError = user (or iOS Safari's per-site setting) blocked the
        // camera; NotFoundError = no camera; NotReadableError = another app holds it.
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatus('Camera blocked — allow camera access for this site, then reload.');
        } else if (err.name === 'NotFoundError') {
          setStatus('No camera found on this device.');
        } else if (err.name === 'NotReadableError') {
          setStatus('Camera is in use by another app. Close it and reload.');
        } else {
          setStatus('Camera/model error: ' + err.message);
        }
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
      // Green "recorded" confirmation, auto-clears after ~1.6s.
      setCaptureFlash(cur);
      setTimeout(() => setCaptureFlash(null), 1600);
      if (cur === 'front') {
        frontRef.current = metrics;
        setSilhouette(metrics.silhouette || null);
        // Hip width A/B log: old landmark distance vs new mask-edge width, in the
        // same (frame px) units, so we can compare against real tape measurements
        // before fully switching the hip measurement over to the mask method.
        const lmHip = metrics.hipWidthPx;
        const maskHip = metrics.hipWidthMaskPx;
        console.log(
          '[SnapFit hip][front] landmark=%spx  mask-edge=%spx  delta=%s',
          lmHip != null ? lmHip.toFixed(1) : 'n/a',
          maskHip != null ? maskHip.toFixed(1) : 'n/a',
          lmHip != null && maskHip != null ? (maskHip - lmHip).toFixed(1) + 'px' : 'n/a',
        );
        goPhase('side');
      } else if (cur === 'side') {
        sideRef.current = metrics;
        // Independent side-view cross-check: front-to-back hip depth (mask edges).
        console.log(
          '[SnapFit hip][side] front-to-back depth (mask-edge)=%s',
          metrics.hipDepthPx != null ? metrics.hipDepthPx.toFixed(1) + 'px' : 'n/a',
        );
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
        // We now need the mask on BOTH phases: side for torso depth, front for
        // mask-edge hip width. Copy it out, then close all masks immediately
        // (they hold GPU memory and leak if not released).
        let maskObj = null;
        if (res.segmentationMasks && res.segmentationMasks.length) {
          if (cur === 'front' || cur === 'side') {
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
            ? extractFrontMetrics(lm, canvas.width, canvas.height, maskObj)
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
    phase, status, aligned, holdProgress, reasons, debug, result, silhouette, captureFlash,
    reset,
  };
}
