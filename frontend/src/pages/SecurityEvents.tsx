import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Radio,
  FileWarning,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Activity,
  Cpu,
} from 'lucide-react';
import { api } from '../api/client';
import { ThreatEventResponse } from '../types/threat';
import { useToast } from '../components/common/Toast';
import { useNavigate } from 'react-router-dom';

export const SecurityEvents: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ThreatEventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [callIdFilter, setCallIdFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<ThreatEventResponse | null>(null);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = { limit: 50 };
      if (severityFilter !== 'ALL') {
        params.severity = severityFilter;
      }
      if (callIdFilter.trim()) {
        params.call_id = callIdFilter.trim();
      }

      const res = await api.get<ThreatEventResponse[]>('/threats', { params });
      setEvents(res);
      if (res.length > 0 && !selectedEvent) {
        setSelectedEvent(res[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load security events', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [severityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
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

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(q) ||
      (e.call_id && e.call_id.toLowerCase().includes(q)) ||
      (e.metadata?.recommended_action && e.metadata.recommended_action.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-crimson-500/10 border border-crimson-500/30 text-crimson-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Security Telemetry Events</h1>
            <p className="text-sm text-slate-400">
              Live audit stream of voice cloning, deepfake indicators, and speaker verification alerts
            </p>
          </div>
        </div>

        <button
          onClick={fetchEvents}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/60 text-slate-300 hover:text-white transition text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Severity Tabs */}
        <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                severityFilter === sev
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm flex items-center space-x-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event type or call ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </form>
      </div>

      {/* Master-Detail Layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Threat Events Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No acoustic anomalies or voice cloning events matched the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="lg:col-span-2 space-y-2.5">
            {filteredEvents.map((event) => {
              const isSelected = selectedEvent?.id === event.id;
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        event.threat_score >= 80
                          ? 'bg-crimson-500/20 text-crimson-400 border border-crimson-500/40'
                          : event.threat_score >= 50
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {Math.round(event.threat_score)}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white tracking-tight">{event.event_type}</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${getSeverityBadge(
                            event.severity
                          )}`}
                        >
                          {event.severity}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </span>
                        {event.call_id && (
                          <span className="font-mono text-slate-500">Call: {event.call_id.slice(0, 8)}...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400">AI Prob: {(event.ai_probability * 100).toFixed(1)}%</div>
                      <div className="text-[11px] text-slate-500">
                        {event.metadata?.recommended_action || 'CONTINUE_CALL'}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Event Detail Sidebar */}
          {selectedEvent && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 space-y-5 lg:sticky lg:top-20 h-fit">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase rounded-full border mb-2 ${getSeverityBadge(
                      selectedEvent.severity
                    )}`}
                  >
                    {selectedEvent.severity} THREAT
                  </span>
                  <h3 className="text-lg font-bold text-white">{selectedEvent.event_type}</h3>
                  <span className="text-xs text-slate-500 font-mono">ID: {selectedEvent.id}</span>
                </div>
              </div>

              {/* Gauges */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-medium">Threat Score</div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      selectedEvent.threat_score >= 80
                        ? 'text-crimson-400'
                        : selectedEvent.threat_score >= 50
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {Math.round(selectedEvent.threat_score)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-medium">AI Clone Prob</div>
                  <div className="text-lg font-bold font-mono text-cyan-400">
                    {(selectedEvent.ai_probability * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-medium">Liveness</div>
                  <div className="text-lg font-bold font-mono text-slate-300">
                    {selectedEvent.liveness_score != null ? `${(selectedEvent.liveness_score * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5">
                <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Recommended Action</span>
                </div>
                <div className="text-xs font-mono text-white">
                  {selectedEvent.metadata?.recommended_action || 'CONTINUE_CALL'}
                </div>
              </div>

              {/* Metadata / Raw Flags */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-400 block">Acoustic Indicators</span>
                {selectedEvent.metadata?.anomaly_flags && selectedEvent.metadata.anomaly_flags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.metadata.anomaly_flags.map((flag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-crimson-500/10 border border-crimson-500/30 text-crimson-400 text-[10px] font-mono"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">No anomalies triggered</span>
                )}
              </div>

              {/* Context Links */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                {selectedEvent.call_id && (
                  <button
                    onClick={() => navigate(`/app/calls/${selectedEvent.call_id}`)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                  >
                    <span>View Call Session</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => navigate('/app/incidents')}
                  className="w-full py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                >
                  <FileWarning className="w-3.5 h-3.5" />
                  <span>Escalate to Formal Incident</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
