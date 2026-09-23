import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  PhoneCall,
  Users,
  Grid,
  User as UserIcon,
  Shield,
  Wifi,
  Battery,
  Signal,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PhoneLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState('');

  // Digital clock for phone status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: 'Home', path: '/app/home', icon: Home },
    { label: 'Recents', path: '/app/calls', icon: PhoneCall },
    { label: 'Contacts', path: '/app/contacts', icon: Users },
    { label: 'Keypad', path: '/app/keypad', icon: Grid },
    { label: 'Profile', path: '/app/profile', icon: UserIcon },
  ];

  const isCurrentCallScreen = location.pathname.startsWith('/app/calls/') && location.pathname !== '/app/calls';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center sm:p-4 md:p-6 overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Smartphone Container Shell */}
      <div className="w-full max-w-md h-screen sm:h-[860px] sm:max-h-[95vh] bg-slate-900 sm:rounded-[44px] shadow-2xl sm:shadow-cyan-950/40 border-0 sm:border sm:border-slate-800/80 flex flex-col overflow-hidden relative transition-all duration-300">
        {/* Phone Top Notch & Status Bar */}
        <div className="h-11 px-6 bg-slate-950/70 backdrop-blur-md flex items-center justify-between text-xs text-slate-300 shrink-0 z-30 select-none border-b border-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-xs font-mono">{currentTime}</span>
            <span className="text-[10px] text-cyan-400 font-medium tracking-wider hidden sm:inline">
              VOXSHIELD
            </span>
          </div>

          {/* Notch Pill Center (Mobile Phone Aesthetic) */}
          <div className="hidden sm:flex items-center justify-center">
            <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800/50">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-1.5" />
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/80 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Dynamic App Content Outlet */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative pb-2 sm:pb-0">
          <Outlet />
        </main>

        {/* Bottom Phone Navigation Bar (Hidden during active phone calls) */}
        {!isCurrentCallScreen && (
          <nav
            aria-label="Main Navigation"
            className="h-16 px-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 flex items-center justify-around shrink-0 z-30 select-none"
          >
            {navItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-14 py-1 rounded-2xl transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'text-cyan-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`p-1 rounded-xl transition-all ${
                        isActive ? 'bg-cyan-500/15' : 'bg-transparent'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] tracking-tight mt-0.5">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};
