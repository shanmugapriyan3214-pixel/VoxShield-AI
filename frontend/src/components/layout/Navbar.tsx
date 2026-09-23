import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ServerStatusBadge } from '../common/ServerStatusBadge';
import {
  Bell,
  Lock,
  LogOut,
  Menu,
  Search,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        {/* Left: Mobile Menu & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input */}
          <div className="relative w-full hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search threats, caller identities, incidents..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Center: Live Protection Security Status & Server Status */}
        <div className="flex items-center gap-2">
          <ServerStatusBadge />
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono tracking-tight text-[11px] font-bold uppercase">LIVE PROTECTION</span>
            <span className="text-[10px] text-emerald-600/80 font-normal">| P2P Encrypted</span>
          </div>
        </div>

        {/* Right: Notifications, Privacy Badge & User Menu */}
        <div className="flex items-center gap-3">
          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 text-xs space-y-2">
                <div className="font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Security Notifications</span>
                  <span className="text-[10px] text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded font-mono font-bold">LIVE</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-[11px] text-slate-600 space-y-1">
                  <div className="font-medium text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Multi-Signal Radar Active
                  </div>
                  <p className="text-slate-500 text-[10px]">AASIST-L and local DSP engines calibrated and ready.</p>
                </div>
              </div>
            )}
          </div>

          {/* Zero-Audio Invariant Info Link */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 text-xs font-mono transition border border-transparent hover:border-cyan-200"
            title="Privacy architecture guarantees"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-[11px]">Zero-Audio P2P</span>
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.display_name ? user.display_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                {user?.display_name || user?.username || 'Security Officer'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                {user?.email || 'operator@voxshield'}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            title="Sign out of VOXSHIELD"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Privacy Guarantee Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Zero-Server-Audio Privacy Invariant</h3>
                <p className="text-xs text-slate-500">VOXSHIELD Architectural Safeguards</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong className="text-slate-900">1. WebRTC DTLS-SRTP P2P:</strong> Live conversation audio travels directly between endpoints without traversing cloud media servers.
              </p>
              <p>
                <strong className="text-slate-900">2. Zero Server Audio Storage:</strong> Raw voice audio is NEVER stored, tapped, recorded, or reconstructed on backend servers.
              </p>
              <p>
                <strong className="text-slate-900">3. Mathematical Telemetry Only:</strong> Clients compute lightweight DSP feature vectors (~2.4 KB/s) for AI threat evaluation.
              </p>
            </div>

            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition shadow-sm"
            >
              Acknowledge &amp; Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
