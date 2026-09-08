import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { CallResponse } from '../types/call';
import { ThreatEventResponse, ThreatSummaryResponse } from '../types/threat';
import { IncidentResponse } from '../types/incident';
import { TrustedVoiceResponse } from '../types/voice';
import { AIStatusResponse } from '../types/ai';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileText,
  Lock,
  PhoneCall,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallResponse[]>([]);
  const [threatSummary, setThreatSummary] = useState<ThreatSummaryResponse | null>(null);
  const [recentThreats, setRecentThreats] = useState<ThreatEventResponse[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [trustedVoices, setTrustedVoices] = useState<TrustedVoiceResponse[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [callsData, threatSum, threatsList, incData, tvData, aiData] = await Promise.allSettled([
          api.get<CallResponse[]>('/calls?limit=5'),
          api.get<ThreatSummaryResponse>('/threats/summary'),
          api.get<ThreatEventResponse[]>('/threats?limit=5'),
          api.get<IncidentResponse[]>('/incidents?limit=5'),
          api.get<TrustedVoiceResponse[]>('/trusted-voices'),
          api.get<AIStatusResponse>('/ai/status'),
        ]);

        if (callsData.status === 'fulfilled') setCalls(callsData.value);
        if (threatSum.status === 'fulfilled') setThreatSummary(threatSum.value);
        if (threatsList.status === 'fulfilled') setRecentThreats(threatsList.value);
        if (incData.status === 'fulfilled') setIncidents(incData.value);
        if (tvData.status === 'fulfilled') setTrustedVoices(tvData.value);
        if (aiData.status === 'fulfilled') setAiStatus(aiData.value);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const activeCallsCount = calls.filter((c) => c.status === 'ACTIVE' || c.status === 'RINGING').length;
  const openIncidentsCount = incidents.filter((i) => i.status === 'OPEN' || i.status === 'INVESTIGATING').length;
  const criticalThreats = threatSummary?.critical_count || 0;

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cyber-surface border border-cyber-border rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-cyber-muted uppercase tracking-wider mb-1">
            <span>VOXSHIELD SECURITY POSTURE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
            <span>REAL-TIME TELEMETRY</span>
          </div>
          <h2 className="text-2xl font-bold text-cyber-text tracking-wide flex items-center gap-3">
            {criticalThreats > 0 ? (
              <>
                <span className="text-cyber-crimson">ELEVATED THREAT STATE</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson font-mono">
                  ACTION REQUIRED
                </span>
              </>
            ) : (
              <>
                <span className="text-cyber-emerald">ACTIVE DEFENSE SHIELD</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyber-emerald/20 border border-cyber-emerald text-cyber-emerald font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PROTECTED
                </span>
              </>
            )}
          </h2>
          <p className="text-xs text-cyber-muted mt-1.5 max-w-xl">
            Live client-side sliding window inference actively analyzing voice authenticity, speaker biometric templates, and acoustic reverberation liveness.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate('/app/calls')}
            className="py-2.5 px-4 rounded-xl bg-cyber-cyan text-cyber-bg font-semibold text-xs flex items-center gap-2 shadow-cyan-glow hover:bg-cyan-300 transition-all font-mono tracking-wider uppercase"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Start Secure Call</span>
          </button>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-cyber-cyan/5 blur-3xl pointer-events-none" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Calls */}
        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-5 hover:border-cyber-cyan/40 transition-all">
          <div className="flex items-center justify-between text-cyber-muted text-xs font-mono uppercase mb-2">
            <span>Active Calls</span>
            <div className="p-2 rounded-xl bg-cyber-card text-cyber-cyan">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyber-text font-mono">
            {loading ? '...' : activeCallsCount}
          </div>
          <div className="text-[11px] text-cyber-muted mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-ping" />
            <span>P2P DTLS-SRTP encrypted</span>
          </div>
        </div>

        {/* Card 2: Threats Detected */}
        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-5 hover:border-cyber-amber/40 transition-all">
          <div className="flex items-center justify-between text-cyber-muted text-xs font-mono uppercase mb-2">
            <span>Threats Blocked</span>
            <div className="p-2 rounded-xl bg-cyber-card text-cyber-amber">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyber-text font-mono">
            {loading ? '...' : threatSummary?.total_events || 0}
          </div>
          <div className="text-[11px] text-cyber-muted mt-2">
            Critical Attacks: <strong className="text-cyber-crimson">{threatSummary?.critical_count || 0}</strong>
          </div>
        </div>

        {/* Card 3: Trusted Voices */}
        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-5 hover:border-cyber-emerald/40 transition-all">
          <div className="flex items-center justify-between text-cyber-muted text-xs font-mono uppercase mb-2">
            <span>Trusted Contacts</span>
            <div className="p-2 rounded-xl bg-cyber-card text-cyber-emerald">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyber-text font-mono">
            {loading ? '...' : trustedVoices.length}
          </div>
          <div className="text-[11px] text-cyber-muted mt-2">
            Biometric profiles enrolled
          </div>
        </div>

        {/* Card 4: Open Incidents */}
        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-5 hover:border-purple-400/40 transition-all">
          <div className="flex items-center justify-between text-cyber-muted text-xs font-mono uppercase mb-2">
            <span>Open Incidents</span>
            <div className="p-2 rounded-xl bg-cyber-card text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyber-text font-mono">
            {loading ? '...' : openIncidentsCount}
          </div>
          <div className="text-[11px] text-cyber-muted mt-2">
            Blockchain tamper-verified
          </div>
        </div>
      </div>

      {/* Middle Row: AI Engine Status & Privacy Architecture Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Status Preview (2 Cols) */}
        <div className="lg:col-span-2 bg-cyber-surface border border-cyber-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-cyber-cyan" />
              <h3 className="text-sm font-bold text-cyber-text uppercase font-mono tracking-wider">
                AI Engine & Model Registry
              </h3>
            </div>
            <Link
              to="/app/ai-status"
              className="text-xs text-cyber-cyan hover:underline flex items-center gap-1 font-mono"
            >
              <span>Full Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Deepfake Detector */}
            <div className="bg-cyber-card/60 border border-cyber-border rounded-xl p-3.5">
              <div className="text-[11px] font-mono text-cyber-muted uppercase">Deepfake Detector</div>
              <div className="text-xs font-bold text-cyber-text mt-1 truncate">
                {aiStatus?.models?.deepfake_detector?.model_name || 'AASIST-L-AntiSpoof'}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyber-cyan px-1.5 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30">
                  {aiStatus?.models?.deepfake_detector?.engine_type || 'LOCAL_DSP_ANALYZER'}
                </span>
                <span className="text-cyber-emerald">ACTIVE</span>
              </div>
            </div>

            {/* Speaker Encoder */}
            <div className="bg-cyber-card/60 border border-cyber-border rounded-xl p-3.5">
              <div className="text-[11px] font-mono text-cyber-muted uppercase">Speaker Verification</div>
              <div className="text-xs font-bold text-cyber-text mt-1 truncate">
                {aiStatus?.models?.speaker_encoder?.model_name || 'ECAPA-TDNN-VoxCeleb'}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyber-cyan px-1.5 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30">
                  {aiStatus?.models?.speaker_encoder?.engine_type || 'LOCAL_DSP_ANALYZER'}
                </span>
                <span className="text-cyber-emerald">ACTIVE</span>
              </div>
            </div>

            {/* Liveness Detector */}
            <div className="bg-cyber-card/60 border border-cyber-border rounded-xl p-3.5">
              <div className="text-[11px] font-mono text-cyber-muted uppercase">Liveness Engine</div>
              <div className="text-xs font-bold text-cyber-text mt-1 truncate">
                Acoustic Impulse Decay
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyber-cyan px-1.5 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30">
                  LOCAL_DSP_ANALYZER
                </span>
                <span className="text-cyber-emerald">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Invariant Card (1 Col) */}
        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyber-emerald mb-2">
              <Lock className="w-4 h-4" />
              <span className="font-bold">ZERO-SERVER-AUDIO PRIVACY</span>
            </div>
            <h4 className="text-sm font-semibold text-cyber-text mb-2">
              Audio Stays Peer-to-Peer
            </h4>
            <p className="text-xs text-cyber-muted leading-relaxed">
              VoxShield AI enforces end-to-end cryptographic isolation. Voice buffers are analyzed on device; live call audio is never uploaded to VoxShield servers.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-cyber-border/80 flex items-center justify-between text-[11px] font-mono text-cyber-muted">
            <span>Transport: DTLS-SRTP</span>
            <span className="text-cyber-emerald">ENFORCED</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Security Events & Recent Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Threat Events */}
        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-cyber-text font-mono uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyber-cyan" />
              <span>Recent Security Events</span>
            </h3>
            <Link to="/app/security-events" className="text-xs text-cyber-cyan hover:underline font-mono">
              View All
            </Link>
          </div>

          {recentThreats.length === 0 ? (
            <div className="py-8 text-center text-xs text-cyber-muted font-mono">
              No threat events recorded yet. Calls are operating within safe baseline.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentThreats.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-cyber-card/50 border border-cyber-border rounded-xl flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        t.severity === 'CRITICAL'
                          ? 'bg-cyber-crimson'
                          : t.severity === 'HIGH'
                          ? 'bg-orange-400'
                          : t.severity === 'MEDIUM'
                          ? 'bg-cyber-amber'
                          : 'bg-cyber-emerald'
                      }`}
                    />
                    <span className="font-semibold text-cyber-text">{t.event_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-cyber-muted">
                    <span>Threat: <strong className="text-cyber-text">{t.threat_score}</strong>/100</span>
                    <span className="text-[11px]">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Call Sessions */}
        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-cyber-text font-mono uppercase tracking-wider flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-cyber-cyan" />
              <span>Recent Calls</span>
            </h3>
            <Link to="/app/calls" className="text-xs text-cyber-cyan hover:underline font-mono">
              All Calls
            </Link>
          </div>

          {calls.length === 0 ? (
            <div className="py-8 text-center text-xs text-cyber-muted font-mono">
              No recent call history. Start a new secure call to begin monitoring.
            </div>
          ) : (
            <div className="space-y-2.5">
              {calls.map((c) => (
                <Link
                  key={c.id}
                  to={`/app/calls/${c.id}`}
                  className="p-3 bg-cyber-card/50 hover:bg-cyber-card border border-cyber-border rounded-xl flex items-center justify-between text-xs font-mono transition-colors block"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        c.status === 'ACTIVE'
                          ? 'bg-cyber-emerald animate-ping'
                          : c.status === 'RINGING'
                          ? 'bg-cyber-cyan'
                          : 'bg-cyber-muted'
                      }`}
                    />
                    <span className="text-cyber-text font-medium truncate max-w-[140px]">
                      Session {c.id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-cyber-cyan px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30">
                      {c.status}
                    </span>
                    <span className="text-[11px] text-cyber-muted">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
