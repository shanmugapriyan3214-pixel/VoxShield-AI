import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { CallResponse } from '../types/call';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Shield,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const CallsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<CallResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'MISSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCalls = async () => {
    try {
      const data = await api.get<CallResponse[]>('/calls?limit=50');
      setCalls(data);
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const formatCallDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredCalls = calls.filter((c) => {
    if (filter === 'MISSED' && c.status !== 'REJECTED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const isOutgoing = c.caller_id === user?.id;
      const name = (isOutgoing ? c.receiver_name : c.caller_name) || '';
      const id = (isOutgoing ? c.receiver_voxshield_id : c.caller_voxshield_id) || '';
      return name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col p-5 overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Recents</h1>
        <div className="flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700/50 text-xs">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === 'ALL' ? 'bg-slate-700 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('MISSED')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === 'MISSED' ? 'bg-slate-700 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Missed
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search call history..."
          className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-850 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500">
          <Clock className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-300">No call history</p>
          <p className="text-xs text-slate-500 mt-1">
            Incoming and outgoing calls will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCalls.map((c) => {
            const isOutgoing = c.caller_id === user?.id;
            const peerName = (isOutgoing ? c.receiver_name : c.caller_name) || (isOutgoing ? 'Recipient' : 'Caller');
            const peerId = (isOutgoing ? c.receiver_voxshield_id : c.caller_voxshield_id) || (isOutgoing ? c.receiver_id : c.caller_id);
            const severity = c.latest_severity || 'LOW';

            return (
              <div
                key={c.id}
                onClick={() => navigate(`/app/calls/${c.id}`)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-800/80 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300 shrink-0">
                    {peerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{peerName}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                      {isOutgoing ? (
                        <ArrowUpRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      ) : (
                        <ArrowDownLeft className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                      <span className="truncate">{formatCallDate(c.created_at)}</span>
                      {c.duration_seconds && c.duration_seconds > 0 ? (
                        <>
                          <span className="text-slate-600">•</span>
                          <span>{formatDuration(c.duration_seconds)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {severity === 'CRITICAL' ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300">
                      🔴 Impersonation risk
                    </span>
                  ) : severity === 'HIGH' ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300">
                      🟠 Suspicious
                    </span>
                  ) : severity === 'MEDIUM' ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-950/70 border border-yellow-500/40 text-yellow-300">
                      🟡 Verification recommended
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                      🟢 Protected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
