import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { CallResponse } from '../types/call';
import { TrustedVoiceResponse } from '../types/voice';
import { PhoneCall, PhoneForwarded, PhoneIncoming, PhoneOff, Plus, Shield, User, X } from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const Calls: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [calls, setCalls] = useState<CallResponse[]>([]);
  const [trustedVoices, setTrustedVoices] = useState<TrustedVoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [initiating, setInitiating] = useState(false);

  const fetchCalls = async () => {
    try {
      const [callsData, tvData] = await Promise.all([
        api.get<CallResponse[]>('/calls'),
        api.get<TrustedVoiceResponse[]>('/trusted-voices'),
      ]);
      setCalls(callsData);
      setTrustedVoices(tvData);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch calls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId.trim()) return;

    setInitiating(true);
    try {
      const newCall = await api.post<CallResponse>('/calls', { receiver_id: receiverId.trim() });
      showToast('success', `Call initiated. Session ID: ${newCall.id.substring(0, 8)}...`);
      setShowModal(false);
      navigate(`/app/calls/${newCall.id}`);
    } catch (err: any) {
      showToast('error', err.message || 'Could not initiate voice call.');
    } finally {
      setInitiating(false);
    }
  };

  const handleAcceptCall = async (callId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post<CallResponse>(`/calls/${callId}/accept`);
      showToast('success', 'Call accepted.');
      navigate(`/app/calls/${callId}`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to accept call.');
    }
  };

  const handleRejectCall = async (callId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post<CallResponse>(`/calls/${callId}/reject`);
      showToast('info', 'Call rejected.');
      fetchCalls();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject call.');
    }
  };

  const handleEndCall = async (callId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post<CallResponse>(`/calls/${callId}/end`);
      showToast('info', 'Call session terminated.');
      fetchCalls();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to end call.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-cyber-text tracking-wide flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-cyber-cyan" />
            <span>SECURE VOICE CALLS</span>
          </h2>
          <p className="text-xs text-cyber-muted font-mono mt-1">
            WebRTC Encrypted (DTLS-SRTP) • Real-Time Deepfake Analysis
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="py-2.5 px-4 rounded-xl bg-cyber-cyan text-cyber-bg font-semibold text-xs flex items-center justify-center gap-2 shadow-cyan-glow hover:bg-cyan-300 transition-all font-mono uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>New Secure Call</span>
        </button>
      </div>

      {/* Call Sessions List */}
      <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-6">
        {loading ? (
          <div className="py-12 text-center text-xs text-cyber-muted font-mono">
            Loading call sessions...
          </div>
        ) : calls.length === 0 ? (
          <div className="py-16 text-center text-cyber-muted flex flex-col items-center gap-3">
            <div className="p-4 rounded-2xl bg-cyber-card border border-cyber-border text-cyber-muted">
              <PhoneCall className="w-8 h-8" />
            </div>
            <div className="text-sm font-semibold text-cyber-text">No Calls Initiated</div>
            <p className="text-xs text-cyber-muted max-w-sm">
              Connect securely with peer devices. Click "New Secure Call" to establish an end-to-end encrypted session.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                onClick={() => navigate(`/app/calls/${call.id}`)}
                className="p-4 bg-cyber-card/50 hover:bg-cyber-card border border-cyber-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all hover:border-cyber-cyan/40"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-cyber-bg border border-cyber-border text-cyber-cyan">
                    {call.status === 'RINGING' ? (
                      <PhoneIncoming className="w-5 h-5 animate-bounce text-cyber-amber" />
                    ) : call.status === 'ACTIVE' ? (
                      <PhoneForwarded className="w-5 h-5 text-cyber-emerald" />
                    ) : (
                      <PhoneOff className="w-5 h-5 text-cyber-muted" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyber-text">
                        Session {call.id.substring(0, 12)}...
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                          call.status === 'ACTIVE'
                            ? 'bg-cyber-emerald/15 text-cyber-emerald border-cyber-emerald/30'
                            : call.status === 'RINGING'
                            ? 'bg-cyber-amber/15 text-cyber-amber border-cyber-amber/30 animate-pulse'
                            : 'bg-cyber-bg text-cyber-muted border-cyber-border'
                        }`}
                      >
                        {call.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-cyber-muted font-mono mt-1 flex items-center gap-3">
                      <span>Peer: {call.receiver_id.substring(0, 8)}...</span>
                      <span>•</span>
                      <span>DTLS-SRTP</span>
                      <span>•</span>
                      <span>{new Date(call.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {call.status === 'RINGING' && (
                    <>
                      <button
                        onClick={(e) => handleAcceptCall(call.id, e)}
                        className="px-3 py-1.5 rounded-lg bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 text-xs font-mono font-semibold hover:bg-cyber-emerald/30"
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => handleRejectCall(call.id, e)}
                        className="px-3 py-1.5 rounded-lg bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40 text-xs font-mono font-semibold hover:bg-cyber-crimson/30"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {call.status === 'ACTIVE' && (
                    <button
                      onClick={(e) => handleEndCall(call.id, e)}
                      className="px-3 py-1.5 rounded-lg bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40 text-xs font-mono font-semibold hover:bg-cyber-crimson/30"
                    >
                      End Call
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/app/calls/${call.id}`)}
                    className="px-3.5 py-1.5 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-cyan text-xs font-mono font-semibold hover:border-cyber-cyan transition-colors"
                  >
                    Open Call Screen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Call Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-surface border border-cyber-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-cyber-text uppercase font-mono">
                    Initiate Secure Call
                  </h3>
                  <p className="text-xs text-cyber-muted">Direct WebRTC voice communication</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-cyber-muted hover:text-cyber-text p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateCall} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-cyber-muted mb-1.5 uppercase">
                  Recipient User UUID
                </label>
                <input
                  type="text"
                  required
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value.trim())}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full px-3.5 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan font-mono"
                />
              </div>

              {/* Quick Pick from Trusted Contacts if available */}
              {trustedVoices.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono text-cyber-muted mb-2 uppercase">
                    Or select from Trusted Contacts:
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {trustedVoices.map((tv) => (
                      <button
                        key={tv.id}
                        type="button"
                        onClick={() => {
                          if (tv.trusted_user_id) setReceiverId(tv.trusted_user_id);
                        }}
                        className="w-full px-3 py-2 bg-cyber-card/60 hover:bg-cyber-card border border-cyber-border rounded-lg text-left text-xs flex items-center justify-between font-mono transition-colors"
                      >
                        <span className="text-cyber-text font-medium">{tv.display_name}</span>
                        <span className="text-cyber-cyan text-[10px]">{tv.relationship}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border text-[11px] text-cyber-muted font-mono leading-relaxed">
                🔒 Audio remains peer-to-peer. Call media will be encrypted directly with your peer via DTLS-SRTP.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-cyber-card border border-cyber-border text-xs font-mono text-cyber-muted hover:text-cyber-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={initiating}
                  className="flex-1 py-2.5 rounded-xl bg-cyber-cyan text-cyber-bg text-xs font-mono font-bold uppercase shadow-cyan-glow hover:bg-cyan-300 disabled:opacity-50"
                >
                  {initiating ? 'Dialing...' : 'Start Call'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
