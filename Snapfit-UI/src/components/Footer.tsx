import { Shirt } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-900 bg-slate-950 py-12 px-6 mt-auto">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-400">
            <Shirt className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-slate-400">
            SnapFit <span className="text-xs font-normal text-slate-600">v1.0.0</span>
          </span>
        </div>
        <p className="text-xs text-slate-600 text-center md:text-right">
          © 2026 SnapFit Hackathon Project. All rights reserved. Measure once. Fit everywhere.
        </p>
      </div>
    </footer>
  );
}
