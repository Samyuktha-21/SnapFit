import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, X } from 'lucide-react';

type PanelKey = 'about' | 'contact' | 'disclaimer';

const PANELS: Record<PanelKey, { title: string; body: ReactNode }> = {
  about: {
    title: 'About SnapFit',
    body: (
      <div className="space-y-4 text-sm leading-relaxed text-neutral-300">
        <p>
          A medium in one label is an extra-large in another. SnapFit started
          with that frustration and turned the fitting room into something that
          lives in your camera.
        </p>
        <p>
          One quick scan reads your proportions, and our model translates them
          into the size that actually fits across the brands you shop. No measuring
          tape, no second-guessing at checkout, far fewer returns.
        </p>
        <p className="text-neutral-400">
          Your scan is processed on your own device. The image never leaves your
          browser.
        </p>
      </div>
    ),
  },
  contact: {
    title: 'Contact',
    body: (
      <div className="space-y-5 text-sm text-neutral-300">
        <p className="leading-relaxed">
          Questions, press, or a brand that wants to be sized on SnapFit? Reach us
          directly. We reply within two business days.
        </p>
        <div className="space-y-3">
          <a href="mailto:hello@snapfit.style" className="flex items-center gap-3 text-neutral-200 hover:text-white transition-colors">
            <Mail className="h-4 w-4" /> hello@snapfit.style
          </a>
          <a href="mailto:partners@snapfit.style" className="flex items-center gap-3 text-neutral-200 hover:text-white transition-colors">
            <Mail className="h-4 w-4" /> partners@snapfit.style <span className="text-neutral-500">(brands &amp; press)</span>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-neutral-200 hover:text-white transition-colors">
            <span className="inline-flex h-4 w-4 items-center justify-center text-base leading-none">@</span> snapfit
          </a>
        </div>
      </div>
    ),
  },
  disclaimer: {
    title: 'Disclaimer',
    body: (
      <div className="space-y-4 text-sm leading-relaxed text-neutral-300">
        <p>
          SnapFit size recommendations are estimates produced by a statistical body
          model and a camera-based scan. They are guidance, not guarantees.
        </p>
        <p>
          Real garments vary by cut, fabric, and brand, so always check a brand's
          own size chart before buying. The scan is computed on your device and is
          not a medical or professional tailoring assessment.
        </p>
        <p className="text-neutral-400">
          SnapFit is not liable for fit or purchase decisions made using these
          estimates.
        </p>
      </div>
    ),
  },
};

export default function Footer() {
  const [open, setOpen] = useState<PanelKey | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const linkClass = 'text-sm tracking-wide text-neutral-300 hover:text-white transition-colors cursor-pointer';

  return (
    <footer className="w-full relative z-10 mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Spacer to keep nav centered on desktop */}
        <div className="hidden md:block flex-1" />
        
        {/* The three options, centered — wrapped in a semi-transparent pill so the
            text stays readable against the scrolling image grid behind the footer. */}
        <nav className="flex items-center justify-center gap-5 sm:gap-7 rounded-full bg-black/60 backdrop-blur-sm px-5 py-2.5 border border-white/10">
          <button onClick={() => setOpen('about')} className={linkClass}>About</button>
          <Link to="/contact" className={linkClass}>Contact</Link>
          <button onClick={() => setOpen('disclaimer')} className={linkClass}>Disclaimer</button>
        </nav>

        {/* Copyright */}
        <div className="flex-1 flex justify-center md:justify-end">
          <span className="text-sm text-neutral-500 font-medium">© 2026 SnapFit</span>
        </div>
      </div>

      {/* Panel modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              role="dialog" aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-950 p-8 shadow-2xl"
            >
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="absolute top-5 right-5 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-display text-3xl text-white mb-5">{PANELS[open].title}</h2>
              {PANELS[open].body}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
