import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { IncidentResponse, IncidentCreate, IncidentStatus } from '../types/incident';
import { useToast } from '../components/common/Toast';
import { useNavigate } from 'react-router-dom';

export const Incidents: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Form State
  const [incidentType, setIncidentType] = useState('VOICE_CLONING_ATTEMPT');
  const [severity, setSeverity] = useState('CRITICAL');
  const [threatScore, setThreatScore] = useState(88);
  const [aiProbability, setAiProbability] = useState(0.94);
  const [summary, setSummary] = useState('');
  const [callId, setCallId] = useState('');

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<IncidentResponse[]>('/incidents');
      setIncidents(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load incidents', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      showToast('Please enter an incident summary', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: IncidentCreate = {
        call_id: callId.trim() || undefined,
        incident_type: incidentType,
        severity,
        threat_score: Number(threatScore),
        ai_probability: Number(aiProbability),
        summary: summary.trim(),
        indicators: ['SPECTRAL_DISCONTINUITY', 'SYNTHETIC_VOCATION_MODEL', 'HIGH_FREQUENCY_PHASE_ANOMALY'],
        recommendations: ['Terminate active voice session', 'Require out-of-band acoustic challenge'],
      };

      const res = await api.post<IncidentResponse>('/incidents', payload);
      setIncidents((prev) => [res, ...prev]);
      setShowCreateModal(false);
      setSummary('');
      setCallId('');
      showToast(`Incident #${res.incident_number} created with SHA-256 evidence digest`, 'success');
      navigate(`/app/incidents/${res.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create incident', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-crimson-500/10 text-crimson-400 border-crimson-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-crimson-500/10 text-crimson-300 border-crimson-500/30';
      case 'INVESTIGATING':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'FALSE_POSITIVE':
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.incident_number.toLowerCase().includes(q) ||
      inc.summary.toLowerCase().includes(q) ||
      (inc.call_id && inc.call_id.toLowerCase().includes(q)) ||
      inc.incident_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-crimson-500/10 border border-crimson-500/30 text-crimson-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tamper-Evident Incidents</h1>
              <p className="text-sm text-slate-400">
                Cryptographically anchored security reports backed by SHA-256 evidence hashing and blockchain proofs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchIncidents}
            disabled={isLoading}
            className="p-2.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/60 text-slate-300 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-crimson-500 hover:bg-crimson-400 text-white font-semibold text-sm transition shadow-lg shadow-crimson-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>File Incident Report</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
          {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident #, summary, or call ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* Incident List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          ))}
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Incidents Recorded</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            No security incidents match your filters. Create a report when a voice cloning attack or impersonation is detected.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Test Incident</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => navigate(`/app/incidents/${inc.id}`)}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-mono font-bold text-sm ${
                    inc.threat_score >= 80
                      ? 'bg-crimson-500/20 text-crimson-400 border border-crimson-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {Math.round(inc.threat_score)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">#{inc.incident_number}</span>
                    <span className="text-sm font-semibold text-white group-hover:text-cyan-300 transition">
                      {inc.incident_type}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${getSeverityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${getStatusBadge(inc.status)}`}>
                      {inc.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-1">{inc.summary}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(inc.created_at).toLocaleString()}</span>
                    </span>
                    {inc.call_id && (
                      <span className="font-mono text-slate-400">Call: {inc.call_id.slice(0, 8)}...</span>
                    )}
                    {inc.canonical_hash && (
                      <span className="font-mono text-slate-400 flex items-center space-x-1">
                        <span>SHA-256: {inc.canonical_hash.slice(0, 10)}...</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end md:self-center">
                {/* Blockchain Proof Indicator */}
                {inc.is_anchored ? (
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>On-Chain Proof Anchored</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Unanchored</span>
                  </div>
                )}

                <div className="p-2 rounded-lg text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-crimson-400" />
                <h3 className="text-lg font-semibold text-white">File Tamper-Evident Incident</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Upon creation, VoxShield AI generates a canonical RFC 8785 JSON representation and calculates a SHA-256
              evidence digest. This hash can be anchored onto the distributed ledger for immutable proof of audit.
            </p>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs focus:border-crimson-500"
                  >
                    <option value="VOICE_CLONING_ATTEMPT">Voice Cloning Attempt</option>
                    <option value="IMPERSONATION_ATTACK">Impersonation Attack</option>
                    <option value="SYNTHETIC_AUDIO_DETECTED">Synthetic Audio Detected</option>
                    <option value="ACOUSTIC_CHALLENGE_FAILED">Acoustic Challenge Failed</option>
                    <option value="SUSPICIOUS_CALLER">Suspicious Caller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs focus:border-crimson-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Threat Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={threatScore}
                    onChange={(e) => setThreatScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">AI Clone Probability (0.0-1.0)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={aiProbability}
                    onChange={(e) => setAiProbability(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Associated Call ID (Optional)</label>
                <input
                  type="text"
                  value={callId}
                  onChange={(e) => setCallId(e.target.value)}
                  placeholder="e.g. 5d9c221a-..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Incident Summary & Evidence Notes *</label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe detected voice cloning anomalies, challenge outcomes, or caller intent..."
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs focus:border-crimson-500"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-lg bg-crimson-500 hover:bg-crimson-400 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Computing Evidence Hash...' : 'Create & Anchor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
