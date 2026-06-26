import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, CreditCard, Shield } from 'lucide-react';
import { stripeService } from '../services/stripe';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { user } = useMeasurementStore();
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    try {
      // Create Stripe checkout redirect URL
      const mockCheckoutUrl = await stripeService.createCheckoutSession({
        email: user.email,
        priceId: 'price_mock_premium_499',
        successUrl: '/brands?payment=success',
        cancelUrl: '/brands?payment=cancel'
      });
      
      onClose();
      // Navigate to the local mock Stripe page
      navigate(mockCheckoutUrl);
    } catch (err) {
      console.error("Failed to start checkout", err);
    }
  };

  const perks = [
    'Unlock Oversized fits across all brands',
    'Unlock premium and custom-uploaded brands',
    'Side-by-side comparative sizing dashboard',
    'Persistent scan measurements and historical logs',
    'Exportable size data profiles for online shopping'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg rounded-3xl border border-indigo-500/30 bg-slate-900 shadow-2xl overflow-hidden p-6 md:p-8"
          >
            {/* Background Accent Gradients */}
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900 p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center mt-2">
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-yellow-500/30 px-3 py-1 text-xs font-semibold text-yellow-400 mb-4 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 fill-yellow-400" />
                <span>SnapFit Premium</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Unlock Your Perfect Fit</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Upgrade to get full sizing recommendations across fits and comparative side-by-side matrices.
              </p>
            </div>

            {/* Price Box */}
            <div className="my-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center">
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Premium Subscription</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-4xl font-black text-white tracking-tight">$4.99</span>
                <span className="text-sm font-semibold text-slate-400">/ month</span>
              </div>
              <p className="text-[10px] text-indigo-400 font-semibold mt-1">Mock test card payment checkout</p>
            </div>

            {/* Perks List */}
            <div className="space-y-3 mb-8">
              {perks.map((perk, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-indigo-950 border border-indigo-500/25 p-0.5 text-indigo-400 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-medium text-slate-300 leading-normal">{perk}</span>
                </div>
              ))}
            </div>

            {/* Checkout Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCheckout}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-bold text-sm py-4 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>Unlock with Stripe Test Mode</span>
              </button>
              
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 mt-2">
                <Shield className="h-3 w-3" />
                <span>Secured Mock Sandbox. No actual billing.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
