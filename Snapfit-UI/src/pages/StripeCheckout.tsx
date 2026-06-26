import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { ShieldCheck, CreditCard, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StripeCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setPremium } = useMeasurementStore();

  const email = searchParams.get('email') || 'test.user@example.com';
  const successUrl = searchParams.get('successUrl') || '/brands?payment=success';
  const cancelUrl = searchParams.get('cancelUrl') || '/brands';

  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    // Simple validation (must enter test card)
    const cleanedCard = cardNumber.replace(/\s/g, '');
    if (cleanedCard !== '4242424242424242') {
      setErrorMsg('Invalid card number. Please use Stripe test card number: 4242 4242 4242 4242');
      return;
    }

    setLoading(true);

    // Simulate Stripe payment processing latency
    setTimeout(() => {
      setLoading(false);
      setPremium(true);
      navigate(successUrl);
    }, 2000);
  };

  const autofillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('424');
    setName('Jane Doe');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-300">
      
      {/* 1. LEFT PANEL: ORDER SUMMARY */}
      <div className="flex-1 bg-slate-950 border-r border-slate-900 p-8 md:p-16 flex flex-col justify-between">
        <div>
          {/* Back link */}
          <button
            onClick={() => navigate(cancelUrl)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-350 text-xs font-bold uppercase mb-8 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Cancel and return</span>
          </button>

          {/* Stripe Badge Header */}
          <div className="flex items-center gap-2 mb-6">
            <span className="font-bold text-slate-450 tracking-wider text-sm font-sans uppercase">Stripe</span>
            <span className="rounded bg-amber-500/20 border border-yellow-500/30 text-yellow-500 font-black text-[9px] uppercase px-1.5 py-0.5 tracking-wider">
              Test Mode
            </span>
          </div>

          <div className="space-y-2 mt-8">
            <span className="text-xs font-bold text-slate-550 uppercase tracking-wide">Subscribe to</span>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-yellow-400 fill-yellow-400/20" />
              <span>SnapFit Premium</span>
            </h1>
            <p className="text-sm text-slate-450 max-w-sm mt-3">
              Unlimited sizing recommendations, oversized fit charts, and comparative matrix dashboards.
            </p>
          </div>

          {/* Pricing detail */}
          <div className="flex items-baseline gap-1.5 mt-10">
            <span className="text-5xl font-black text-white font-sans tracking-tighter">$4.99</span>
            <span className="text-slate-400 text-sm font-medium">/ month</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="hidden md:flex items-center gap-2 text-slate-600 text-xs mt-10">
          <ShieldCheck className="h-4.5 w-4.5 text-slate-500" />
          <span>Powered by Stripe. Mock Sandbox simulation.</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: PAYMENTS FORM */}
      <div className="flex-1 bg-slate-900/40 p-8 md:p-16 flex items-center justify-center">
        <div className="w-full max-w-md">
          <h2 className="text-lg font-bold text-white mb-6">Payment Details</h2>

          {/* Test Card Quick fill Alert */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Stripe Mock Simulator</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  To complete authorization, use credit card number <code className="text-white font-semibold">4242 4242 4242 4242</code>.
                </p>
                <button
                  type="button"
                  onClick={autofillTestCard}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 mt-2 underline cursor-pointer"
                >
                  Autofill test credentials
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3 mb-5 text-center text-xs font-semibold text-red-400">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            {/* Pre-filled email */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-500 cursor-not-allowed focus:outline-none"
              />
            </div>

            {/* Card Information */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Card Information</label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-650" />
                <input
                  type="text"
                  required
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-700 focus:border-indigo-500/80 focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm text-white placeholder-slate-700 focus:border-indigo-500/80 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="CVC"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm text-white placeholder-slate-700 focus:border-indigo-500/80 focus:outline-none"
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Name on Card</label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-700 focus:border-indigo-500/80 focus:outline-none"
              />
            </div>

            {/* Pay Action CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-4 shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Authorizing payment...</span>
                </>
              ) : (
                <span>Subscribe for $4.99 / mo</span>
              )}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
