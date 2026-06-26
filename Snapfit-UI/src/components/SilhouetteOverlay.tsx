import { useMemo } from 'react';

interface SilhouetteOverlayProps {
  gender: 'Men' | 'Women';
  isAligned: boolean;
}

export default function SilhouetteOverlay({ gender, isAligned }: SilhouetteOverlayProps) {
  // SVG paths representing stylized silhouettes
  const silhouettePath = useMemo(() => {
    if (gender === 'Men') {
      // Stylized male silhouette: Broad shoulders, narrower waist, straight hips
      return (
        <path
          d="M 640 100 
             C 615 100, 605 130, 605 155 
             C 605 180, 620 200, 640 200 
             C 660 200, 675 180, 675 155 
             C 675 130, 665 100, 640 100 Z 
             M 640 200 
             L 640 215 
             M 605 215 
             L 675 215 
             C 675 215, 715 220, 725 250 
             L 730 330 
             L 715 330 
             L 710 270 
             C 700 270, 690 350, 690 420 
             L 695 560 
             L 695 650 
             C 695 660, 680 660, 680 650 
             L 675 500 
             L 640 500 
             L 605 500 
             L 600 650 
             C 600 660, 585 660, 585 650 
             L 585 560 
             L 590 420 
             C 590 350, 580 270, 570 270 
             L 565 330 
             L 550 330 
             L 555 250 
             C 565 220, 605 215, 605 215 Z"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    } else {
      // Stylized female silhouette: Curved waist, broader hips
      return (
        <path
          d="M 640 110 
             C 620 110, 610 135, 610 155 
             C 610 175, 620 195, 640 195 
             C 660 195, 670 175, 670 155 
             C 670 135, 660 110, 640 110 Z 
             M 640 195 
             L 640 210 
             M 615 210 
             L 665 210 
             C 665 210, 695 215, 700 240 
             L 705 320 
             L 690 320 
             L 688 260 
             C 678 265, 692 345, 685 410 
             C 680 450, 690 560, 685 640 
             C 685 650, 670 650, 670 640 
             L 665 490 
             L 640 490 
             L 615 490 
             L 610 640 
             C 610 650, 595 650, 595 640 
             C 590 560, 600 450, 595 410 
             C 588 345, 602 265, 592 260 
             L 590 320 
             L 575 320 
             L 580 240 
             C 585 215, 615 210, 615 210 Z"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
  }, [gender]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <svg
        viewBox="0 0 1280 720"
        className={`w-full h-full object-cover transition-colors duration-500 ${
          isAligned 
            ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
            : 'text-neutral-500/50 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]'
        }`}
      >
        {silhouettePath}

        {/* Target Guide Aligners (dashed box and dots) */}
        {/* Head Target */}
        <circle 
          cx="640" 
          cy="150" 
          r="8" 
          className={`fill-transparent stroke-2 ${isAligned ? 'stroke-white fill-white/10' : 'stroke-neutral-400/40'}`} 
        />
        {/* Chest Center Target */}
        <circle 
          cx="640" 
          cy="280" 
          r="6" 
          className={`fill-transparent stroke-2 ${isAligned ? 'stroke-white fill-white/10' : 'stroke-neutral-400/30'}`} 
        />
        {/* Feet base indicator */}
        <ellipse 
          cx="640" 
          cy="650" 
          rx="60" 
          ry="15" 
          className={`fill-none stroke-2 ${isAligned ? 'stroke-white' : 'stroke-neutral-500/30'} stroke-dasharray-[4,4]`} 
        />

        {/* Alignment instructions text inside overlay */}
        <rect 
          x="440" 
          y="20" 
          width="400" 
          height="45" 
          rx="12" 
          className={`fill-black/80 stroke transition-all duration-300 ${isAligned ? 'stroke-white/40' : 'stroke-neutral-800'}`}
        />
        <text 
          x="640" 
          y="48" 
          textAnchor="middle" 
          className={`text-sm font-bold tracking-wider font-sans transition-colors ${isAligned ? 'fill-white' : 'fill-neutral-400/80'}`}
        >
          {isAligned ? '✓ ALIGNMENT CORRECT' : 'POSITION BODY WITHIN THE OUTLINE'}
        </text>
      </svg>
    </div>
  );
}
