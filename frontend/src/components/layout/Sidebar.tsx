import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  GitCompare,
  LayoutDashboard,
  Mic,
  PhoneCall,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navItems = [
  { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Live Protection', path: '/app/calls', icon: PhoneCall },
  { name: 'Voice Analyzer', path: '/app/analyzer', icon: Mic },
  { name: 'Voice Verification', path: '/app/verify', icon: GitCompare },
  { name: 'Trusted Voices', path: '/app/trusted-voices', icon: Users },
  { name: 'Threat History', path: '/app/threat-history', icon: ShieldAlert },
  { name: 'Incident Reports', path: '/app/incidents', icon: FileText },
  { name: 'Security & Privacy', path: '/app/settings', icon: ShieldCheck },
  { name: 'API / Integration', path: '/app/api-docs', icon: Code2 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-[#0D131F] border-r border-[#1B253B] flex flex-col transition-all duration-300 shadow-xl md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-[#1B253B] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-cyan-glow shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="text-sm font-bold tracking-wider text-white flex items-center gap-1.5 font-sans">
                  VOXSHIELD <span className="text-cyan-400 text-[10px] font-mono font-extrabold px-1 py-0.5 rounded bg-cyan-500/20">AI</span>
                </h1>
                <p className="text-[10px] text-slate-400 tracking-tight leading-tight">
                  Voice Security &amp; Identity
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold">
              Core Security Modules
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`
                }
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Footer with Collapse Toggle */}
        <div className="p-3 border-t border-[#1B253B] flex items-center justify-between text-xs">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RADAR SHIELD ACTIVE</span>
            </div>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition ml-auto"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
