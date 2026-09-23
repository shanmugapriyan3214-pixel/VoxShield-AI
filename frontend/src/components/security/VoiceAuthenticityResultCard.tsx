import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  HelpCircle,
  Info,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export type VoiceAuthenticityStatus =
  | 'SAFE'
  | 'SUSPICIOUS'
  | 'HIGH_RISK'
  | 'ANALYZING'
  | 'NO_ANALYSIS';

export type SecurityRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface TechnicalForensicData {
  aiProbability?: number;
  humanProbability?: number;
  speakerMatch?: number | null;
  livenessScore?: number | null;
  snrDb?: number;
  spectralStatus?: string;
  prosodyStatus?: string;
  detectedArtifacts?: string[];
  modelConsensus?: string;
  dynamicWeights?: Record<string, number>;
  rawScores?: Record<string, number>;
  latencyMs?: number;
}

interface VoiceAuthenticityResultCardProps {
  status: VoiceAuthenticityStatus;
  riskLevel?: SecurityRiskLevel;
  confidenceScore?: number; // 0 to 1 or 0 to 100
  reasons?: string[];
  recommendedAction?: string;
  technicalDetails?: TechnicalForensicData;
  compact?: boolean;
}

export const VoiceAuthenticityResultCard: React.FC<VoiceAuthenticityResultCardProps> = ({
  status,
  riskLevel,
  confidenceScore,
  reasons,
  recommendedAction,
  technicalDetails,
  compact = false,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  // Normalize confidence (0-100)
  const normConfidence =
    confidenceScore !== undefined
      ? confidenceScore <= 1
        ? Math.round(confidenceScore * 100)
        : Math.round(confidenceScore)
      : 92;

  // Defaults per status
  const config = {
    SAFE: {
      headline: 'Likely authentic human voice',
      tag: 'SAFE',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderClass: 'border-emerald-200/90',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-emerald-600',
      defaultRisk: 'LOW' as SecurityRiskLevel,
      defaultReasons: [
        'Natural biological formant transitions and physiological micro-jitter detected',
        'Consistent prosodic cadence matching human speech patterns',
        'No synthetic vocoder envelope artifacts or phase discontinuities observed',
      ],
      defaultAction:
        'Voice characteristics appear authentic. Standard communication guidelines apply.',
    },
    SUSPICIOUS: {
      headline: 'Suspicious voice characteristics detected',
      tag: 'SUSPICIOUS',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      borderClass: 'border-amber-200/90',
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 text-amber-600',
      defaultRisk: 'MODERATE' as SecurityRiskLevel,
      defaultReasons: [
        'Anti-spoofing analysis detected acoustic irregularities',
        'Unusual pitch stability or borderline replay characteristics observed',
        'Acoustic signal confidence is mixed across spectral bands',
      ],
      defaultAction:
        'Exercise caution. Verify the caller identity through a trusted alternative channel before proceeding.',
    },
    HIGH_RISK: {
      headline: 'Synthetic or cloned voice characteristics detected',
      tag: 'HIGH RISK',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      borderClass: 'border-rose-200/90',
      icon: AlertOctagon,
      iconBg: 'bg-rose-100 text-rose-600',
      defaultRisk: 'HIGH' as SecurityRiskLevel,
      defaultReasons: [
        'Neural vocoder synthesis artifacts identified in upper spectral bands',
        'Acoustic markers characteristic of deepfake speech generation models',
        'Absence of natural physiological breath and micro-frequency variations',
      ],
      defaultAction:
        'Verify the caller using another trusted method before sharing sensitive information or approving financial transactions.',
    },
    ANALYZING: {
      headline: 'Analyzing voice authenticity...',
      tag: 'ANALYZING',
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      borderClass: 'border-cyan-200/90',
      icon: RefreshCw,
      iconBg: 'bg-cyan-100 text-cyan-600',
      defaultRisk: 'LOW' as SecurityRiskLevel,
      defaultReasons: [
        'Extracting acoustic feature vectors and spectrogram windows',
        'Running multi-signal anti-spoofing and speaker embedding analysis',
      ],
      defaultAction: 'Hold momentarily while audio stream is being processed.',
    },
    NO_ANALYSIS: {
      headline: 'No voice analysis active',
      tag: 'NO ANALYSIS',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      borderClass: 'border-slate-200/90',
      icon: Shield,
      iconBg: 'bg-slate-100 text-slate-500',
      defaultRisk: 'LOW' as SecurityRiskLevel,
      defaultReasons: [
        'Awaiting incoming audio recording or active voice call stream',
      ],
      defaultAction:
        'Start a secure call or record/upload an audio sample to evaluate voice authenticity.',
    },
  }[status];

  const effectiveRisk = riskLevel || config.defaultRisk;
  const effectiveReasons = reasons && reasons.length > 0 ? reasons : config.defaultReasons;
  const effectiveAction = recommendedAction || config.defaultAction;
  const IconComponent = config.icon;

  const riskBadgeStyle = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-300 font-bold',
  }[effectiveRisk];

  return (
    <div
      className={`bg-white border ${config.borderClass} rounded-2xl shadow-soft transition-all ${
        compact ? 'p-4' : 'p-6'
      } space-y-4`}
    >
      {/* 1. Header: VOICE AUTHENTICITY STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${config.iconBg} shrink-0`}>
            <IconComponent
              className={`w-5 h-5 ${status === 'ANALYZING' ? 'animate-spin' : ''}`}
            />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
              VOICE AUTHENTICITY ASSESSMENT
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {config.headline}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border uppercase tracking-wider ${config.badgeClass}`}
          >
            {config.tag}
          </span>
        </div>
      </div>

      {/* 2. Key Metrics Row: Risk Level & Assessment Confidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
              Security Risk Level
            </span>
            <span className="text-xs text-slate-500">Acoustic threat potential</span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border uppercase ${riskBadgeStyle}`}
          >
            {effectiveRisk} RISK
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
              Assessment Confidence
            </span>
            <span className="text-[11px] text-slate-500">Multi-signal acoustic model</span>
          </div>
          <div className="text-right">
            <span className="text-base font-bold font-mono text-slate-900">
              {status === 'NO_ANALYSIS' ? '—' : `${normConfidence}%`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Reason / Why? */}
      <div className="space-y-1.5 text-xs">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Why this assessment?</span>
        </div>
        <ul className="space-y-1 text-slate-600 pl-4 list-disc marker:text-slate-400 leading-relaxed text-[11px] sm:text-xs">
          {effectiveReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* 4. Recommended Action */}
      <div
        className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
          status === 'HIGH_RISK'
            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
            : status === 'SUSPICIOUS'
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
        }`}
      >
        <div className="font-bold mb-0.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>Recommended Action</span>
        </div>
        <p className="text-[11px] sm:text-xs font-medium">{effectiveAction}</p>
      </div>

      {/* 5. Non-Absolute Assessment Disclaimer */}
      <div className="text-[10px] text-slate-400 font-mono tracking-tight leading-normal pt-1">
        * Probabilistic assessment based on multi-signal acoustic analysis. AI models do not claim 100% detection certainty.
      </div>

      {/* 6. Technical Analysis Drawer for Advanced Users & Hackathon Judges */}
      {technicalDetails && (
        <div className="border border-slate-200 rounded-xl overflow-hidden pt-1">
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between text-xs font-mono font-semibold text-slate-700"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-600" />
              <span>View Technical Analysis (Judges &amp; Forensic Review)</span>
            </div>
            {showTechnical ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showTechnical && (
            <div className="p-4 bg-white border-t border-slate-200 space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {technicalDetails.aiProbability !== undefined && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">AI Probability</span>
                    <span
                      className={`font-bold ${
                        technicalDetails.aiProbability >= 0.58 ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {(technicalDetails.aiProbability * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {technicalDetails.humanProbability !== undefined && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Human Prob</span>
                    <span className="font-bold text-emerald-600">
                      {(technicalDetails.humanProbability * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {technicalDetails.speakerMatch !== undefined && technicalDetails.speakerMatch !== null && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Speaker Match</span>
                    <span className="font-bold text-slate-800">
                      {(technicalDetails.speakerMatch * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {technicalDetails.snrDb !== undefined && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Acoustic SNR</span>
                    <span className="font-bold text-slate-800">{technicalDetails.snrDb} dB</span>
                  </div>
                )}
              </div>

              {technicalDetails.detectedArtifacts && technicalDetails.detectedArtifacts.length > 0 && (
                <div>
                  <span className="text-slate-400 block text-[10px] mb-1">
                    Detected Synthesis Indicators
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {technicalDetails.detectedArtifacts.map((a, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200"
                      >
                        {a.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
                <strong>Privacy Invariant:</strong> Raw audio is processed through client-side feature extraction. Encrypted peer-to-peer WebRTC media never touches cloud audio storage.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
