import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { CallResponse } from '../types/call';
import { contactService } from '../contacts/WebContactProvider';
import { Contact } from '../types/domain';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Grid,
  ShieldCheck,
  Plus,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentCalls, setRecentCalls] = useState<CallResponse[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [callsData, contactsData] = await Promise.all([
          api.get<CallResponse[]>('/calls?limit=5'),
          contactService.getContacts(),
        ]);
        setRecentCalls(callsData.slice(0, 4));
        setContacts(contactsData.slice(0, 6));
      } catch {
        // Safe fallback
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const handleStartCall = (target: string) => {
    navigate('/app/calls', { state: { autoDial: target } });
  };

  return (
    <div className="flex-1 flex flex-col p-5 overflow-y-auto select-none">
      {/* Top Greeting & Subtle Security Status */}
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">{getGreeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            {user?.display_name || user?.username || 'User'}
          </h1>
        </div>

        {/* Silent AI Shield Status Pill */}
        <button
          type="button"
          onClick={() => navigate('/app/security-center')}
          aria-label="View Security Center"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-900/40 transition-all active:scale-95 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Protected</span>
        </button>
      </div>

      {/* Quick Action: New Call / Dial */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/app/keypad')}
          className="w-full flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] text-white shadow-lg shadow-cyan-600/25 transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <Grid className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold tracking-wide">Dial or Search</p>
              <p className="text-xs text-cyan-100/80">Enter VoxShield ID or number</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Favorite / Frequent Contacts Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contacts
          </h2>
          <button
            type="button"
            onClick={() => navigate('/app/contacts')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            View all
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {/* Add Contact Button */}
          <button
            type="button"
            onClick={() => navigate('/app/contacts', { state: { openNew: true } })}
            className="flex flex-col items-center justify-center w-16 shrink-0 group"
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-700 hover:border-cyan-500 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1.5 truncate max-w-full">
              Add
            </span>
          </button>

          {/* Contacts Avatars */}
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleStartCall(contact.voxshieldId || contact.trustedUserId || contact.displayName)}
              className="flex flex-col items-center w-16 shrink-0 group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/40 group-hover:border-cyan-500 flex items-center justify-center text-slate-200 font-bold text-lg shadow-sm transition-all group-active:scale-95 relative">
                {contact.displayName.charAt(0).toUpperCase()}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <span className="text-[11px] text-slate-300 font-medium mt-1.5 truncate max-w-full text-center">
                {contact.displayName.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Calls Section */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Calls
          </h2>
          <button
            type="button"
            onClick={() => navigate('/app/calls')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            See history
          </button>
        </div>

        {recentCalls.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
              <PhoneCall className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-300">No calls yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Make your first secure voice call with real-time AI impersonation protection.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentCalls.map((c) => {
              const isOutgoing = c.caller_id === user?.id;
              const peerName = isOutgoing
                ? c.receiver_name || 'Contact'
                : c.caller_name || 'Caller';
              const peerId = isOutgoing
                ? c.receiver_voxshield_id || c.receiver_id
                : c.caller_voxshield_id || c.caller_id;

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/app/calls/${c.id}`)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-850 hover:bg-slate-800/70 border border-slate-800/70 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300">
                      {peerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{peerName}</p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                        {isOutgoing ? (
                          <PhoneOutgoing className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <PhoneIncoming className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                      🟢 Protected
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
