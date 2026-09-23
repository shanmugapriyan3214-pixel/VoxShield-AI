import React, { useState } from 'react';
import { VerificationChallenge } from '../../types/domain';
import { KeyRound, ShieldCheck, AlertTriangle, X, CheckCircle2, Mic } from 'lucide-react';

interface AdaptiveVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: VerificationChallenge | null;
  onVerifyPhrase: (spokenPhrase: string) => Promise<boolean>;
}

export const AdaptiveVerificationModal: React.FC<AdaptiveVerificationModalProps> = ({
  isOpen,
  onClose,
  challenge,
  onVerifyPhrase,
}) => {
  const [spokenPhraseInput, setSpokenPhraseInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  if (!isOpen || !challenge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spokenPhraseInput.trim()) return;

    setVerifying(true);
    setResultMessage(null);
    try {
      const verified = await onVerifyPhrase(spokenPhraseInput.trim());
      setSuccess(verified);
      if (verified) {
        setResultMessage('Identity verified successfully. Trust score restored.');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setResultMessage('Passphrase mismatch. Lockout protection active.');
      }
    } catch (err: any) {
      setSuccess(false);
      setResultMessage(err.message || 'Verification failed. Maximum attempts enforced.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700/70 rounded-2xl p-6 shadow-2xl text-slate-100 animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-modal-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400">
            <KeyRound className="w-5 h-5" />
            <h3 id="challenge-modal-title" className="text-sm font-semibold tracking-wide text-slate-100">
              Caller Verification
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close verification dialog"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4">
          <p className="text-xs text-slate-300 mb-1 leading-relaxed">
            We need to verify this caller. Ask the caller your private verification question:
          </p>

          <div className="my-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
              Read Phrase to Caller
            </span>
            <span className="text-sm font-semibold text-cyan-300 font-mono select-all">
              "{challenge.passphrase}"
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Listen to their spoken answer and confirm their spoken passphrase below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="spoken-phrase" className="block text-[11px] font-medium text-slate-300 mb-1">
              Spoken Response from Caller
            </label>
            <div className="relative">
              <input
                id="spoken-phrase"
                type="text"
                value={spokenPhraseInput}
                onChange={(e) => setSpokenPhraseInput(e.target.value)}
                placeholder="Type or verify spoken words..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setSpokenPhraseInput(challenge.passphrase)}
                title="Auto-fill spoken answer for convenience"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 hover:text-cyan-400"
              >
                Match
              </button>
            </div>
          </div>

          {resultMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                success
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
              }`}
            >
              {success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{resultMessage}</span>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying || !spokenPhraseInput.trim()}
              className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium transition-colors shadow-sm"
            >
              {verifying ? 'Verifying...' : 'Verify Caller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
