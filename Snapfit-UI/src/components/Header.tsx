import { Link, NavLink, useLocation } from 'react-router-dom';
import { Shirt } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  if (location.pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-4 md:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md px-6 py-4 shadow-xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-xl bg-white p-2 text-black shadow-md shadow-white/10 group-hover:scale-105 transition-transform duration-200">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">
                SnapFit
              </span>
              <span className="hidden sm:block text-[10px] text-neutral-400 font-medium tracking-wider uppercase">
                Universal Fit Engine
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-white bg-slate-900 border border-slate-800/60' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/height-input"
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-white bg-slate-900 border border-slate-800/60' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`
              }
            >
              Scan Fit
            </NavLink>
            <NavLink
              to="/brands"
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-white bg-slate-900 border border-slate-800/60' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`
              }
            >
              Brand Grid
            </NavLink>
            <NavLink
              to="/comparison"
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-white bg-slate-900 border border-slate-800/60' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`
              }
            >
              Comparison View
            </NavLink>
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-3">
          </div>
        </div>
      </div>
    </header>
  );
}
