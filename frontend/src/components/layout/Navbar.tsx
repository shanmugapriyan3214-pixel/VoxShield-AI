import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, LogOut, Menu, Shield, User } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <>
      <header className="h-16 bg-cyber-surface/80 border-b border-cyber-border/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-cyber-muted hover:text-cyber-text hover:bg-cyber-card rounded-lg transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30 shadow-emerald-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-ping mr-1.5" />
              SYSTEM PROTECTED
            </span>
          </div>
        </div>

        {/* Center: Privacy Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-bg/80 border border-cyber-border text-xs font-mono text-cyber-muted cursor-pointer hover:border-cyber-cyan/50 transition-colors"
          onClick={() => setShowPrivacyModal(true)}
          title="Click to view Zero-Server-Audio Privacy Invariants"
        >
          <Lock className="w-3.5 h-3.5 text-cyber-cyan" />
          <span>Audio stays peer-to-peer (DTLS-SRTP)</span>
          <span className="text-[10px] bg-cyber-cyan/15 text-cyber-cyan px-1.5 py-0.5 rounded font-bold">INFO</span>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pl-3 border-l border-cyber-border/80">
            <div className="w-8 h-8 rounded-full bg-cyber-card border border-cyber-border flex items-center justify-center text-cyber-cyan font-bold text-xs">
              {user?.display_name ? user.display_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-cyber-text truncate max-w-[120px]">
                {user?.display_name || user?.username}
              </span>
              <span className="text-[10px] text-cyber-muted font-mono truncate max-w-[120px]">
                {user?.email}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 text-cyber-muted hover:text-cyber-crimson hover:bg-cyber-card rounded-lg transition-colors"
            title="Sign out of VoxShield"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-surface border border-cyber-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-cyber-text">Zero-Server-Audio Privacy Invariant</h3>
                <p className="text-xs text-cyber-muted">Cryptographic voice security principles</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-cyber-muted leading-relaxed">
              <p>
                <strong className="text-cyber-text">1. Peer-to-Peer Encryption:</strong> All live call audio flows directly between WebRTC clients over end-to-end encrypted <strong className="text-cyber-cyan">DTLS-SRTP</strong>.
              </p>
              <p>
                <strong className="text-cyber-text">2. Zero Server Audio:</strong> Unencrypted voice call buffers are <strong className="text-cyber-emerald">NEVER</strong> transmitted to, processed on, or stored in VoxShield AI backend servers.
              </p>
              <p>
                <strong className="text-cyber-text">3. Edge Telemetry:</strong> Only non-reconstructable mathematical indicators (e.g. synthetic probability, liveness scores) are sent for threat scoring.
              </p>
              <p>
                <strong className="text-cyber-text">4. Biometric Protection:</strong> Raw voice embedding vectors are encrypted and never returned via public APIs.
              </p>
            </div>

            <button
              onClick={() => setShowPrivacyModal(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border text-xs font-semibold text-cyber-text transition-colors"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
