import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Layers,
  Sparkles,
  Zap,
  Activity,
  HardDrive,
  Clock,
  ShieldCheck,
  Radio,
  Sliders,
  Server,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import { AIStatusResponse, EngineType } from '../types/ai';
import { useToast } from '../components/common/Toast';

export const AIStatus: React.FC = () => {
  const { showToast } = useToast();
  const [statusData, setStatusData] = useState<AIStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<AIStatusResponse>('/ai/status');
      setStatusData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to query AI subsystem registry', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getEngineTypeBadge = (engineType: EngineType | string, available: boolean) => {
    switch (engineType) {
      case 'REAL_PRETRAINED_MODEL':
        return {
          label: 'REAL PRETRAINED MODEL (WEIGHTS LOADED)',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          desc: 'Pretrained neural network checkpoint verified and executing inference via ONNX Runtime.',
          isNeural: true,
        };
      case 'LOCAL_DSP_ANALYZER':
        return {
          label: 'LOCAL DSP ANALYZER (DSP ACTIVE)',
          classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          desc: 'Signal processing heuristics active (spectral centroid, tilt, impulse decay, high-frequency rolloff).',
          isNeural: false,
        };
      case 'ADAPTER_READY_NO_WEIGHTS':
        return {
          label: 'ADAPTER READY (NO WEIGHTS)',
          classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          desc: 'Model adapter code integrated and ready, but neural weights file is missing from local disk.',
          isNeural: false,
        };
      case 'MOCK_DEMO_MODEL':
        return {
          label: 'MOCK DEMO MODEL',
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          desc: 'Simulated heuristic model for lightweight testing and evaluation demonstration.',
          isNeural: false,
        };
      case 'UNAVAILABLE':
      default:
        return {
          label: 'UNAVAILABLE / DISABLED',
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          desc: 'Component disabled, uninitialized, or missing dependencies.',
          isNeural: false,
        };
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Engine & Model Registry</h1>
              <p className="text-sm text-slate-400">
                Transparent runtime operational status, inference hardware, and engine provenance declarations
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/60 text-slate-300 hover:text-white transition text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Probe Engine Status</span>
        </button>
      </div>

      {/* Truthful Provenance Notice Banner */}
      <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-start space-x-3">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <span className="font-semibold text-cyan-300 uppercase tracking-wider block">
            Truthful AI Architecture & Provenance Invariant
          </span>
          <p>
            VoxShield AI strictly declares the exact operational mode of each model component. Components are transparently
            flagged as <strong className="text-emerald-300">REAL_PRETRAINED_MODEL</strong>,{' '}
            <strong className="text-cyan-300">LOCAL_DSP_ANALYZER</strong>, or{' '}
            <strong className="text-amber-300">MOCK_DEMO_MODEL</strong> to uphold research-grade cybersecurity integrity.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          ))}
        </div>
      ) : !statusData ? (
        <div className="p-8 text-center text-slate-400">Unable to query AI engine registry.</div>
      ) : (
        <>
          {/* Pipeline Environment Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Pipeline Status</span>
              <div className="text-xl font-bold font-mono text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{statusData.status}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Execution Mode</span>
              <div className="text-xl font-bold font-mono text-cyan-400">{statusData.mode}</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Inference Device</span>
              <div className="text-xl font-bold font-mono text-white flex items-center space-x-1.5">
                <Server className="w-4 h-4 text-slate-400" />
                <span className="uppercase">{statusData.device}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Fallback Policy</span>
              <div className="text-xl font-bold font-mono text-amber-400">{statusData.fallback_mode}</div>
            </div>
          </div>

          {/* Model Registry Cards */}
          <div>
            <h3 className="text-base font-bold text-white mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Registered AI Neural & DSP Subsystems</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Object.entries(statusData.models || {}).map(([key, model]) => {
                const badge = getEngineTypeBadge(model.engine_type, model.available);
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                            Subsystem: {key.replace('_', ' ')}
                          </span>
                          <h4 className="text-base font-bold text-white tracking-tight">{model.model_name}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase">
                          {model.status}
                        </span>
                      </div>

                      <div className="mt-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badge.classes}`}
                          title={badge.desc}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Framework</span>
                          <span className="font-mono text-slate-300">{model.framework}</span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Model Version</span>
                          <span className="font-mono text-slate-300">{model.version}</span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Execution Engine</span>
                          <span className="font-mono text-slate-300">
                            {model.engine || (model.framework === 'onnxruntime' ? 'ONNX Runtime' : model.framework)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Weights Status</span>
                          <span className="font-mono text-xs">
                            {model.weights_loaded ? (
                              <span className="text-emerald-400 font-semibold">Loaded & Executing</span>
                            ) : model.weights_installed ? (
                              <span className="text-amber-400 font-semibold">Installed</span>
                            ) : (
                              <span className="text-cyan-400 font-semibold">DSP Fallback</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Sampling Rate</span>
                          <span className="font-mono text-slate-300">{model.input_sample_rate} Hz</span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Input Duration</span>
                          <span className="font-mono text-slate-300">{model.input_duration_sec}s</span>
                        </div>

                        {(model.inference_time_ms != null || model.benchmark_avg_ms != null) && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                            <span className="text-slate-400">Benchmark Latency</span>
                            <span className="font-mono text-cyan-400">
                              {(model.benchmark_avg_ms || model.inference_time_ms)?.toFixed(1)} ms
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
                      {key === 'liveness_detector' && !model.weights_loaded && (
                        <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium">
                          Pretrained liveness model unavailable — DSP fallback active.
                        </div>
                      )}
                      {model.model_source && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Source: {model.model_source}
                        </div>
                      )}
                      <span className="line-clamp-2 italic">{model.description || badge.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streaming Sliding Window Parameters */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Streaming Sliding Window Engine</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Window Duration</span>
                <span className="text-lg font-bold font-mono text-white">
                  {statusData.streaming_window?.window_duration_sec}s
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Temporal length of audio analyzed per sliding window</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Hop Duration</span>
                <span className="text-lg font-bold font-mono text-cyan-400">
                  {statusData.streaming_window?.hop_duration_sec}s
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Sliding evaluation step interval for continuous telemetry</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Acoustic Sample Rate</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {statusData.streaming_window?.sample_rate} Hz
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Standard high-fidelity telephony speech sample rate</p>
              </div>
            </div>
          </div>

          {/* Privacy Policy Declarations */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Platform Cryptographic Privacy Policies</span>
            </h3>

            <div className="space-y-2 text-xs">
              {Object.entries(statusData.privacy_policy || {}).map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="font-semibold text-cyan-300 uppercase tracking-wider block">
                    {k.replace('_', ' ')}
                  </span>
                  <p className="text-slate-300">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
