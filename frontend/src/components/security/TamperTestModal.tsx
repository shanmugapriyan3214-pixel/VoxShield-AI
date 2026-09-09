import React, { useState } from 'react';
import { api } from '../../api/client';
import { AlertTriangle, CheckCircle, Copy, FileCode, Lock, ShieldAlert, X } from 'lucide-react';

interface TamperTestModalProps {
  incidentId: string;
  incidentNumber: string;
  originalHash: string;
  onClose: () => void;
}

interface TamperResult {
  incident_id: string;
  incident_number: string;
  original_canonical_hash: string;
  tampered_field: string;
  original_value: any;
  tampered_value: any;
  tampered_canonical_hash: string;
  on_chain_hash: string;
  is_valid: boolean;
  verification_status: string;
  details: string;
  proof_explanation: string;
}

export const TamperTestModal: React.FC<TamperTestModalProps> = ({
  incidentId,
  incidentNumber,
  originalHash,
  onClose,
}) => {
  const [tamperField, setTamperField] = useState('threat_score');
  const [tamperedValue, setTamperedValue] = useState('12.0');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TamperResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTamperTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<TamperResult>('/demo/tamper-test', {
        incident_id: incidentId,
        tamper_field: tamperField,
        tampered_value: parseFloat(tamperedValue) || 12.0,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to execute tamper test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cyber-surface border border-cyber-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-cyber-card border border-cyber-border text-cyber-muted hover:text-cyber-text"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-mono text-cyber-cyan font-bold tracking-wider uppercase">
              RFC 8785 IMMUTABILITY AUDIT
            </div>
            <h2 className="text-lg font-bold text-cyber-text tracking-wide">
              Cryptographic Tamper Demonstration
            </h2>
            <p className="text-xs text-cyber-muted">Incident {incidentNumber}</p>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="bg-cyber-card/70 border border-cyber-border rounded-2xl p-4 mb-6 space-y-2 text-xs font-mono text-cyber-muted">
          <div className="flex items-center justify-between">
            <span>STORED CANONICAL EVIDENCE HASH:</span>
            <span className="text-[10px] text-cyber-emerald bg-cyber-emerald/10 border border-cyber-emerald/30 px-2 py-0.5 rounded">
              ON-CHAIN ANCHORED
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyber-bg border border-cyber-border/70 text-[11px] text-cyber-cyan break-all select-all font-mono">
            {originalHash}
          </div>
        </div>

        {/* Tamper Control Section */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-cyber-card/40 border border-cyber-border">
            <label className="block text-xs font-mono text-cyber-muted uppercase mb-2">
              Select Field to Falsify / Mutate (In-Memory Demonstration):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-mono text-cyber-muted">Target Field:</span>
                <select
                  value={tamperField}
                  onChange={(e) => setTamperField(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-cyber-bg border border-cyber-border rounded-xl text-xs font-mono text-cyber-text"
                >
                  <option value="threat_score">threat_score (e.g. 88.5 → 12.0)</option>
                  <option value="severity">severity (CRITICAL → LOW)</option>
                  <option value="ai_probability">ai_probability (0.97 → 0.02)</option>
                </select>
              </div>

              <div>
                <span className="text-[11px] font-mono text-cyber-muted">Forged Value:</span>
                <input
                  type="text"
                  value={tamperedValue}
                  onChange={(e) => setTamperedValue(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-cyber-bg border border-cyber-border rounded-xl text-xs font-mono text-cyber-text"
                  placeholder="12.0"
                />
              </div>
            </div>

            <button
              id="execute-tamper-check-btn"
              data-testid="execute-tamper-check-btn"
              onClick={handleRunTamperTest}
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl bg-cyber-crimson hover:bg-red-600 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-crimson-glow flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{loading ? 'Evaluating Cryptographic Digest...' : 'Verify Cryptographic Tamper Alert'}</span>
            </button>
          </div>

          {/* Tamper Proof Comparison Result */}
          {result && (
            <div className="space-y-3 pt-2">
              <div
                className={`p-4 rounded-2xl border ${
                  result.verification_status === 'TAMPER_DETECTED'
                    ? 'bg-cyber-crimson/15 border-cyber-crimson/50 text-cyber-crimson'
                    : 'bg-cyber-emerald/15 border-cyber-emerald/50 text-cyber-emerald'
                }`}
              >
                <div className="flex items-center gap-2 font-bold font-mono text-sm tracking-wide">
                  {result.verification_status === 'TAMPER_DETECTED' ? (
                    <>
                      <ShieldAlert className="w-5 h-5 animate-bounce" />
                      <span>🚨 TAMPER DETECTED — EVIDENCE MISMATCH</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>✓ CRYPTOGRAPHIC HASH VERIFIED</span>
                    </>
                  )}
                </div>

                <p className="text-xs text-cyber-text mt-2 leading-relaxed">
                  {result.proof_explanation}
                </p>
              </div>

              {/* Side by Side Hashes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border">
                  <div className="text-[10px] text-cyber-emerald font-bold mb-1">
                    GENUINE ON-CHAIN HASH:
                  </div>
                  <div className="text-[10px] text-cyber-muted break-all select-all">
                    {result.original_canonical_hash}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-crimson/40">
                  <div className="text-[10px] text-cyber-crimson font-bold mb-1">
                    FORGED DATA RECOMPUTED HASH:
                  </div>
                  <div className="text-[10px] text-cyber-crimson break-all select-all">
                    {result.tampered_canonical_hash}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-cyber-crimson/15 border border-cyber-crimson text-cyber-crimson text-xs font-mono">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-cyber-card border border-cyber-border text-xs font-mono text-cyber-muted hover:text-cyber-text"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
