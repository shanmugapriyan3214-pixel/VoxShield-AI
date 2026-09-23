import React, { useState } from 'react';
import { VoiceSecurityState } from '../../types/domain';
import { X, ShieldCheck, ChevronDown, ChevronUp, Cpu, KeyRound, AlertTriangle } from 'lucide-react';

interface SecurityDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  security: VoiceSecurityState;
  onRequestVerification?: () => void;
}

export const SecurityDetailsSheet: React.FC<SecurityDetailsSheetProps> = ({
  isOpen,
  onClose,
  security,
  onRequestVerification,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 stroke-emerald-500';
    if (score >= 55) return 'text-yellow-400 stroke-yellow-500';
    if (score >= 35) return 'text-amber-400 stroke-amber-500';
    return 'text-rose-400 stroke-rose-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Sheet Container */}
      <div
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-slideUp text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-sheet-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="security-sheet-title" className="text-base font-semibold text-slate-100">
                Voice Security
              </h3>
              <p className="text-xs text-slate-400">Real-Time Silent AI Protection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Continuous Trust Score Gauge */}
        <div className="my-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs uppercase font-medium tracking-wider text-slate-400 mb-2">
            Voice Trust Score
          </p>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-extrabold tracking-tight font-mono ${getScoreColor(security.trustScore)}`}>
              {security.trustScore}
            </span>
            <span className="text-sm font-medium text-slate-400">/ 100</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 text-center">
            {security.threatLevel === 'LOW'
              ? 'Voice characteristics appear authentic and human.'
              : security.threatLevel === 'MEDIUM'
              ? 'Advisory: Minor anomalies detected in vocal stream.'
              : security.threatLevel === 'HIGH'
              ? 'Warning: Synthetic vocal signatures observed.'
              : 'Critical: Significant voice clone impersonation risk.'}
          </p>
        </div>

        {/* Core Multi-Signal Metrics Grid */}
        <div className="space-y-3 my-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Voice Authenticity</span>
            <span className="text-xs font-semibold text-slate-200">{security.voiceAuthenticity}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Speaker Match</span>
            <span className="text-xs font-semibold text-slate-200">{security.speakerMatch}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Liveness Analysis</span>
            <span className="text-xs font-semibold text-slate-200">{security.liveness}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Risk Assessment</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                security.threatLevel === 'LOW'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                  : security.threatLevel === 'MEDIUM'
                  ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-500/30'
                  : security.threatLevel === 'HIGH'
                  ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
              }`}
            >
              {security.threatLevel}
            </span>
          </div>
        </div>

        {/* Social Engineering / Context Alert if triggered */}
        {security.socialEngineeringRisk && (
          <div className="my-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">Social-Engineering Alert</p>
              <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                Potential social-engineering risk detected. Verify the caller before sharing sensitive information.
              </p>
            </div>
          </div>
        )}

        {/* Verification Action Button */}
        {onRequestVerification && (
          <div className="my-4">
            <button
              type="button"
              onClick={onRequestVerification}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-medium text-xs transition-colors shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              <span>Ask Private Verification Question</span>
            </button>
          </div>
        )}

        {/* Collapsible Technical Details */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="flex items-center justify-between w-full py-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>View Technical Details</span>
            </div>
            {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnical && (
            <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono space-y-2 animate-fadeIn">
              <div className="flex justify-between">
                <span className="text-slate-500">AASIST-L AI Prob:</span>
                <span className="text-slate-300">{(security.aiProbability * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ECAPA-TDNN Match:</span>
                <span className="text-slate-300">
                  {security.speakerMatchScore !== null
                    ? `${(security.speakerMatchScore * 100).toFixed(1)}%`
                    : 'Unregistered'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DSP Liveness Score:</span>
                <span className="text-slate-300">
                  {security.livenessScore !== null
                    ? `${(security.livenessScore * 100).toFixed(1)}%`
                    : 'Evaluating'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Zero Audio Server:</span>
                <span className="text-emerald-400">0 Bytes Ingested (Enforced)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Encryption:</span>
                <span className="text-cyan-400">DTLS-SRTP-AES-GCM-128</span>
              </div>
              {security.attackIndicators.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-500 block mb-1">Observed Acoustic Cues:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                    {security.attackIndicators.map((ind, idx) => (
                      <li key={idx}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
