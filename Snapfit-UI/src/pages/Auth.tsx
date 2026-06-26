import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { Shirt, Mail, Lock } from 'lucide-react';

export default function Auth() {
  const { signUp, signIn, signInWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'Men' | 'Women'>('Men');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      if (isSignUp) {
        // Sign up stores email, default height 175cm, and selected gender
        await signUp(email, gender, 175);
      } else {
        await signIn(email);
      }
      navigate('/height-input');
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/height-input');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center py-12 px-6">
      {/* Background glow circle */}
      <div className="absolute top-[30%] left-[35%] h-[350px] w-[350px] rounded-full bg-white/5 blur-3xl pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8 shadow-2xl backdrop-blur-md"
      >
        {/* Brand Icon and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-2xl bg-white p-3 text-black shadow-lg shadow-white/10 mb-3">
            <Shirt className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isSignUp ? 'Create your profile' : 'Sign in to SnapFit'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isSignUp ? 'Enter your details to stand in the scan' : 'Retrieve your scans and recommendations'}
          </p>
        </div>

        {/* Tab Swapper */}
        <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1 mb-6">
          <button
            onClick={() => { setIsSignUp(false); setEmail(''); setPassword(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
              !isSignUp ? 'bg-slate-950 text-white border border-slate-800/60' : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setEmail(''); setPassword(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
              isSignUp ? 'bg-slate-950 text-white border border-slate-800/60' : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Inline Error banner */}
        {error && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3 mb-5 text-center">
            <span className="text-xs font-semibold text-red-400">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-650 focus:border-white focus:ring-1 focus:ring-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-650 focus:border-white focus:ring-1 focus:ring-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Gender selection (on signup only) */}
          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2"
            >
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Gender Path</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('Men')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    gender === 'Men'
                      ? 'border-white bg-white/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-450 hover:border-slate-700'
                  }`}
                >
                  Men (Chest size charts)
                </button>
                <button
                  type="button"
                  onClick={() => setGender('Women')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    gender === 'Women'
                      ? 'border-white bg-white/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-450 hover:border-slate-700'
                  }`}
                >
                  Women (Bust size charts)
                </button>
              </div>
            </motion.div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm py-3.5 shadow-lg shadow-white/10 transition-all cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Fit Profile' : 'Access Dashboard'}
          </button>
        </form>

        {/* Separator line */}
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-slate-900"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-600 uppercase font-bold tracking-wider">or</span>
          <div className="flex-grow border-t border-slate-900"></div>
        </div>

        {/* Google OAuth Simulation button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold text-sm py-3.5 transition-all duration-250 cursor-pointer disabled:opacity-40"
        >
          {/* Simple Vector Google Icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#ea4335"
              d="M12 5.04c1.72 0 3.27.59 4.49 1.76l3.35-3.35C17.82 1.48 15.13.75 12 .75c-4.63 0-8.59 2.66-10.49 6.55l3.86 2.99C6.28 7.37 8.92 5.04 12 5.04z"
            />
            <path
              fill="#4285f4"
              d="M23.25 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.31c-.27 1.43-1.08 2.65-2.3 3.47l3.58 2.78c2.09-1.92 3.66-4.75 3.66-8.38z"
            />
            <path
              fill="#fbbc05"
              d="M5.37 14.71c-.24-.73-.38-1.52-.38-2.33s.14-1.6.38-2.33L1.51 7.06C.54 9.05 0 11.27 0 12.62c0 1.35.54 3.57 1.51 5.56l3.86-2.99z"
            />
            <path
              fill="#34a853"
              d="M12 23.25c3.24 0 5.97-1.07 7.96-2.91l-3.58-2.78c-.99.66-2.26 1.06-3.8 1.06-3.08 0-5.72-2.33-6.63-5.25L2.09 16.36C4 20.25 7.96 23.25 12 23.25z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </motion.div>
    </div>
  );
}
