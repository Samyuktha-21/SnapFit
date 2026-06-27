import { Shirt, Ruler } from 'lucide-react';

interface Props {
  className?: string;
}

export default function Logo({ className = 'h-6 w-6' }: Props) {
  return (
    <img 
      src="/logo.png" 
      alt="SnapFit Logo" 
      className={`object-contain ${className}`}
      aria-hidden="true"
    />
  );
}
