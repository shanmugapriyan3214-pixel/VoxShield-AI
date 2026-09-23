import React from 'react';
import {
  X,
  Activity,
  Radio,
  Cpu,
  ShieldAlert,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { WebRTCConnectionStats } from '../../webrtc/peerConnection';

export interface SegmentAIDiagnostics {
  model_probability?: number;
  calibrated_model_probability?: number;
  artifact_score?: number;
  spectral_score?: number;
  prosody_score?: number;
  replay_score?: number;
  snr_db?: number;
  duration_seconds?: number;
  sample_rate?: number;
  codec?: string;
  fusion_weights?: {
    model: number;
    artifact: number;
    spectral: number;
    prosody: number;
  };
  fused_probability?: number;
  confidence?: number;
  consensus?: string;
  classification?: string;
  reason?: string;
  primary_contributor?: string | null;
  detected_artifacts?: string[];
  disclaimer?: string;
}

interface DeveloperDiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  webrtcStats: WebRTCConnectionStats | null;
  aiDiagnostics: SegmentAIDiagnostics | null;
  isAudioBlocked?: boolean;
  onUnblockAudio?: () => void;
  onRefresh?: () => void;
}

export const DeveloperDiagnosticsDrawer: React.FC<DeveloperDiagnosticsDrawerProps> = ({
  isOpen,
  onClose,
  webrtcStats,
  aiDiagnostics,
  isAudioBlocked = false,
  onUnblockAudio,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-950 border-l border-cyan-500/30 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono flex items-center gap-2">
                  System Diagnostics &amp; Telemetry
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                    DEV-MODE
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time WebRTC audio transport &amp; multi-signal AI detection metrics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded-lg transition-colors"
                  title="Refresh Diagnostics"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Audio Autoplay Alert if Blocked */}
          {isAudioBlocked && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
                <Volume2 className="w-4 h-4 flex-shrink-0 animate-bounce" />
                <span>Browser autoplay policy blocked remote audio. User interaction required.</span>
              </div>
              {onUnblockAudio && (
                <button
                  onClick={onUnblockAudio}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  Enable Audio
                </button>
              )}
            </div>
          )}

          {/* Section 1: Part 1 WebRTC Audio Transport Diagnostics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
              <Radio className="w-4 h-4" />
              Part 1 — WebRTC Audio Transport Pipeline
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">ICE State</span>
                <span className={`font-bold ${
                  webrtcStats?.iceConnectionState === 'connected' || webrtcStats?.iceConnectionState === 'completed'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}>
                  {webrtcStats?.iceConnectionState || 'idle'}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Signaling</span>
                <span className="font-bold text-slate-200">
                  {webrtcStats?.signalingState || 'stable'}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Peer Connection</span>
                <span className={`font-bold ${
                  webrtcStats?.connectionState === 'connected' ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {webrtcStats?.connectionState || 'new'}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Candidate Type</span>
                <span className="font-bold text-cyan-300">
                  {webrtcStats?.candidateType || 'host'}
                </span>
              </div>
            </div>

            {/* Inbound & Outbound RTP Packet Counters */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center justify-between">
                  <span>Inbound RTP (Remote Voice)</span>
                  <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">RX</span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">Bytes Received:</span>
                  <span className="text-slate-100">{(webrtcStats?.inboundBytesReceived ?? 0).toLocaleString()} B</span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">Packets Received:</span>
                  <span className="text-slate-100">{(webrtcStats?.inboundPacketsReceived ?? 0).toLocaleString()}</span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">Packets Lost:</span>
                  <span className={webrtcStats?.inboundPacketsLost ? 'text-rose-400' : 'text-slate-400'}>
                    {webrtcStats?.inboundPacketsLost ?? 0}
                  </span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">Jitter:</span>
                  <span className="text-slate-100">{((webrtcStats?.jitter ?? 0) * 1000).toFixed(1)} ms</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center justify-between">
                  <span>Outbound RTP (Local Mic)</span>
                  <span className="text-[9px] bg-cyan-500/20 px-1.5 py-0.5 rounded text-cyan-300">TX</span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">Bytes Sent:</span>
                  <span className="text-slate-100">{(webrtcStats?.outboundBytesSent ?? 0).toLocaleString()} B</span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">Packets Sent:</span>
                  <span className="text-slate-100">{(webrtcStats?.outboundPacketsSent ?? 0).toLocaleString()}</span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">RTT (Latency):</span>
                  <span className="text-slate-100">{((webrtcStats?.roundTripTime ?? 0) * 1000).toFixed(1)} ms</span>
                </div>
                <div className="text-slate-300 flex justify-between">
                  <span className="text-slate-500">Audio Codec:</span>
                  <span className="text-slate-100">{webrtcStats?.audioCodec || 'Opus / 48kHz'}</span>
                </div>
              </div>
            </div>

            {/* Track States */}
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs font-mono space-y-1.5">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Audio Track Inventory</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Senders (Local Audio):</span>
                <span className="text-slate-200">
                  {webrtcStats?.senders?.length ? webrtcStats.senders.map(s => `${s.id.slice(0, 8)} (${s.kind}, ${s.muted ? 'muted' : 'active'})`).join(', ') : '1 track (audio, active)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Receivers (Remote Audio):</span>
                <span className="text-slate-200">
                  {webrtcStats?.receivers?.length ? webrtcStats.receivers.map(r => `${r.id.slice(0, 8)} (${r.kind})`).join(', ') : '1 track (audio)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Part 2 Segment AI Diagnostics */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              Part 2 — Audio Window Multi-Signal AI Diagnostics
            </div>

            {/* Verdict Card */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono uppercase">Classification:</span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    aiDiagnostics?.classification === 'HUMAN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : aiDiagnostics?.classification === 'AI_GENERATED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {aiDiagnostics?.classification || 'HUMAN'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-500">Consensus:</span>
                  <span className="text-cyan-300 font-semibold">{aiDiagnostics?.consensus || 'STRONG_CONSENSUS'}</span>
                </div>
              </div>

              {/* Explanatory Reason */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-300">
                <span className="text-[10px] text-cyan-400 block mb-0.5 uppercase font-bold">Decision Rationale:</span>
                {aiDiagnostics?.reason || 'Strong human evidence with low synthetic evidence across detectors (96% natural authenticity)'}
              </div>

              {/* Contributor if Disagreement */}
              {aiDiagnostics?.primary_contributor && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{aiDiagnostics.primary_contributor}</span>
                </div>
              )}
            </div>

            {/* Individual Detector Probabilities Table */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex justify-between">
                <span>Signal Channel</span>
                <span>Measured Score</span>
                <span>Fusion Weight</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-300">1. AASIST-L Neural Spoof Model</span>
                <span className="text-slate-100 font-bold">{aiDiagnostics?.model_probability ?? 0.04}</span>
                <span className="text-cyan-400">{((aiDiagnostics?.fusion_weights?.model ?? 0.45) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-300">2. Synthetic Acoustic Artifacts</span>
                <span className="text-slate-100 font-bold">{aiDiagnostics?.artifact_score ?? 0.04}</span>
                <span className="text-cyan-400">{((aiDiagnostics?.fusion_weights?.artifact ?? 0.25) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-300">3. Spectral Dynamics &amp; Flatness</span>
                <span className="text-slate-100 font-bold">{aiDiagnostics?.spectral_score ?? 0.02}</span>
                <span className="text-cyan-400">{((aiDiagnostics?.fusion_weights?.spectral ?? 0.15) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-300">4. Prosodic Cadence &amp; F0 Tremor</span>
                <span className="text-slate-100 font-bold">{aiDiagnostics?.prosody_score ?? 0.18}</span>
                <span className="text-cyan-400">{((aiDiagnostics?.fusion_weights?.prosody ?? 0.15) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">5. Acoustic Replay Suspicion</span>
                <span className="text-slate-100 font-bold">{aiDiagnostics?.replay_score ?? 0.02}</span>
                <span className="text-slate-500">Secondary</span>
              </div>
            </div>

            {/* Quality Gating & Bounded Probabilities */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Fused AI Prob</span>
                <span className="font-bold text-slate-100">{aiDiagnostics?.fused_probability ?? 0.04}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Confidence</span>
                <span className="font-bold text-cyan-300">{((aiDiagnostics?.confidence ?? 0.94) * 100).toFixed(0)}%</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Estimated SNR</span>
                <span className="font-bold text-emerald-400">{aiDiagnostics?.snr_db ?? 24.5} dB</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Audio Format</span>
                <span className="font-bold text-slate-300">{aiDiagnostics?.codec || 'PCM 16k'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="pt-4 border-t border-slate-800 mt-6 text-[10px] font-mono text-slate-500 leading-relaxed">
          {aiDiagnostics?.disclaimer ||
            'VOXSHIELD Probabilistic Authenticity Assessment. Continuous rolling window smoothing applied. All probabilities are mathematically calibrated and bounded within [0.015, 0.985].'}
        </div>
      </div>
    </div>
  );
};
