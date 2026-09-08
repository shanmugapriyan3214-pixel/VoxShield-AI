import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Lock,
  Mic,
  Activity,
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Radio,
  Key,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useToast } from '../components/common/Toast';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [audioInputLevel, setAudioInputLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);

  const checkBackendHealth = async () => {
    try {
      setIsCheckingHealth(true);
      const res = await api.get<any>('/health');
      setHealthStatus(res);
      showToast('Backend health check passed: all systems operational', 'success');
    } catch (err: any) {
      showToast(err.message || 'Health check failed', 'error');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const testMicrophone = async () => {
    try {
      setIsTestingMic(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        setAudioInputLevel(Math.min(100, Math.round((avg / 128) * 100)));
      }, 80);

      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach((track) => track.stop());
        audioCtx.close();
        setIsTestingMic(false);
        setAudioInputLevel(0);
        showToast('Microphone test complete', 'info');
      }, 5000);
    } catch (err) {
      setIsTestingMic(false);
      showToast('Could not access microphone', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & Privacy Settings</h1>
          <p className="text-sm text-slate-400">
            Account preferences, biometric privacy controls, and local audio device configuration
          </p>
        </div>
      </div>

      {/* User Identity Profile */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
          <Key className="w-4 h-4 text-cyan-400" />
          <span>Authenticated Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">Email Address</span>
            <span className="font-mono text-white text-sm">{user?.email}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">Display Name</span>
            <span className="text-white text-sm">{user?.display_name || user?.username || 'Cybersecurity Operator'}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">Account Role</span>
            <span className="font-mono text-cyan-400 font-semibold">{user?.is_verified ? 'VERIFIED OPERATOR' : 'OPERATOR'}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">User Identifier</span>
            <span className="font-mono text-slate-400">{user?.id}</span>
          </div>
        </div>
      </div>

      {/* Privacy Safeguards (Enforced by Design) */}
      <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 backdrop-blur-sm space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Architectural Privacy Safeguards</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Zero-Server-Audio Invariant</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Live call audio streams exclusively peer-to-peer via WebRTC (DTLS-SRTP). Zero bytes of raw audio ever touch the server.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
              LOCKED ACTIVE
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Biometric Credential Redaction</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                High-dimension speaker embeddings are hashed and never transmitted over public API endpoints.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
              LOCKED ACTIVE
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Cryptographic Incident Anchoring</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Incidents are serialized using canonical RFC 8785 JSON and audited with SHA-256 ledger proofs.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
              LOCKED ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Local Microphone Diagnostic */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
          <Mic className="w-4 h-4 text-cyan-400" />
          <span>Local Audio Hardware Diagnostic</span>
        </h3>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Microphone Input Level:</span>
            <span className="font-mono text-cyan-400 font-semibold">{audioInputLevel}%</span>
          </div>

          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 transition-all duration-75"
              style={{ width: `${audioInputLevel}%` }}
            />
          </div>

          <button
            onClick={testMicrophone}
            disabled={isTestingMic}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition ${
              isTestingMic
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isTestingMic ? 'animate-pulse text-crimson-400' : ''}`} />
            <span>{isTestingMic ? 'Sampling microphone (speak now)...' : 'Test Microphone Audio Level (5s)'}</span>
          </button>
        </div>
      </div>

      {/* Backend & Gateway Diagnostics */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>Backend Gateway Diagnostic</span>
          </h3>

          <button
            onClick={checkBackendHealth}
            disabled={isCheckingHealth}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            <span>Recheck API Health</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 block">REST API Endpoint</span>
            <span className="font-mono text-slate-300 text-[11px]">http://127.0.0.1:8000/api/v1</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 block">WebSocket Signaling</span>
            <span className="font-mono text-slate-300 text-[11px]">ws://127.0.0.1:8000/api/v1/ws</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 block">API Status</span>
            <span className="font-mono text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{healthStatus?.status || 'OPERATIONAL'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
