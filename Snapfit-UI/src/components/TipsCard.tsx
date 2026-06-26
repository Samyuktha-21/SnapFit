import { Info, Sun, Ruler, CheckCircle, Video, UserCheck } from 'lucide-react';

export default function TipsCard() {
  const tips = [
    {
      icon: <UserCheck className="h-5 w-5 text-white" />,
      title: 'Stand Straight',
      desc: 'Keep your posture natural but straight, feet shoulder-width apart.'
    },
    {
      icon: <Video className="h-5 w-5 text-white" />,
      title: 'Align Entire Body',
      desc: 'Ensure your head, shoulders, hips, and feet fit inside the overlay boundaries.'
    },
    {
      icon: <Sun className="h-5 w-5 text-white" />,
      title: 'Good Lighting',
      desc: 'Stand in a well-lit area. Avoid harsh shadows or strong backlighting.'
    },
    {
      icon: <Ruler className="h-5 w-5 text-white" />,
      title: 'Fitted Clothes',
      desc: 'Wear fitted shirts/leggings for maximum MediaPipe segmentation accuracy.'
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-white" />,
      title: 'Camera Angle',
      desc: 'Position your device at chest height. Keep the lens straight and vertical.'
    }
  ];

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 md:p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-white/10 border border-white/20 p-2 text-white">
          <Info className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">Tips for Maximum Accuracy</h3>
      </div>
      
      <div className="grid gap-5">
        {tips.map((tip, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5 rounded-lg bg-black border border-neutral-700 p-1.5 h-8 w-8 flex items-center justify-center">
              {tip.icon}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{tip.title}</h4>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
