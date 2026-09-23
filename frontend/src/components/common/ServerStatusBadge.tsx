import React, { useState } from 'react';
import { useServerHealth } from '../../context/ServerHealthContext';
import { Activity, AlertCircle, CheckCircle2, RefreshCw, Server, X } from 'lucide-react';

export const ServerStatusBadge: React.FC = () => {
  const { health, isChecking, refreshHealth } = useServerHealth();
  const [showModal, setShowModal] = useState(false);

  const isConnected = health.status === 'CONNECTED';
  const isCheckingState = health.status === 'CHECKING' || isChecking;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-mono transition shadow-sm ${
          isConnected
            ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800'
            : isCheckingState
            ? 'bg-slate-100 hover:bg-slate-200/70 border-slate-200 text-slate-600'
            : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 animate-pulse'
        }`}
        title="Click to view Security Server status"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isConnected
              ? 'bg-emerald-500'
              : isCheckingState
              ? 'bg-slate-400 animate-ping'
              : 'bg-rose-500'
          }`}
        />
        <span className="hidden sm:inline font-semibold text-[11px]">Security Server:</span>
        <span className="font-bold text-[11px]">
          {isConnected ? 'Connected' : isCheckingState ? 'Checking...' : 'Offline'}
        </span>
      </button>

      {/* Diagnostics Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl border ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}
              >
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">VOXSHIELD Security Server</h3>
                <p className="text-xs text-slate-500">FastAPI Forensic Core (Port 8000)</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono">
                <span className="text-slate-500">Status</span>
                <span
                  className={`font-bold flex items-center gap-1.5 ${
                    isConnected ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ONLINE &amp; READY
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      DISCONNECTED / OFFLINE
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono">
                <span className="text-slate-500">Service Core</span>
                <span className="font-semibold text-slate-800">{health.service || 'VoxShield AI'}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono">
                <span className="text-slate-500">Last Verified</span>
                <span className="text-slate-600 text-[11px]">
                  {health.lastChecked.toLocaleTimeString()}
                </span>
              </div>
            </div>

            {!isConnected && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Backend is not reachable
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  The frontend is unable to reach the VOXSHIELD backend server at <code className="bg-white/80 px-1 py-0.5 rounded font-mono">http://127.0.0.1:8000</code>.
                </p>
                <div className="pt-1 text-[11px] text-amber-900 font-medium">
                  <strong>Quick fix:</strong> Double-click <code className="bg-white/80 px-1 py-0.5 rounded font-mono">Start_VoxShield.bat</code> in the project folder to start both frontend and backend together.
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => refreshHealth()}
                disabled={isChecking}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking Connection...' : 'Retry Connection'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
