import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ThreatSeverity } from '../../types/call';

interface ThreatShieldProps {
  score: number;
  severity: ThreatSeverity;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isDegraded?: boolean;
}

export const ThreatShield: React.FC<ThreatShieldProps> = ({
  score,
  severity,
  size = 'md',
  showLabel = true,
  isDegraded = false,
}) => {
  let colorClass = 'text-cyber-emerald border-cyber-emerald/40 bg-cyber-emerald/10 shadow-emerald-glow';
  let badgeText = 'PROTECTED';
  let Icon = ShieldCheck;

  if (isDegraded) {
    colorClass = 'text-cyber-amber border-cyber-amber/50 bg-cyber-amber/15 shadow-amber-glow animate-pulse';
    badgeText = 'MONITORING DEGRADED';
    Icon = Shield;
  } else if (severity === 'MEDIUM') {
    colorClass = 'text-cyber-amber border-cyber-amber/40 bg-cyber-amber/10';
    badgeText = 'ADVISORY';
    Icon = Shield;
  } else if (severity === 'HIGH') {
    colorClass = 'text-orange-400 border-orange-400/40 bg-orange-400/10';
    badgeText = 'SUSPICIOUS';
    Icon = ShieldAlert;
  } else if (severity === 'CRITICAL') {
    colorClass = 'text-cyber-crimson border-cyber-crimson/50 bg-cyber-crimson/15 animate-threat-pulse shadow-crimson-glow';
    badgeText = 'CRITICAL THREAT';
    Icon = ShieldAlert;
  }

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-20 h-20',
  };

  const containerSizes = {
    sm: 'p-1.5',
    md: 'p-3.5',
    lg: 'p-6',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`rounded-2xl border backdrop-blur-md flex items-center justify-center transition-all duration-500 ${containerSizes[size]} ${colorClass}`}>
        <Icon className={`${iconSizes[size]} transition-transform duration-300`} />
      </div>
      {showLabel && (
        <div className="flex flex-col items-center">
          <span className="text-xs font-mono font-bold tracking-wider uppercase" style={{ color: severity === 'CRITICAL' ? '#EF4444' : severity === 'HIGH' ? '#FB923C' : severity === 'MEDIUM' ? '#F59E0B' : '#10B981' }}>
            {badgeText}
          </span>
          <span className="text-xs font-mono text-cyber-muted mt-0.5">
            Score: <strong className="text-cyber-text">{Math.round(score)}</strong> / 100
          </span>
        </div>
      )}
    </div>
  );
};
