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
  const aiVoiceProbPercent = (aiProbability * 100).toFixed(1);
  const speakerPercent = speakerMatchScore !== null && speakerMatchScore !== undefined
    ? Math.max(0, Math.min(100, Math.round(speakerMatchScore * 100)))
    : null;
  const livenessPercent = livenessScore !== null && livenessScore !== undefined
    ? Math.max(0, Math.min(100, Math.round(livenessScore * 100)))
    : null;
  const replaySuspicionPercent = livenessScore !== null && livenessScore !== undefined
    ? Math.max(0, Math.min(100, (1 - livenessScore) * 100)).toFixed(1)
    : '5.0';

  const getMeterColor = (val: number) => {
    if (val >= 80) return 'bg-cyber-emerald';
    if (val >= 50) return 'bg-cyber-amber';
    return 'bg-cyber-crimson';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {/* 1. Voice Authenticity & AI Probability */}
      <div className="bg-cyber-card/70 border border-cyber-border/80 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cyber-muted font-medium">
            <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>AI Voice Probability</span>
          </div>
          <span className={`text-xs font-mono font-bold ${aiProbability >= 0.6 ? 'text-cyber-crimson' : 'text-cyber-text'}`}>
            {aiVoiceProbPercent}%
          </span>
        </div>
        <div className="w-full bg-cyber-bg rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${aiProbability >= 0.6 ? 'bg-cyber-crimson' : 'bg-cyber-emerald'}`}
            style={{ width: `${Math.max(2, aiProbability * 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-cyber-muted font-mono flex justify-between">
          <span>Authenticity: {authenticityPercent}%</span>
          <span className={aiProbability >= 0.6 ? 'text-cyber-crimson font-bold' : 'text-cyber-emerald font-bold'}>
            {aiProbability >= 0.6 ? 'AI VOICE' : 'NATURAL HUMAN'}
          </span>
        </div>
      </div>

      {/* 2. Speaker Biometric Match (WHO IS SPEAKING) */}
      <div className="bg-cyber-card/70 border border-cyber-border/80 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cyber-muted font-medium">
            <UserCheck className="w-3.5 h-3.5 text-cyber-emerald" />
            <span>Speaker Biometric Match</span>
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
          <span>Profile Identity</span>
          <span className={speakerPercent !== null && speakerPercent >= 75 ? 'text-cyber-emerald font-bold' : 'text-cyber-amber font-bold'}>
            {speakerPercent !== null && speakerPercent >= 75 ? 'ENROLLED MATCH' : 'UNMATCHED'}
          </span>
        </div>
      </div>

      {/* 3. Liveness & Replay Suspicion */}
      <div className="bg-cyber-card/70 border border-cyber-border/80 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cyber-muted font-medium">
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            <span>Replay Suspicion</span>
          </div>
          <span className={`text-xs font-mono font-bold ${Number(replaySuspicionPercent) >= 40 ? 'text-cyber-crimson' : 'text-cyber-text'}`}>
            {replaySuspicionPercent}%
          </span>
        </div>
        <div className="w-full bg-cyber-bg rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${Number(replaySuspicionPercent) >= 40 ? 'bg-cyber-crimson' : 'bg-cyber-emerald'}`}
            style={{ width: `${Math.max(2, Number(replaySuspicionPercent))}%` }}
          />
        </div>
        <div className="text-[10px] text-cyber-muted font-mono flex justify-between">
          <span>Liveness: {livenessPercent !== null ? `${livenessPercent}%` : '95%'}</span>
          <span className={Number(replaySuspicionPercent) >= 40 ? 'text-cyber-crimson font-bold' : 'text-purple-400 font-bold'}>
            {Number(replaySuspicionPercent) >= 40 ? 'SUSPECT REPLAY' : 'LIVE ACOUSTIC'}
          </span>
        </div>
      </div>
    </div>
  );
};
