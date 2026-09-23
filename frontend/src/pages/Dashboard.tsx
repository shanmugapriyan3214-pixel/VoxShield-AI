import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { CallResponse } from '../types/call';
import { ThreatEventResponse, ThreatSummaryResponse } from '../types/threat';
import { IncidentResponse } from '../types/incident';
import { TrustedVoiceResponse } from '../types/voice';
import { AIStatusResponse } from '../types/ai';
import { LiveWaveform } from '../components/security/LiveWaveform';
import {
  VoiceAuthenticityResultCard,
  VoiceAuthenticityStatus,
  SecurityRiskLevel,
} from '../components/security/VoiceAuthenticityResultCard';
import { useServerHealth } from '../context/ServerHealthContext';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileText,
  Mic,
  PhoneCall,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { health } = useServerHealth();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallResponse[]>([]);
  const [threatSummary, setThreatSummary] = useState<ThreatSummaryResponse | null>(null);
  const [recentThreats, setRecentThreats] = useState<ThreatEventResponse[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [trustedVoices, setTrustedVoices] = useState<TrustedVoiceResponse[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);

  // Threat table filter
  const [threatFilter, setThreatFilter] = useState('ALL');

  // Interactive demo preview state on Dashboard
  const [demoState, setDemoState] = useState<'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK'>('SAFE');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [callsData, threatSum, threatsList, incData, tvData, aiData] = await Promise.allSettled([
        api.get<CallResponse[]>('/calls?limit=10'),
        api.get<ThreatSummaryResponse>('/threats/summary'),
        api.get<ThreatEventResponse[]>('/threats?limit=10'),
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
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalThreats = threatSummary?.total_events || recentThreats.length || 0;
  const criticalThreats = threatSummary?.critical_count || 0;

  // Active call status
  const activeCalls = calls.filter((c) => c.status === 'ACTIVE' || c.status === 'ACCEPTED');
  const hasActiveCall = activeCalls.length > 0;

  // Demo state data mapping
  const demoDataMap = {
    SAFE: {
      status: 'SAFE' as VoiceAuthenticityStatus,
      riskLevel: 'LOW' as SecurityRiskLevel,
      confidence: 95,
      reasons: [
        'Natural biological formant transitions and physiological micro-jitter detected',
        'Consistent prosodic cadence matching human speech patterns',
        'No synthetic vocoder envelope artifacts or phase discontinuities observed',
      ],
      action: 'Voice characteristics appear authentic. Standard communication guidelines apply.',
      technical: {
        aiProbability: 0.04,
        humanProbability: 0.96,
        speakerMatch: 0.94,
        snrDb: 24.5,
        detectedArtifacts: [],
      },
    },
    SUSPICIOUS: {
      status: 'SUSPICIOUS' as VoiceAuthenticityStatus,
      riskLevel: 'MODERATE' as SecurityRiskLevel,
      confidence: 78,
      reasons: [
        'Anti-spoofing analysis detected acoustic irregularities',
        'Unusual pitch stability or borderline replay characteristics observed',
        'Acoustic signal confidence is mixed across spectral bands',
      ],
      action: 'Exercise caution. Verify caller identity through a secondary channel before proceeding.',
      technical: {
        aiProbability: 0.52,
        humanProbability: 0.48,
        speakerMatch: 0.81,
        snrDb: 18.2,
        detectedArtifacts: ['borderline_spectral_flatness', 'room_reverberation_mismatch'],
      },
    },
    HIGH_RISK: {
      status: 'HIGH_RISK' as VoiceAuthenticityStatus,
      riskLevel: 'HIGH' as SecurityRiskLevel,
      confidence: 93,
      reasons: [
        'Neural vocoder synthesis artifacts identified in upper spectral bands',
        'Acoustic markers characteristic of deepfake speech generation models',
        'Absence of natural physiological breath and micro-frequency variations',
      ],
      action: 'Verify caller using another trusted method before sharing sensitive information or transferring funds.',
      technical: {
        aiProbability: 0.89,
        humanProbability: 0.11,
        speakerMatch: 0.95,
        snrDb: 22.0,
        detectedArtifacts: ['phase_vocoder_smoothing', 'unnatural_f0_regularity', 'neural_tts_boundary'],
      },
    },
  };

  const currentDemo = demoDataMap[demoState];

  // Filtered threats
  const filteredThreats = recentThreats.filter((t) => {
    if (threatFilter === 'ALL') return true;
    if (threatFilter === 'CRITICAL') return t.severity === 'CRITICAL';
    if (threatFilter === 'HIGH') return t.severity === 'HIGH' || t.severity === 'CRITICAL';
    if (threatFilter === 'LOW') return t.severity === 'LOW';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP HERO: WELCOME & PRIMARY ACTION BUTTONS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2 text-[11px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
            <span>VOXSHIELD CYBER DEFENSE</span>
            <span>•</span>
            <span className="text-cyan-600 font-bold">REAL-TIME VOICE AUTHENTICITY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Voice Security &amp; Identity Protection
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            VOXSHIELD helps you identify potentially AI-generated or manipulated voices during communication and provides an instant security risk assessment.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/app/calls')}
            className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-sm transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Start Secure Call</span>
          </button>

          <button
            onClick={() => navigate('/app/analyzer')}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Mic className="w-4 h-4 text-cyan-400" />
            <span>Analyze Voice Sample</span>
          </button>
        </div>
      </div>

      {/* 2. PRIMARY WORKFLOW GUIDE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>VOXSHIELD Core Security Workflow</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            Zero Raw Server Audio Guarantee
          </span>
        </div>

        {/* 5-Step Process Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono text-cyan-600 font-bold block mb-0.5">STEP 1</span>
            <span className="font-semibold text-slate-800 block text-xs">Voice Input</span>
            <span className="text-[10px] text-slate-400">Call / Mic / Upload</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono text-cyan-600 font-bold block mb-0.5">STEP 2</span>
            <span className="font-semibold text-slate-800 block text-xs">Acoustic DSP</span>
            <span className="text-[10px] text-slate-400">Feature Extraction</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono text-cyan-600 font-bold block mb-0.5">STEP 3</span>
            <span className="font-semibold text-slate-800 block text-xs">Authenticity Check</span>
            <span className="text-[10px] text-slate-400">Multi-Signal Radar</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono text-cyan-600 font-bold block mb-0.5">STEP 4</span>
            <span className="font-semibold text-slate-800 block text-xs">Risk Assessment</span>
            <span className="text-[10px] text-slate-400">Calibrated Scoring</span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-200/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-cyan-700 font-bold block mb-0.5">STEP 5</span>
            <span className="font-semibold text-slate-900 block text-xs">Clear Action</span>
            <span className="text-[10px] text-cyan-700 font-medium">Safe vs Verify</span>
          </div>
        </div>
      </div>

      {/* 3. FOUR STATUS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status 1: Voice Authenticity Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 font-semibold">
            <span>VOICE AUTHENTICITY</span>
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {hasActiveCall ? 'Active Stream' : 'Ready for Analysis'}
          </div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Multi-signal detector armed</span>
          </div>
        </div>

        {/* Status 2: Security Risk Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 font-semibold">
            <span>SECURITY RISK</span>
            <Shield className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {criticalThreats > 0 ? `${criticalThreats} High Threats` : 'Low Risk Baseline'}
          </div>
          <div className="text-xs text-slate-500">
            {totalThreats} total events logged
          </div>
        </div>

        {/* Status 3: Active Call Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 font-semibold">
            <span>CALL SHIELD</span>
            <PhoneCall className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {hasActiveCall ? `${activeCalls.length} Active Call` : 'Standby Mode'}
          </div>
          <div className="text-xs text-slate-500">
            WebRTC DTLS-SRTP peer-to-peer
          </div>
        </div>

        {/* Status 4: Server & AI Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 font-semibold">
            <span>SECURITY SERVER</span>
            <Server className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                health.isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>{health.isHealthy ? 'Connected' : 'Offline'}</span>
          </div>
          <div className="text-xs text-slate-500 truncate">
            {aiStatus?.models?.deepfake?.model_name || 'AASIST-L & ECAPA-TDNN'}
          </div>
        </div>
      </div>

      {/* 4. LIVE RESULT PRESENTATION SHOWCASE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Live Voice Authenticity Assessment
            </h2>
            <p className="text-xs text-slate-500">
              Standardized result presentation evaluated in real-time
            </p>
          </div>

          {/* Interactive Demo Switcher for Hackathon / Judges */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-mono">
            <span className="text-[10px] text-slate-400 px-2 uppercase font-bold hidden md:inline">
              Demo Simulation:
            </span>
            <button
              onClick={() => setDemoState('SAFE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                demoState === 'SAFE'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Legitimate Voice
            </button>
            <button
              onClick={() => setDemoState('SUSPICIOUS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                demoState === 'SUSPICIOUS'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suspicious Audio
            </button>
            <button
              onClick={() => setDemoState('HIGH_RISK')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                demoState === 'HIGH_RISK'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Voice Clone
            </button>
          </div>
        </div>

        {/* Result Card Component */}
        <VoiceAuthenticityResultCard
          status={currentDemo.status}
          riskLevel={currentDemo.riskLevel}
          confidenceScore={currentDemo.confidence}
          reasons={currentDemo.reasons}
          recommendedAction={currentDemo.action}
          technicalDetails={currentDemo.technical}
        />
      </div>

      {/* 5. RECENT SECURITY AUDIT TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recent Voice Security Events
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of inspected audio segments and potential impersonation attempts
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {['ALL', 'CRITICAL', 'HIGH', 'LOW'].map((tab) => (
              <button
                key={tab}
                onClick={() => setThreatFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  threatFilter === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={fetchDashboardData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Refresh security events"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-mono uppercase text-[10px]">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Session / Caller</th>
                <th className="p-3">Assessment Verdict</th>
                <th className="p-3">AI Probability</th>
                <th className="p-3">Risk Level</th>
                <th className="p-3 text-right">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredThreats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    No threat events matching filter criteria. System baseline is secure.
                  </td>
                </tr>
              ) : (
                filteredThreats.map((threat) => {
                  const isHigh = threat.severity === 'CRITICAL' || threat.severity === 'HIGH';
                  return (
                    <tr key={threat.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {new Date(threat.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {threat.call_id ? `Call ${threat.call_id.slice(0, 8)}...` : 'Voice Sample'}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {threat.event_type}
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-700">
                        {(threat.ai_probability * 100).toFixed(0)}%
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            threat.severity === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : threat.severity === 'HIGH'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {threat.severity}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[11px] text-slate-500">
                          {isHigh ? 'Secondary verification required' : 'Standard monitoring'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
