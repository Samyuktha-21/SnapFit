import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number; // 0: Height, 1: Capture, 2: Analyze, 3: Results
}

export default function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const steps = [
    { label: 'Height', desc: 'Enter details' },
    { label: 'Capture', desc: 'Webcam scan' },
    { label: 'Analyze', desc: 'Calculate measurements' },
    { label: 'Results', desc: 'View recommendations' }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > idx;
          const isActive = currentStep === idx;
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center relative">
              {/* Connector Line */}
              {idx < steps.length - 1 && (
                <div 
                  className={`absolute top-5 left-1/2 right-[-50%] h-[2px] -z-10 transition-colors duration-300 ${
                    isCompleted 
                      ? 'bg-neutral-300' 
                      : 'bg-neutral-800'
                  }`} 
                />
              )}
              
              {/* Step Circle */}
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-white border-white text-black shadow-md shadow-white/20' 
                    : isActive
                      ? 'bg-black border-white text-white scale-110 shadow-lg shadow-white/10'
                      : 'bg-black border-neutral-800 text-neutral-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 stroke-[2.5]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Text labels */}
              <span 
                className={`mt-2.5 text-xs font-semibold tracking-wide transition-colors ${
                  isActive ? 'text-white font-bold' : isCompleted ? 'text-neutral-300' : 'text-neutral-500'
                }`}
              >
                {step.label}
              </span>
              <span className="hidden sm:block text-[10px] text-neutral-600 mt-0.5">
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
