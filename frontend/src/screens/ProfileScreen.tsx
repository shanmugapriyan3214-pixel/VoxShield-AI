import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Copy,
  Check,
  Shield,
  Lock,
  Users,
  Settings,
  LogOut,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Derive safe VoxShield ID
  const voxshieldId =
    (user as any)?.voxshield_id ||
    (user?.id ? `VS-${user.id.replace(/-/g, '').substring(0, 8).toUpperCase()}` : 'VS-USER001');

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(voxshieldId);
      setCopied(true);
      showToast('success', 'VoxShield ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Could not copy to clipboard');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex-1 flex flex-col p-5 overflow-y-auto select-none">
      {/* Profile Header Card */}
      <div className="flex flex-col items-center text-center my-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-1 shadow-xl shadow-cyan-500/20 mb-3">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-slate-100 font-bold text-3xl">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              (user?.display_name || user?.username || 'U').charAt(0).toUpperCase()
            )}
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-100">{user?.display_name || user?.username}</h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">@{user?.username}</p>
      </div>

      {/* VoxShield ID Prominent Card (Requirement 14) */}
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-cyan-500/30 shadow-md">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
          My VoxShield ID
        </span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-lg font-mono font-bold tracking-wider text-cyan-400 select-all">
            {voxshieldId}
          </span>
          <button
            type="button"
            onClick={handleCopyId}
            aria-label="Copy VoxShield ID"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Share this ID with other VoxShield users so they can dial your encrypted line directly.
        </p>
      </div>

      {/* Settings & Navigation Options List */}
      <div className="space-y-2 my-4">
        {/* Security Center */}
        <button
          type="button"
          onClick={() => navigate('/app/security-center')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-800 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Security Center</p>
              <p className="text-[11px] text-slate-400">Threat telemetry, alerts & verification</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Trusted Contacts */}
        <button
          type="button"
          onClick={() => navigate('/app/contacts')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-800 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Trusted Contacts</p>
              <p className="text-[11px] text-slate-400">Manage verified voice identity contacts</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Voice Profile Enrollment */}
        <button
          type="button"
          onClick={() => navigate('/app/voice-profile')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-800 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Voice Profile Enrollment</p>
              <p className="text-[11px] text-slate-400">Enroll baseline 192-dim speaker embedding</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Advanced System Tools (Judge / Demo Mode) */}
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-800 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">System & Admin Tools</p>
              <p className="text-[11px] text-slate-400">AI Status, Incidents, and Neural Models</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Logout Action */}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-850 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold transition-all active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};
