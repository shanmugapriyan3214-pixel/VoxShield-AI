import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  RefreshCw,
  Activity,
  AlertTriangle,
  FileWarning,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { ThreatSummaryResponse, ThreatTimelineResponse, ThreatTimelineItem } from '../types/threat';
import { useToast } from '../components/common/Toast';

export const Analytics: React.FC = () => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<ThreatSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<ThreatTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number>(7);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [sumRes, timeRes] = await Promise.all([
        api.get<ThreatSummaryResponse>('/threats/summary'),
        api.get<ThreatTimelineResponse>(`/threats/timeline?days=${selectedDays}`),
      ]);
      setSummary(sumRes);
      setTimeline(timeRes.timeline || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load threat intelligence analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDays]);

  const maxTimelineCount = Math.max(1, ...timeline.map((t) => t.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Threat Intelligence & Analytics</h1>
            <p className="text-sm text-slate-400">
              Aggregated attack telemetry, severity distribution, and voice cloning incidence trends
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDays(d)}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  selectedDays === d
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/60 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <span className="text-xs text-slate-400 block mb-1">Total Telemetry Events</span>
          <div className="text-2xl font-bold font-mono text-white">
            {summary ? summary.total_events : '0'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-crimson-900/30 bg-crimson-950/10 backdrop-blur-sm">
          <span className="text-xs text-crimson-400 block mb-1">Critical Threat Alerts</span>
          <div className="text-2xl font-bold font-mono text-crimson-400">
            {summary ? summary.critical_count : '0'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-900/30 bg-amber-950/10 backdrop-blur-sm">
          <span className="text-xs text-amber-400 block mb-1">High Severity Alerts</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {summary ? summary.high_count : '0'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-yellow-900/30 bg-yellow-950/10 backdrop-blur-sm">
          <span className="text-xs text-yellow-400 block mb-1">Medium Severity Alerts</span>
          <div className="text-2xl font-bold font-mono text-yellow-400">
            {summary ? summary.medium_count : '0'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-900/30 bg-cyan-950/10 backdrop-blur-sm col-span-2 lg:col-span-1">
          <span className="text-xs text-cyan-400 block mb-1">Avg Threat Score</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {summary ? summary.average_threat_score.toFixed(1) : '0.0'}
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Voice Clone & Attack Incident Trend</span>
            </h3>
            <p className="text-xs text-slate-400">Daily frequency of security events over the past {selectedDays} days</p>
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 italic">
            No historical threat timeline data recorded yet. Initiate simulated calls to generate attack events.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Simple responsive bar chart */}
            <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2">
              {timeline.map((item, idx) => {
                const heightPercent = Math.max(10, Math.round((item.count / maxTimelineCount) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition">
                      {item.count}
                    </div>
                    <div
                      className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-cyan-500/40 to-cyan-400 group-hover:from-crimson-500 group-hover:to-crimson-400 transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <div className="text-[10px] font-mono text-slate-500 truncate w-full text-center">
                      {item.period.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Attack Vectors & Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Severity Distribution</span>
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Critical Severity', count: summary?.critical_count || 0, color: 'bg-crimson-500' },
              { label: 'High Severity', count: summary?.high_count || 0, color: 'bg-amber-500' },
              { label: 'Medium Severity', count: summary?.medium_count || 0, color: 'bg-yellow-500' },
              { label: 'Low Severity', count: summary?.low_count || 0, color: 'bg-emerald-500' },
            ].map((row, idx) => {
              const total = summary?.total_events || 1;
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{row.label}</span>
                    <span className="font-mono text-slate-400">
                      {row.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${row.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Defensive Posture</span>
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Real-Time Threat Fusion</span>
                <span>Synthesizing deepfake neural logits, speaker cosine similarity, and spectral liveness.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Acoustic Challenge-Response Active</span>
                <span>Phoneme-locked dynamic phrases defeat prerecorded diffusion and replay loops.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Immutable Forensic Anchor</span>
                <span>Incident evidence digests cryptographically anchored with SHA-256 integrity verification.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
