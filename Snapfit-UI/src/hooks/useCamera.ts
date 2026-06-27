import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseCameraResult {
  stream: MediaStream | null;
  active: boolean;
  error: string | null;
  isInitializing: boolean;
  isSimulated: boolean;
  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<string>;
}

export function useCamera(): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setActive(false);
    setIsSimulated(false);
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    setIsInitializing(true);
    setError(null);
    setIsSimulated(false);

    // Stop existing stream if any
    if (streamRef.current) {
      stopCamera();
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera APIs are not supported in this browser environment.');
      }

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId };
      } else {
        videoConstraints.facingMode = 'user';
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setActive(true);
    } catch (err: any) {
      console.warn("Failed to initialize physical camera. Falling back to simulation mode.", err);
      
      // Check if it was a permission error
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera access in your settings or continue in Simulation Mode.');
      } else {
        setError(err.message || 'Camera is unavailable. Check connection.');
      }
      
      // Enable simulation mode so the prototype is still runnable
      setIsSimulated(true);
      setActive(true);
    } finally {
      setIsInitializing(false);
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(async (): Promise<string> => {
    if (isSimulated) {
      // In simulated mode, return a dummy image (e.g. a placeholder SVG or blank data URL)
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%231e1e24"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%234f46e5">SIMULATED SCAN CAPTURE</text></svg>');
        }, 300);
      });
    }

    if (!streamRef.current) {
      throw new Error('Camera is not active');
    }

    // Try to capture from a video element
    try {
      const video = document.createElement('video');
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        return dataUrl;
      }
      throw new Error('Canvas context not available');
    } catch (err) {
      console.error('Failed to capture frame from video element:', err);
      // Fallback
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%2338bdf8">SCAN CAPTURED</text></svg>';
    }
  }, [isSimulated]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream,
    active,
    error,
    isInitializing,
    isSimulated,
    startCamera,
    stopCamera,
    capturePhoto
  };
}
