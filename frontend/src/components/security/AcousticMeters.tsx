import React from 'react';
import { Activity, Mic, UserCheck } from 'lucide-react';

interface AcousticMetersProps {
  aiProbability: number;
  speakerMatchScore?: number | null;
  livenessScore?: number | null;
}

export const AcousticMeters: React.FC<AcousticMetersProps> = ({
  aiProbability,
  speakerMatchScore,
  livenessScore,
}) => {
  // Convert aiProbability (0 = human, 1 = synthetic) to Authenticity Score (100% = authentic)
  const authenticityPercent = Math.max(0, Math.min(100, Math.round((1 - aiProbability) * 100)));
  const speakerPercent = speakerMatchScore !== null && speakerMatchScore !== undefined
    ? Math.max(0, Math.min(100, Math.round(speakerMatchScore * 100)))
    : null;
  const livenessPercent = livenessScore !== null && livenessScore !== undefined
    ? Math.max(0, Math.min(100, Math.round(livenessScore * 100)))
    : null;

  const getMeterColor = (val: number) => {
    if (val >= 80) return 'bg-cyber-emerald';
    if (val >= 50) return 'bg-cyber-amber';
    return 'bg-cyber-crimson';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {/* 1. Voice Authenticity (1 - AI Prob) */}
      <div className="bg-cyber-card/70 border border-cyber-border/80 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cyber-muted font-medium">
            <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>AI Authenticity</span>
          </div>
          <span className="text-xs font-mono font-bold text-cyber-text">
            {authenticityPercent}%
          </span>
        </div>
        <div className="w-full bg-cyber-bg rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${getMeterColor(authenticityPercent)}`}
            style={{ width: `${authenticityPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-cyber-muted font-mono flex justify-between">
          <span>P(AI): {(aiProbability * 100).toFixed(1)}%</span>
          <span>{aiProbability > 0.5 ? 'SYNTHETIC' : 'HUMAN'}</span>
        </div>
      </div>

      {/* 2. Speaker Match */}
      <div className="bg-cyber-card/70 border border-cyber-border/80 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cyber-muted font-medium">
            <UserCheck className="w-3.5 h-3.5 text-cyber-emerald" />
            <span>Speaker Match</span>
          </div>
          <span className="text-xs font-mono font-bold text-cyber-text">
            {speakerPercent !== null ? `${speakerPercent}%` : 'N/A'}
          </span>
        </div>
        <div className="w-full bg-cyber-bg rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${speakerPercent !== null ? getMeterColor(speakerPercent) : 'bg-cyber-border'}`}
            style={{ width: `${speakerPercent !== null ? speakerPercent : 0}%` }}
          />
        </div>
        <div className="text-[10px] text-cyber-muted font-mono flex justify-between">
          <span>Biometric Profile</span>
          <span>{speakerPercent !== null && speakerPercent >= 75 ? 'VERIFIED' : 'UNMATCHED'}</span>
        </div>
      </div>

      {/* 3. Liveness / Anti-Replay */}
      <div className="bg-cyber-card/70 border border-cyber-border/80 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cyber-muted font-medium">
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            <span>Liveness Check</span>
          </div>
          <span className="text-xs font-mono font-bold text-cyber-text">
            {livenessPercent !== null ? `${livenessPercent}%` : 'N/A'}
          </span>
        </div>
        <div className="w-full bg-cyber-bg rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${livenessPercent !== null ? getMeterColor(livenessPercent) : 'bg-cyber-border'}`}
            style={{ width: `${livenessPercent !== null ? livenessPercent : 0}%` }}
          />
        </div>
        <div className="text-[10px] text-cyber-muted font-mono flex justify-between">
          <span>Anti-Replay</span>
          <span>{livenessPercent !== null && livenessPercent >= 70 ? 'LIVE' : 'REPLAY'}</span>
        </div>
      </div>
    </div>
  );
};
