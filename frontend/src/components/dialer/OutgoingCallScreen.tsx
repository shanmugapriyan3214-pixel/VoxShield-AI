import React from 'react';
import { PhoneOff, Shield, User as UserIcon } from 'lucide-react';

interface OutgoingCallScreenProps {
  recipientName: string;
  recipientVoxshieldId?: string;
  onCancelCall: () => void;
  statusText?: string;
}

export const OutgoingCallScreen: React.FC<OutgoingCallScreenProps> = ({
  recipientName,
  recipientVoxshieldId,
  onCancelCall,
  statusText = 'Calling...',
}) => {
  return (
    <div className="flex flex-col items-center justify-between w-full h-full min-h-[480px] p-8 text-slate-100 select-none animate-fadeIn">
      {/* Top Status */}
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-semibold tracking-wider text-slate-300 uppercase animate-pulse">
          {statusText}
        </p>
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-[11px] text-cyan-400 font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>Voice protection starting...</span>
        </div>
      </div>

      {/* Recipient Profile */}
      <div className="flex flex-col items-center text-center my-8">
        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-1 shadow-xl shadow-cyan-500/20 mb-4 animate-pulse">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-slate-100 font-bold text-4xl">
            {recipientName ? recipientName.charAt(0).toUpperCase() : <UserIcon className="w-12 h-12 text-slate-400" />}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-wide">
          {recipientName}
        </h2>
        {recipientVoxshieldId && (
          <p className="text-xs font-mono text-cyan-400/90 mt-1">{recipientVoxshieldId}</p>
        )}
      </div>

      {/* Cancel Call Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onCancelCall}
          aria-label="Cancel call"
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-95 transition-all"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
        <span className="text-xs text-slate-400 font-medium">End</span>
      </div>
    </div>
  );
};
