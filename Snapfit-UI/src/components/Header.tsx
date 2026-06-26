import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shirt, Sparkles, LogOut, User } from 'lucide-react';

export default function Header() {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-4 md:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-slate-800/80 bg-slate-950/75 backdrop-blur-md px-6 py-4 shadow-xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-2 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-400 bg-clip-text text-transparent tracking-tight">
                SnapFit
              </span>
              <span className="hidden sm:block text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
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
            {isAuthenticated && (
              <>
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
              </>
            )}
            <NavLink
              to="/upload-brand"
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-white bg-slate-900 border border-slate-800/60' 
                    : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-900/30'
                }`
              }
            >
              For Brands
            </NavLink>
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* Premium tag */}
                {user.is_premium ? (
                  <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-3 py-1 text-xs font-semibold text-black shadow-lg shadow-yellow-500/10">
                    <Sparkles className="h-3 w-3 fill-black" />
                    <span>Premium</span>
                  </div>
                ) : (
                  <Link
                    to="/brands"
                    state={{ openUpgrade: true }}
                    className="hidden sm:flex items-center gap-1 rounded-full bg-indigo-950 border border-indigo-500/30 hover:border-indigo-500/60 px-3 py-1 text-xs font-semibold text-indigo-300 hover:text-white transition-all"
                  >
                    <span>Upgrade</span>
                  </Link>
                )}
                
                {/* Profile card */}
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-300 max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {user.gender} • {user.height_cm}cm
                  </span>
                </div>

                <div className="h-8 w-8 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-300">
                  <User className="h-4 w-4" />
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-red-950/20 hover:border-red-900/50 p-2 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm px-5 py-2.5 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
