import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/common/Toast';
import { TrustedVoiceResponse } from '../types/voice';
import { SpeakerComparisonResult } from '../types/analysis';
import { LiveWaveform } from '../components/security/LiveWaveform';
import {
  AlertTriangle,
  CheckCircle2,
  GitCompare,
  Mic,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  Users,
} from 'lucide-react';

export const VoiceVerification: React.FC = () => {
  const { showToast } = useToast();
  const [trustedVoices, setTrustedVoices] = useState<TrustedVoiceResponse[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<SpeakerComparisonResult | null>(null);

  // Simulated query states for demo
  const [queryScenario, setQueryScenario] = useState<'legit' | 'clone' | 'imposter'>('legit');
  const [speakerSimilarity, setSpeakerSimilarity] = useState<number>(0.94);
  const [aiProb, setAiProb] = useState<number>(0.06);
  const [consistency, setConsistency] = useState<number>(0.92);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const res = await api.get<TrustedVoiceResponse[]>('/trusted-voices');
        setTrustedVoices(res);
        if (res.length > 0) setSelectedVoiceId(res[0].id);
      } catch {
        // Fallback
      }
    };
    fetchVoices();
  }, []);

  const handleRunComparison = async () => {
    setIsComparing(true);
    try {
      // Simulate or call backend comparison
      await new Promise((r) => setTimeout(r, 600));

      if (queryScenario === 'clone') {
        // Voice clone: speaker match is high, but voice is AI!
        setSpeakerSimilarity(0.96);
        setAiProb(0.91);
        setConsistency(0.88);
        showToast('CRITICAL: High speaker match combined with AI synthetic cloning detected!', 'error');
      } else if (queryScenario === 'imposter') {
        // Imposter: speaker match is low, voice is human
        setSpeakerSimilarity(0.32);
        setAiProb(0.04);
        setConsistency(0.40);
        showToast('Different speaker detected (low similarity)', 'info');
      } else {
        // Legit: speaker match is high, voice is human
        setSpeakerSimilarity(0.95);
        setAiProb(0.03);
        setConsistency(0.96);
        showToast('Verified: Legitimate authorized human speaker', 'success');
      }
    } finally {
      setIsComparing(false);
    }
  };

  const isCloneAttack = speakerSimilarity >= 0.80 && aiProb >= 0.65;
  const isVerifiedHuman = speakerSimilarity >= 0.80 && aiProb < 0.40;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono tracking-wider text-slate-500 uppercase font-semibold mb-1">
            <span>BIOMETRIC IDENTITY &amp; AUTHENTICITY</span>
            <span>•</span>
            <span className="text-cyan-600 font-bold">DECOUPLED VERIFICATION</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-cyan-600" />
            Voice Verification &amp; Comparison
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Independently evaluates <strong>WHO IS SPEAKING</strong> (speaker similarity) vs <strong>IS THE AUDIO SYNTHETIC</strong> (AI deepfake probability).
          </p>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs max-w-sm">
          <strong className="block font-semibold mb-0.5 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Security Invariant:
          </strong>
          A recognized identity match does NOT imply human speech. Always verify AI authenticity independently.
        </div>
      </div>

      {/* Comparison Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box A: Reference Voice */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                1. Reference Voice Identity
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
              ENROLLED BASELINE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Select Enrolled Identity</label>
              <select
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
              >
                {trustedVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.display_name} ({v.relationship})
                  </option>
                ))}
                {trustedVoices.length === 0 && (
                  <option value="demo">Alice Henderson (Executive Director)</option>
                )}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Embedding Model:</span>
                <span className="text-slate-800 font-semibold">ECAPA-TDNN (192-d)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Biometric Storage:</span>
                <span className="text-emerald-700 font-semibold">L2 Unit Normalized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Box B: Query / Suspect Audio */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600">
                <Mic className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                2. Live / Suspect Voice Sample
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded font-bold">
              AUDIO UNDER TEST
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Simulate Audio Test Case</label>
              <select
                value={queryScenario}
                onChange={(e) => setQueryScenario(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
              >
                <option value="legit">Legitimate Human Speaker (Alice - Normal Voice)</option>
                <option value="clone">AI Cloned Impersonation (DiffSinger / ElevenLabs Clone of Alice)</option>
                <option value="imposter">Different Speaker (Bob - Natural Human Voice)</option>
              </select>
            </div>

            <button
              onClick={handleRunComparison}
              disabled={isComparing}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isComparing ? 'animate-spin' : ''}`} />
              <span>{isComparing ? 'Evaluating Multi-Signal Biometrics...' : 'Run Decoupled Voice Verification'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Result Comparison Display */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-mono uppercase">
              Decoupled Verification Verdict
            </h2>
            <p className="text-xs text-slate-500">Separation of Speaker Similarity vs Synthetic Probability</p>
          </div>

          {isCloneAttack ? (
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              🚨 CLONED VOICE ATTACK DETECTED
            </span>
          ) : isVerifiedHuman ? (
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              🟢 VERIFIED AUTHENTIC HUMAN
            </span>
          ) : (
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5">
              UNAUTHORIZED SPEAKER
            </span>
          )}
        </div>

        {/* 3 Core Decoupled Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Speaker Match (Identity) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">WHO IS SPEAKING?</span>
              <span className="font-mono text-cyan-700 font-bold">Identity Metric</span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-900">
              {(speakerSimilarity * 100).toFixed(0)}%
            </div>
            <div className="text-[11px] text-slate-500">
              {speakerSimilarity >= 0.80 ? 'Matches registered voiceprint profile' : 'Low biometric correlation with reference'}
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-600 transition-all duration-500"
                style={{ width: `${speakerSimilarity * 100}%` }}
              />
            </div>
          </div>

          {/* Pillar 2: AI Voice Probability (Authenticity) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">IS IT SYNTHETIC?</span>
              <span className="font-mono text-red-600 font-bold">Deepfake Metric</span>
            </div>
            <div className={`text-3xl font-extrabold font-mono ${aiProb >= 0.65 ? 'text-red-600' : 'text-emerald-600'}`}>
              {(aiProb * 100).toFixed(0)}%
            </div>
            <div className="text-[11px] text-slate-500">
              {aiProb >= 0.65 ? 'Neural vocoder / diffusion artifact detected' : 'Organic human vocal tract resonance'}
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${aiProb >= 0.65 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${aiProb * 100}%` }}
              />
            </div>
          </div>

          {/* Pillar 3: Voice Consistency */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">VOICE CONSISTENCY</span>
              <span className="font-mono text-slate-600 font-bold">Acoustic Alignment</span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-900">
              {(consistency * 100).toFixed(0)}%
            </div>
            <div className="text-[11px] text-slate-500">
              Formant and prosody trajectory stability across speech segments
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-700 transition-all duration-500"
                style={{ width: `${consistency * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tactical Recommendation */}
        <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
          isCloneAttack
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : isVerifiedHuman
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          {isCloneAttack && (
            <p>
              <strong>CRITICAL SECURITY ACTION:</strong> This voice matches the biometric reference of the enrolled contact, but has been generated using AI voice cloning technology. Do NOT trust verbal financial or security instructions. Initiate secondary out-of-band verification immediately.
            </p>
          )}
          {isVerifiedHuman && (
            <p>
              <strong>AUTHENTICATION SUCCESS:</strong> Voice matches authorized identity profile with verified natural physiological acoustic resonance. No synthetic anomalies detected. Standard communication guidelines apply.
            </p>
          )}
          {!isCloneAttack && !isVerifiedHuman && (
            <p>
              <strong>VOICE MISMATCH:</strong> The audio does not exhibit AI cloning markers, but does not match the enrolled biometric profile for this contact.
            </p>
          )}
        </div>

        {/* Probabilistic Assessment Disclaimer */}
        <div className="text-[10px] text-slate-400 font-mono tracking-tight leading-normal pt-1">
          * Probabilistic assessment based on decoupled biometric embedding comparison and multi-signal acoustic analysis. AI models do not claim 100% detection certainty.
        </div>
      </div>
    </div>
  );
};
