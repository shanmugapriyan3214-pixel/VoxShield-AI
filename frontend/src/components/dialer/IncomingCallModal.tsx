import React from 'react';
import { Phone, PhoneOff, Shield, User as UserIcon } from 'lucide-react';

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName?: string;
  callerVoxshieldId?: string;
  isKnownContact?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  callerName,
  callerVoxshieldId,
  isKnownContact = true,
  onAccept,
  onDecline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-xs sm:max-w-sm flex flex-col items-center justify-between min-h-[460px] p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl text-slate-100 animate-slideUp"
        role="dialog"
        aria-modal="true"
        aria-label="Incoming call alert"
      >
        {/* Top Status */}
        <div className="flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">
            Incoming Call
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
            <Shield className="w-3 h-3" />
            <span>
              {isKnownContact ? 'Voice protection ready' : 'Voice identity not established'}
            </span>
          </div>
        </div>

        {/* Caller Avatar & Info */}
        <div className="flex flex-col items-center text-center my-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 p-1 shadow-lg shadow-cyan-500/20 mb-4 animate-pulse">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-slate-100 font-bold text-3xl">
              {callerName ? callerName.charAt(0).toUpperCase() : <UserIcon className="w-10 h-10 text-slate-400" />}
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">
            {callerName || (isKnownContact ? 'Trusted Contact' : 'Unknown caller')}
          </h2>
          {callerVoxshieldId && (
            <p className="text-xs font-mono text-cyan-400/90 mt-1">{callerVoxshieldId}</p>
          )}
        </div>

        {/* Action Buttons (Decline / Accept) */}
        <div className="w-full flex items-center justify-around mt-4 pt-2">
          {/* Decline (Red) */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onDecline}
              aria-label="Decline incoming call"
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-95 transition-all"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-slate-400 font-medium">Decline</span>
          </div>

          {/* Accept (Green) */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              aria-label="Accept incoming call"
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-95 transition-all animate-bounce"
            >
              <Phone className="w-7 h-7 fill-current" />
            </button>
            <span className="text-xs text-slate-400 font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
