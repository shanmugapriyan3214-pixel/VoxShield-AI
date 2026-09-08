import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Cpu,
  Layers,
  Activity,
  FileCheck2,
} from 'lucide-react';
import { api } from '../api/client';
import {
  IncidentResponse,
  IncidentUpdate,
  BlockchainReceipt,
  BlockchainVerificationResult,
  IncidentStatus,
} from '../types/incident';
import { useToast } from '../components/common/Toast';

export const IncidentDetail: React.FC = () => {
  const params = useParams<{ id?: string; incidentId?: string }>();
  const activeId = params.incidentId || params.id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [incident, setIncident] = useState<IncidentResponse | null>(null);
  const [receipt, setReceipt] = useState<BlockchainReceipt | null>(null);
  const [verificationResult, setVerificationResult] = useState<BlockchainVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [newStatus, setNewStatus] = useState<IncidentStatus>('OPEN');

  const fetchIncident = async () => {
    if (!activeId) return;
    try {
      setIsLoading(true);
      const res = await api.get<IncidentResponse>(`/incidents/${activeId}`);
      setIncident(res);
      setNewStatus(res.status);
    } catch (err: any) {
      showToast(err.message || 'Failed to load incident details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [activeId]);

  const handleAnchor = async () => {
    if (!activeId) return;
    try {
      setIsAnchoring(true);
      const res = await api.post<BlockchainReceipt>(`/incidents/${activeId}/anchor`);
      setReceipt(res);
      showToast('Incident evidence digest successfully anchored to distributed ledger!', 'success');
      // Refresh incident state
      fetchIncident();
    } catch (err: any) {
      showToast(err.message || 'Failed to anchor incident', 'error');
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleVerify = async () => {
    if (!activeId) return;
    try {
      setIsVerifying(true);
      const res = await api.get<BlockchainVerificationResult>(`/incidents/${activeId}/verification`);
      setVerificationResult(res);
      if (res.is_valid && res.verification_status === 'VERIFIED') {
        showToast('Cryptographic integrity confirmed: proof matches on-chain record', 'success');
      } else if (res.verification_status === 'TAMPERED') {
        showToast('CRITICAL ALERT: Tamper detected! Hashes do not match.', 'error');
      } else {
        showToast(`Verification status: ${res.verification_status}`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification check failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateStatus = async (status: IncidentStatus) => {
    if (!activeId) return;
    try {
      const payload: IncidentUpdate = { status };
      const res = await api.patch<IncidentResponse>(`/incidents/${activeId}`, payload);
      setIncident(res);
      setNewStatus(res.status);
      showToast(`Status updated to ${status}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    showToast('SHA-256 evidence hash copied to clipboard', 'info');
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading tamper-evident incident proof...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-12 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-crimson-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Incident Not Found</h2>
        <button
          onClick={() => navigate('/app/incidents')}
          className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold"
        >
          Return to Incidents
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/app/incidents')}
            className="p-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <span className="font-mono text-sm font-bold text-cyan-400">#{incident.incident_number}</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">{incident.incident_type}</h1>
            </div>
            <p className="text-xs text-slate-400">
              Recorded on {new Date(incident.created_at).toLocaleString()} | Call ID:{' '}
              {incident.call_id || 'Direct Ingestion'}
            </p>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={newStatus}
              onChange={(e) => handleUpdateStatus(e.target.value as IncidentStatus)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs font-semibold focus:border-cyan-500"
            >
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Threat Score</span>
          <div
            className={`text-2xl font-bold font-mono ${
              incident.threat_score >= 80 ? 'text-crimson-400' : 'text-amber-400'
            }`}
          >
            {Math.round(incident.threat_score)} / 100
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">AI Clone Probability</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {(incident.ai_probability * 100).toFixed(1)}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Speaker Match</span>
          <div className="text-2xl font-bold font-mono text-slate-200">
            {incident.speaker_match_score != null
              ? `${(incident.speaker_match_score * 100).toFixed(0)}%`
              : 'Unverified'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Liveness Score</span>
          <div className="text-2xl font-bold font-mono text-slate-200">
            {incident.liveness_score != null ? `${(incident.liveness_score * 100).toFixed(0)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Incident Summary */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-cyan-400" />
          <span>Incident Executive Summary</span>
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed">{incident.summary}</p>
      </div>

      {/* Indicators & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Forensic Indicators ({incident.indicators.length})</span>
          </h3>
          {incident.indicators.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No automated indicators tagged</p>
          ) : (
            <ul className="space-y-1.5">
              {incident.indicators.map((ind, idx) => (
                <li
                  key={idx}
                  className="flex items-center space-x-2 text-xs font-mono text-crimson-300 bg-crimson-950/20 px-2.5 py-1.5 rounded-lg border border-crimson-900/30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-crimson-400" />
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Mitigation Recommendations</span>
          </h3>
          {incident.recommendations.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No specific recommendations</p>
          ) : (
            <ul className="space-y-1.5">
              {incident.recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cryptographic Proof & Blockchain Ledger Section */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/80 backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cryptographic Tamper-Evidence & Proof</h3>
              <p className="text-xs text-slate-400">
                Canonical RFC 8785 evidence representation hashed with SHA-256 and verified against distributed ledger
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!incident.is_anchored ? (
              <button
                onClick={handleAnchor}
                disabled={isAnchoring}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{isAnchoring ? 'Anchoring...' : 'Anchor to Blockchain'}</span>
              </button>
            ) : (
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verifying Proof...' : 'Verify Cryptographic Proof'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Hashes & Verification Card */}
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1.5">
              Canonical SHA-256 Evidence Digest
            </span>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-3 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs break-all">
                {incident.canonical_hash || 'Evidence hash computed during canonical serialization'}
              </code>
              {incident.canonical_hash && (
                <button
                  onClick={() => handleCopyHash(incident.canonical_hash!)}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Copy Hash"
                >
                  {copiedHash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Verification Result Display */}
          {verificationResult && (
            <div
              className={`p-4 rounded-xl border ${
                verificationResult.is_valid && verificationResult.verification_status === 'VERIFIED'
                  ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                  : 'border-crimson-500/40 bg-crimson-950/20 text-crimson-200'
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold text-sm">
                  {verificationResult.is_valid ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-300">
                        CRYPTOGRAPHIC INTEGRITY VERIFIED (Status: {verificationResult.verification_status})
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-crimson-400" />
                      <span className="text-crimson-300">
                        TAMPER DETECTED / INVALID PROOF (Status: {verificationResult.verification_status})
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Network: {verificationResult.network}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block">Recomputed Current Hash:</span>
                  <span className="text-white break-all">{verificationResult.current_recomputed_hash}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Stored Canonical Hash:</span>
                  <span className="text-white break-all">{verificationResult.stored_canonical_hash}</span>
                </div>
                {verificationResult.transaction_hash && (
                  <div>
                    <span className="text-slate-400 block">Ledger Tx Hash:</span>
                    <span className="text-cyan-300 break-all">{verificationResult.transaction_hash}</span>
                  </div>
                )}
                {verificationResult.block_number != null && (
                  <div>
                    <span className="text-slate-400 block">Block Height:</span>
                    <span className="text-cyan-300">#{verificationResult.block_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Anchor Receipt if newly anchored */}
          {receipt && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-200 space-y-2 text-xs">
              <div className="font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                <span>On-Chain Receipt Confirmed</span>
              </div>
              <div className="font-mono text-[11px] space-y-1">
                <div>Tx Hash: {receipt.transaction_hash}</div>
                <div>Block: #{receipt.block_number}</div>
                <div>Network: {receipt.network}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
