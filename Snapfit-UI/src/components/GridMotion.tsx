import { useEffect, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { gsap } from 'gsap';

interface GridMotionProps {
  items?: (string | ReactNode)[];
  gradientColor?: string;
}

const GridMotion: FC<GridMotionProps> = ({ items = [], gradientColor = 'black' }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const totalItems = 42;
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);
  const combinedItems = items.length > 0 ? items.slice(0, totalItems) : defaultItems;

  useEffect(() => {
    gsap.ticker.lagSmoothing(0);

    let autoPhase = 0;
    let isInteracting = false;
    let interactionTimeout: ReturnType<typeof setTimeout>;

    const handleMouseMove = (): void => {
      isInteracting = true;
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        isInteracting = false;
      }, 3000);
    };

    const updateMotion = (): void => {
      // Speed of the marquee (medium)
      if (!isInteracting) {
        autoPhase += 0.08;
      }

      rowRefs.current.forEach((row, index) => {
        if (row) {
          const direction = index % 2 === 0 ? 1 : -1;
          
          // Loop seamlessly across 1/3 of the container (since we have 3 duplicate sets of 7)
          const sectionPercent = 100 / 3;
          const currentPhase = autoPhase % sectionPercent;
          
          let xPercent = 0;
          if (direction === 1) {
             // Move right
             xPercent = -sectionPercent + currentPhase;
          } else {
             // Move left
             xPercent = -currentPhase;
          }

          gsap.set(row, {
            xPercent: xPercent
          });
        }
      });
    };

    const removeAnimationLoop = gsap.ticker.add(updateMotion);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      removeAnimationLoop();
      clearTimeout(interactionTimeout);
    };
  }, []);

  return (
    <div ref={gridRef} className="h-full w-full overflow-hidden">
      <section
        className="w-full h-screen overflow-hidden relative flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`
        }}
      >
        <div className="absolute inset-0 pointer-events-none z-[4] bg-[length:250px]"></div>
        <div className="gap-4 flex-none relative w-[600vw] md:w-[450vw] grid grid-rows-6 grid-cols-1 rotate-[-15deg] origin-center z-[2]">
          {Array.from({ length: 6 }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 w-full"
              style={{ gridTemplateColumns: 'repeat(24, 1fr)', willChange: 'transform' }}
              ref={el => {
                if (el) rowRefs.current[rowIndex] = el;
              }}
            >
              {Array.from({ length: 24 }, (_, itemIndex) => {
                const content = combinedItems[rowIndex * 8 + (itemIndex % 8)];
                return (
                  <div key={itemIndex} className="relative w-full aspect-square">
                    <div className="absolute inset-0 overflow-hidden rounded-[10px] bg-[#111] flex items-center justify-center text-white text-[1.5rem]">
                      {typeof content === 'string' && (content.startsWith('http') || content.startsWith('/') || content.match(/\.(jpeg|jpg|gif|png|webp)$/i)) ? (
                        <div
                          className="w-full h-full bg-cover bg-center absolute top-0 left-0"
                          style={{ backgroundImage: `url(${content})` }}
                        ></div>
                      ) : (
                        <div className="p-4 text-center z-[1]">{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="relative w-full h-full top-0 left-0 pointer-events-none"></div>
      </section>
    </div>
  );
};

export default GridMotion;
