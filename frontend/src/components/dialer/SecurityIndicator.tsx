import React from 'react';
import { ThreatLevel } from '../../types/domain';
import { Shield, ShieldAlert, AlertTriangle, AlertOctagon } from 'lucide-react';

interface SecurityIndicatorProps {
  threatLevel: ThreatLevel;
  trustScore?: number;
  onClick?: () => void;
  className?: string;
  showScore?: boolean;
}

export const SecurityIndicator: React.FC<SecurityIndicatorProps> = ({
  threatLevel,
  trustScore,
  onClick,
  className = '',
  showScore = false,
}) => {
  const getIndicatorConfig = () => {
    switch (threatLevel) {
      case 'CRITICAL':
        return {
          dotColor: 'bg-rose-500 shadow-rose-500/50',
          textColor: 'text-rose-300',
          borderColor: 'border-rose-500/40',
          bgColor: 'bg-rose-950/40 hover:bg-rose-900/40',
          icon: AlertOctagon,
          iconColor: 'text-rose-400',
          label: 'Possible voice impersonation',
          badgeText: 'CRITICAL',
        };
      case 'HIGH':
        return {
          dotColor: 'bg-amber-500 shadow-amber-500/50',
          textColor: 'text-amber-300',
          borderColor: 'border-amber-500/40',
          bgColor: 'bg-amber-950/40 hover:bg-amber-900/40',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          label: 'Suspicious voice activity',
          badgeText: 'HIGH',
        };
      case 'MEDIUM':
        return {
          dotColor: 'bg-yellow-400 shadow-yellow-400/50',
          textColor: 'text-yellow-200',
          borderColor: 'border-yellow-500/30',
          bgColor: 'bg-yellow-950/30 hover:bg-yellow-900/30',
          icon: ShieldAlert,
          iconColor: 'text-yellow-400',
          label: 'Verification recommended',
          badgeText: 'ADVISORY',
        };
      case 'LOW':
      default:
        return {
          dotColor: 'bg-emerald-400 shadow-emerald-400/50',
          textColor: 'text-emerald-300',
          borderColor: 'border-emerald-500/30',
          bgColor: 'bg-emerald-950/30 hover:bg-emerald-900/30',
          icon: Shield,
          iconColor: 'text-emerald-400',
          label: 'Voice protected',
          badgeText: 'PROTECTED',
        };
    }
  };

  const config = getIndicatorConfig();
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Security Status: ${config.label}`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer shadow-sm ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full shadow-sm animate-pulse ${config.dotColor}`} />
      <span className={`text-xs font-medium tracking-wide ${config.textColor}`}>
        {config.label}
      </span>
      {showScore && typeof trustScore === 'number' && (
        <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-black/30 text-slate-300 border border-white/10 ml-0.5">
          {trustScore}
        </span>
      )}
    </button>
  );
};
