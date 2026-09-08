import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Cpu,
  FileText,
  LayoutDashboard,
  Mic,
  PhoneCall,
  Settings,
  Shield,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Calls', path: '/app/calls', icon: PhoneCall },
  { name: 'Trusted Voices', path: '/app/trusted-voices', icon: Users },
  { name: 'Voice Profile', path: '/app/voice-profile', icon: Mic },
  { name: 'Security Events', path: '/app/security-events', icon: ShieldAlert },
  { name: 'Incidents', path: '/app/incidents', icon: FileText },
  { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { name: 'AI Status', path: '/app/ai-status', icon: Cpu },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-cyber-surface border-r border-cyber-border flex flex-col transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 shadow-cyan-glow">
              <Shield className="w-5 h-5 text-cyber-cyan" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-cyber-text flex items-center gap-1.5">
                VOXSHIELD <span className="text-cyber-cyan text-xs font-mono">AI</span>
              </h1>
              <p className="text-[10px] text-cyber-muted font-mono tracking-wider">
                Trust Every Voice.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-cyber-muted hover:text-cyber-text rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-cyber-card border border-cyber-cyan/40 text-cyber-cyan shadow-cyan-glow'
                      : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-card/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-cyber-border">
          <div className="bg-cyber-card/50 rounded-xl p-3 border border-cyber-border/60">
            <div className="flex items-center justify-between text-[11px] font-mono text-cyber-muted mb-1">
              <span>SECURITY ENGINE</span>
              <span className="text-cyber-emerald font-bold">ONLINE</span>
            </div>
            <div className="text-[10px] text-cyber-muted font-mono truncate">
              DTLS-SRTP P2P Encrypted
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
