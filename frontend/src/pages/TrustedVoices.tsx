import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  PhoneCall,
  Clock,
  ExternalLink,
  Lock,
  Search,
} from 'lucide-react';
import { api } from '../api/client';
import { TrustedVoiceResponse, TrustedVoiceCreate, VoiceProfileResponse } from '../types/voice';
import { useToast } from '../components/common/Toast';
import { useNavigate } from 'react-router-dom';

export const TrustedVoices: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<TrustedVoiceResponse[]>([]);
  const [profiles, setProfiles] = useState<VoiceProfileResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState('Colleague');
  const [trustedUserId, setTrustedUserId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [contactsRes, profilesRes] = await Promise.all([
        api.get<TrustedVoiceResponse[]>('/trusted-voices'),
        api.get<VoiceProfileResponse[]>('/voices'),
      ]);
      setContacts(contactsRes);
      setProfiles(profilesRes);
    } catch (err: any) {
      showToast(err.message || 'Failed to load trusted contacts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !relationship.trim()) {
      showToast('Display name and relationship are required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: TrustedVoiceCreate = {
        display_name: displayName.trim(),
        relationship: relationship.trim(),
        trusted_user_id: trustedUserId.trim() || undefined,
        voice_profile_id: selectedProfileId || undefined,
      };

      const res = await api.post<TrustedVoiceResponse>('/trusted-voices', payload);
      setContacts((prev) => [res, ...prev]);
      setShowAddModal(false);
      setDisplayName('');
      setRelationship('Colleague');
      setTrustedUserId('');
      setSelectedProfileId('');
      showToast(`Added ${res.display_name} to trusted contacts`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add contact', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from trusted contacts?`)) return;

    try {
      await api.delete(`/trusted-voices/${id}`);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      showToast(`Removed "${name}" from trusted contacts`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete contact', 'error');
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.relationship.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono tracking-wider text-slate-500 uppercase font-semibold mb-1">
            <span>VOICE BIOMETRIC DIRECTORY</span>
            <span>•</span>
            <span className="text-cyan-600 font-bold">IDENTITY PROFILES</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trusted Caller Network</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized contacts enrolled for continuous AI speaker verification and impersonation defense
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Trusted Contact</span>
          </button>
        </div>
      </div>

      {/* Info & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or relationship (e.g., Executive, Family)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-cyan-500 shadow-soft transition"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-soft">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Biometric Voice Comparison Threshold: </span>
          <span className="font-mono text-emerald-700 font-semibold">0.82 Cosine Sim</span>
        </div>
      </div>

      {/* Contacts List / Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-300 bg-white text-center shadow-soft">
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-500">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No Trusted Contacts Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Register key executives, family members, or authorized callers to enforce real-time biometric verification
            against AI voice clones.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Contact</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-soft hover:shadow-soft-lg transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold">
                      {contact.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{contact.display_name}</h3>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {contact.relationship}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteContact(contact.id, contact.display_name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Verification Status</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {contact.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Linked Voice Profile</span>
                    <span className="font-mono text-slate-700">
                      {contact.voice_profile_id ? `${contact.voice_profile_id.slice(0, 8)}...` : 'Default Baseline'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">User Identifier</span>
                    <span className="font-mono text-slate-500">
                      {contact.trusted_user_id ? `${contact.trusted_user_id.slice(0, 8)}...` : 'External Caller'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Registered</span>
                    <span className="text-slate-700">{new Date(contact.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 flex items-center space-x-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Impersonation Shield Active</span>
                </span>
                <button
                  onClick={() => navigate('/app/calls')}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold flex items-center space-x-1"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Add Trusted Contact</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Register a recognized voice partner. When incoming calls claim this identity, VoxShield AI verifies live
              biometric vectors against their enrolled voice fingerprint.
            </p>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alice Henderson"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Relationship *</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="Colleague">Colleague</option>
                  <option value="Executive">Chief Executive / VIP</option>
                  <option value="Finance Officer">Finance / Treasury</option>
                  <option value="Legal Counsel">Legal Counsel</option>
                  <option value="Family">Family Member</option>
                  <option value="Partner">Partner</option>
                  <option value="Other">Other Verified Caller</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Internal User ID (Optional)
                </label>
                <input
                  type="text"
                  value={trustedUserId}
                  onChange={(e) => setTrustedUserId(e.target.value)}
                  placeholder="e.g. 7f3b8e21-..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link to Enrolled Voice Profile
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="">-- Automated Baseline --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.model_version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
