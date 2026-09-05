// useSnapFitMeasurement.js — the entire measurement core as one React hook.
// The teammate's UI just calls this hook, attaches videoRef + canvasRef to a
// <video>/<canvas>, and renders whatever it wants from the returned state.
// No UI layout is baked in here.

import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  extractFrontMetrics, extractSideMetrics,
  checkFrontAlignment, checkSideAlignment, checkHeightAlignment, chestGirthProxy,
} from './poseMetrics';
import {
  estimateHeightFrame, HeightAccumulator, normalFromCameraPitch,
} from './heightEstimator';
import { sizeFromRatio, measurementsForSize } from './sizeChart';
import { drawFrontGuide, drawSideGuide, visibleRegion } from './alignmentGuide';

const HOLD_MS = 1000;          // must stay aligned this long before auto-capture
const HEIGHT_SAMPLES = 24;     // frames to fuse before trusting a height
const HEIGHT_EVERY_N = 3;      // run the (costly) card scan on 1 frame in N

// Why a frame was thrown away, in words the person in front of the camera can
// act on. Every one of these is recoverable by moving, so say how.
const HEIGHT_HINTS = {
  'no-card': 'Hold your card flat against your chest',
  'card-too-small': 'Hold the card flat and fully visible',
  'card-not-flat': 'Press the card flat against your chest — do not angle it',
  'card-too-tilted': 'Press the card flat against your chest',
  'body-clipped': 'Step back — your whole body must be in frame',
  'out-of-range': 'Hold the card flat against your chest',
  'implausible-distance': 'Step back a little',
};

export function useSnapFitMeasurement({ measureHeight = false, gender = 'Women' } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const heightCanvasRef = useRef(null);        // offscreen frame grab for card scan
  const measureHeightRef = useRef(measureHeight);
  measureHeightRef.current = measureHeight;
  const genderRef = useRef(gender);
  genderRef.current = gender;

  // Camera switching states
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  // Per-frame mutable state (refs, so the 60fps loop never triggers re-renders).
  const phaseRef = useRef(measureHeight ? 'height' : 'front');
  const heightAccRef = useRef(new HeightAccumulator({ minSamples: 8, maxSamples: 40 }));
  const pitchRef = useRef(null);      // camera pitch in radians, from the device
  const heightTickRef = useRef(0);
  const alignedSinceRef = useRef(null);
  const frontRef = useRef(null);
  const sideRef = useRef(null);
  const tickRef = useRef(0);

  // Render-facing state.
  const [phase, setPhase] = useState(measureHeight ? 'height' : 'front'); // 'height' | 'front' | 'side' | 'done'
  const [status, setStatus] = useState('Loading model…');
  const [aligned, setAligned] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [reasons, setReasons] = useState([]);
  const [debug, setDebug] = useState(null);   // live raw metrics (calibration)
  const [result, setResult] = useState(null); // { size, measurements, front, side }
  const [silhouette, setSilhouette] = useState(null); // { bustW, waistW, hipW } from front mask — drives body-shape
  const [captureFlash, setCaptureFlash] = useState(null); // 'front' | 'side' — brief green "recorded" confirmation
  const [detectedHeight, setDetectedHeight] = useState(null); // cm from card scale, or null
  const [heightError, setHeightError] = useState(false);      // auto height failed → fall back to manual
  const [heightDebug, setHeightDebug] = useState(null);       // dev-only debug payload
  const [heightSigma, setHeightSigma] = useState(null);       // +/- cm, 1 sigma
  const [heightConfidence, setHeightConfidence] = useState(0);
  const [heightProgress, setHeightProgress] = useState(0);    // 0..1 sample fill
  const [heightHint, setHeightHint] = useState(null);         // why frames are failing

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
    setDetectedHeight(null);
    setHeightError(false);
    setHeightDebug(null);
    setHeightSigma(null);
    setHeightConfidence(0);
    setHeightProgress(0);
    setHeightHint(null);
    heightAccRef.current.reset();
    goPhase(measureHeightRef.current ? 'height' : 'front');
  }, []);


  const switchCamera = useCallback(() => {
    if (devices.length > 1) {
      const idx = devices.findIndex(d => d.deviceId === currentDeviceId);
      const nextIdx = (idx + 1) % devices.length;
      setCurrentDeviceId(devices[nextIdx].deviceId);
    }
  }, [devices, currentDeviceId]);

  // 0) Camera pitch from the device's own inclinometer.
  //
  // A standing person's plane is vertical, so only the CAMERA's pitch tips it
  // relative to the image — and ignoring an 8 degree tilt costs about 8cm of
  // height. The card cannot tell us this (far too few pixels, and its recovered
  // normal is biased), but the accelerometer measures it directly.
  useEffect(() => {
    if (!measureHeight) return undefined;
    let cancelled = false;
    const onOrient = (e) => {
      if (cancelled || e.beta == null) return;
      // beta is 0 lying flat, 90 upright. A phone framing a person is near 90,
      // so the deviation from 90 is the camera's pitch.
      const deg = e.beta - 90;
      // Beyond this the reading is more likely a device held oddly (or a
      // landscape orientation we are not modelling) than a real camera tilt.
      pitchRef.current = Math.abs(deg) <= 30 ? deg * Math.PI / 180 : null;
    };
    async function subscribe() {
      try {
        const DOE = window.DeviceOrientationEvent;
        if (!DOE) return;
        // iOS 13+ gates this behind an explicit permission call.
        if (typeof DOE.requestPermission === 'function') {
          const res = await DOE.requestPermission().catch(() => 'denied');
          if (res !== 'granted') return;
        }
        window.addEventListener('deviceorientation', onOrient);
      } catch { /* no inclinometer: we fall back to assuming a level camera */ }
    }
    subscribe();
    return () => { cancelled = true; window.removeEventListener('deviceorientation', onOrient); };
  }, [measureHeight]);

  // 1) Camera + model setup
  useEffect(() => {
    let cancelled = false;
    let stream = null;
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
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }

        // Resolution is not a nicety here: at a normal full-body distance a
        // credit card spans only ~34 px in a 1280-wide frame, and the card's
        // pixel size sets the scale for the entire height measurement. Asking
        // for 1920 roughly halves that error for free. `ideal` keeps it from
        // throwing on devices that cannot deliver it.
        //
        // Orientation matters just as much as pixel count. A person is TALL, so
        // a landscape stream spends its long axis on empty room either side and
        // forces you to stand far enough back to fit head-to-toe inside the
        // short axis — which is what makes you look tiny in frame. Asking for a
        // portrait stream puts the long axis along the body instead: you fill
        // the frame from much closer, and the extra pixels land on you and on
        // the card, so the framing fix improves the measurement too.
        const portrait = typeof window !== 'undefined'
          && window.innerHeight >= window.innerWidth;
        const long = measureHeightRef.current ? 1920 : 1280;
        const short = measureHeightRef.current ? 1080 : 720;
        const RES = portrait
          ? { width: { ideal: short }, height: { ideal: long } }
          : { width: { ideal: long }, height: { ideal: short } };
        const videoOpts = currentDeviceId
          ? { deviceId: { exact: currentDeviceId }, ...RES }
          : { facingMode: { ideal: 'environment' }, ...RES };

        stream = await navigator.mediaDevices.getUserMedia({ video: videoOpts });
        if (videoRef.current) videoRef.current.srcObject = stream;
        
        // Enumerate devices AFTER permissions are granted to get the full list
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = all.filter(d => d.kind === 'videoinput');
          setDevices(videoInputs);
        } catch (e) {
          console.error(e);
        }
        
        if (!landmarkerRef.current) {
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
            outputSegmentationMasks: true,
          });
          if (cancelled) return;
          landmarkerRef.current = lm;
        }
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
    return () => { 
      cancelled = true; 
      if (stream) stream.getTracks().forEach(t => t.stop()); 
    };
  }, [currentDeviceId]);

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

    // Height capture: fuse many frames rather than trusting one.
    //
    // A single frame is genuinely not enough here. At a normal full-body
    // distance the card spans only a few dozen pixels, so per-frame estimates
    // scatter by a couple of centimetres; the accumulator's median over ~24 of
    // them is far tighter than any one of them, and it also throws out the
    // frames where the detector latched onto a sleeve instead of the card.
    function runHeightFrame(lm, video, maskObj) {
      const acc = heightAccRef.current;
      const hc = heightCanvasRef.current || (heightCanvasRef.current = document.createElement('canvas'));
      hc.width = video.videoWidth;
      hc.height = video.videoHeight;
      const hctx = hc.getContext('2d', { willReadFrequently: true });
      hctx.drawImage(video, 0, 0, hc.width, hc.height);
      const img = hctx.getImageData(0, 0, hc.width, hc.height);

      const est = estimateHeightFrame(img.data, hc.width, hc.height, lm, maskObj, {
        sex: genderRef.current === 'Men' ? 'Male' : 'Female',
      });
      acc.add(est, est.frame);

      if (!est.ok) setHeightHint(HEIGHT_HINTS[est.reason] || null);
      else setHeightHint(null);

      setHeightProgress(Math.min(1, acc.count / HEIGHT_SAMPLES));
      const live = acc.result();
      if (live) {
        setDetectedHeight(Math.round(live.heightCm));
        setHeightSigma(live.sigmaCm);
        setHeightConfidence(live.confidence);
      }
      setHeightDebug({ ...(est.debug || {}), reason: est.reason, samples: acc.count });

      if (acc.count >= HEIGHT_SAMPLES) {
        const normalOverride = pitchRef.current != null
          ? normalFromCameraPitch(pitchRef.current) : null;
        const fin = acc.finalize({ normalOverride });
        if (fin) {
          setDetectedHeight(Math.round(fin.heightCm));
          setHeightSigma(fin.sigmaCm);
          setHeightConfidence(fin.confidence);
          setHeightError(false);
          setHeightHint(null);
          console.log('[SnapFit height] %scm +/- %scm  (n=%s/%s, pitchCorrected=%s)',
            fin.heightCm.toFixed(1), fin.sigmaCm.toFixed(1), fin.nUsed, fin.nTotal, fin.pitchCorrected);
        } else {
          setHeightError(true);
        }
        setCaptureFlash('height');
        setTimeout(() => setCaptureFlash(null), 1600);
        alignedSinceRef.current = null;
        setHoldProgress(0);
        goPhase('front');
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
        // Which part of the frame the user can actually see. The canvas is in
        // video pixels but displayed with object-fit: cover, so a frame shaped
        // differently from the stream crops the rest away.
        const safe = visibleRegion(
          canvas.width, canvas.height, canvas.clientWidth, canvas.clientHeight);
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
          if (cur === 'front' || cur === 'side' || cur === 'height') {
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

          if (cur === 'height') {
            const hcheck = checkHeightAlignment(lm);
            drawFrontGuide(ctx, canvas.width, canvas.height, hcheck.aligned, safe);
            setAligned(hcheck.aligned);
            if ((tickRef.current++ % 6) === 0) setReasons(hcheck.reasons);
            if (hcheck.aligned) {
              // The card scan is the expensive part of the frame, so it runs on
              // a fraction of frames; the pose check still runs on all of them.
              if ((heightTickRef.current++ % HEIGHT_EVERY_N) === 0) {
                runHeightFrame(lm, video, maskObj);
              }
            }
            raf = requestAnimationFrame(loop);
            return;
          }

          const isFront = cur === 'front';
          const check = (isFront ? checkFrontAlignment : checkSideAlignment)(lm);
          (isFront ? drawFrontGuide : drawSideGuide)(ctx, canvas.width, canvas.height, check.aligned, safe);

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
    reset, devices, switchCamera,
    detectedHeight, heightError, heightDebug,
    heightSigma, heightConfidence, heightProgress, heightHint,
  };
}
