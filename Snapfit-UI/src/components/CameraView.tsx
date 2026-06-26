import { useEffect, useRef } from 'react';
import { CameraOff, RefreshCw, Cpu } from 'lucide-react';
import SilhouetteOverlay from './SilhouetteOverlay';

interface CameraViewProps {
  stream: MediaStream | null;
  active: boolean;
  isSimulated: boolean;
  error: string | null;
  gender: 'Men' | 'Women';
  isAligned: boolean;
  onAlignedChange: (aligned: boolean) => void;
  onRetry: () => void;
}

export default function CameraView({
  stream,
  active,
  isSimulated,
  error,
  gender,
  isAligned,
  onAlignedChange,
  onRetry
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hook stream to video element
  useEffect(() => {
    if (videoRef.current && stream && !isSimulated) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isSimulated]);

  // Simulate skeleton keypoints on canvas if simulated is active
  useEffect(() => {
    if (!isSimulated || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let tick = 0;
    
    const drawSimulation = () => {
      tick += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw cybernetic scanning grid background
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw horizontal scanning laser
      const laserY = (Math.sin(tick * 0.5) + 1) * 0.5 * canvas.height;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, laserY);
      ctx.lineTo(canvas.width, laserY);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Determine center coords
      const cx = canvas.width / 2;

      // Mock user drift (simulates standing and aligning)
      const driftX = Math.sin(tick) * 15;
      const driftY = Math.cos(tick * 0.8) * 8;

      // Check alignment: user is aligned if they drift close to center (simulated behavior)
      const userAligned = Math.abs(driftX) < 12 && Math.abs(driftY) < 6;
      onAlignedChange(userAligned);

      // Color scheme based on alignment
      const themeColor = userAligned ? 'rgb(16, 185, 129)' : 'rgb(99, 102, 241)';

      // Draw simulated body skeleton keypoints (Head, shoulders, hips, knees, ankles)
      const head = { x: cx + driftX, y: 155 + driftY };
      const shL = { x: cx - 60 + driftX, y: 215 + driftY };
      const shR = { x: cx + 60 + driftX, y: 215 + driftY };
      const hipL = { x: cx - 40 + driftX, y: 490 + driftY };
      const hipR = { x: cx + 40 + driftX, y: 490 + driftY };
      const kneeL = { x: cx - 42 + driftX, y: 570 + driftY };
      const kneeR = { x: cx + 42 + driftX, y: 570 + driftY };
      const ankleL = { x: cx - 45 + driftX, y: 645 + driftY };
      const ankleR = { x: cx + 45 + driftX, y: 645 + driftY };
      
      const keypoints = [head, shL, shR, hipL, hipR, kneeL, kneeR, ankleL, ankleR];

      // Draw bones
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 4;

      // Shoulders
      ctx.beginPath();
      ctx.moveTo(shL.x, shL.y);
      ctx.lineTo(shR.x, shR.y);
      ctx.stroke();

      // Hips
      ctx.beginPath();
      ctx.moveTo(hipL.x, hipL.y);
      ctx.lineTo(hipR.x, hipR.y);
      ctx.stroke();

      // Torso sides
      ctx.beginPath();
      ctx.moveTo(shL.x, shL.y);
      ctx.lineTo(hipL.x, hipL.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(shR.x, shR.y);
      ctx.lineTo(hipR.x, hipR.y);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(hipL.x, hipL.y);
      ctx.lineTo(kneeL.x, kneeL.y);
      ctx.lineTo(ankleL.x, ankleL.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hipR.x, hipR.y);
      ctx.lineTo(kneeR.x, kneeR.y);
      ctx.lineTo(ankleR.x, ankleR.y);
      ctx.stroke();

      ctx.shadowBlur = 0; // reset

      // Draw joint dots
      ctx.fillStyle = '#ffffff';
      keypoints.forEach((kp) => {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Simulation details overlay UI
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      
      // Info box
      ctx.beginPath();
      ctx.roundRect(15, 15, 280, 80, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('CAMERA MODE: SIMULATOR', 30, 38);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Gender Path: ' + gender, 30, 56);
      ctx.fillText('Pose Tracking: Active (MediaPipe Mock)', 30, 72);

      // Pulse indicator
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(260, 34, 5, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(drawSimulation);
    };

    drawSimulation();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isSimulated, gender, onAlignedChange]);

  // Handle standard stream alignment fallback (if physical camera works)
  useEffect(() => {
    if (isSimulated || !active) return;
    
    // For real camera, we simulate alignment status toggle on a timer for the hackathon prototype
    const timer = setInterval(() => {
      onAlignedChange(true);
    }, 2000);

    return () => clearInterval(timer);
  }, [isSimulated, active, onAlignedChange]);

  // 1. Loading state
  if (!active && !error) {
    return (
      <div className="flex h-[450px] w-full flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 p-6 text-center">
        <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Initializing camera stream...</p>
      </div>
    );
  }

  // 2. Error state
  if (error && !isSimulated) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-red-900/40 bg-slate-950/80 p-8 text-center max-w-xl mx-auto border-dashed shadow-2xl">
        <div className="rounded-full bg-red-950/40 border border-red-800/40 p-4 text-red-500 mb-4 shadow-inner">
          <CameraOff className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Camera Access Blocked</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          {error}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-white font-semibold text-sm px-5 py-3 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          
          <button
            onClick={() => {
              // Trigger simulation mode manually via retry with simulation enabled
              onRetry();
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm px-6 py-3 shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
          >
            <Cpu className="h-4 w-4" />
            <span>Start Simulator Mode</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Active state
  return (
    <div className="relative w-full h-full min-h-[480px] md:min-h-[580px] rounded-3xl overflow-hidden border border-slate-800/60 bg-slate-950 shadow-2xl">
      {isSimulated ? (
        // Simulated Feed Canvas
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full min-h-[480px] md:min-h-[580px] object-cover scale-x-[-1]"
        />
      ) : (
        // Physical Camera Video
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full min-h-[480px] md:min-h-[580px] object-cover scale-x-[-1]"
        />
      )}

      {/* MediaPipe Guideline Silhouette Overlay */}
      <SilhouetteOverlay gender={gender} isAligned={isAligned} />

      {/* Floating guidelines banner */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur border border-slate-800/50 rounded-2xl px-6 py-3 shadow-xl max-w-sm w-[90%] text-center pointer-events-none">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>Keep your entire body visible inside outline</span>
        </div>
      </div>
    </div>
  );
}
