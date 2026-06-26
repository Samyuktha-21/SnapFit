import { Shirt } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full relative z-10 py-12 px-6 mt-auto">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 drop-shadow-xl">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-black/5 p-2 text-black shadow-sm">
            <Shirt className="h-4 w-4" />
          </div>
          <span className="text-base font-black tracking-wide text-black">
            SnapFit
          </span>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-black tracking-wide text-black">
          <a href="#" className="hover:text-neutral-700 transition-colors">About Us</a>
          <a href="#" className="hover:text-neutral-700 transition-colors">Contacts</a>
        </div>

        <p className="text-xs font-bold tracking-wide text-black text-center md:text-right">
          © {new Date().getFullYear()} @SnapFit
        </p>
      </div>
    </footer>
  );
}
