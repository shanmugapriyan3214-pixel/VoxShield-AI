import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Contact, User } from '../types/domain';
import { contactService } from '../contacts/WebContactProvider';
import {
  Users,
  Search,
  Plus,
  Phone,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
  X,
  Star,
  MoreVertical,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const ContactsScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Contact Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Friend');
  const [newTargetUser, setNewTargetUser] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected contact detail modal
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const fetchContacts = async () => {
    try {
      const data = await contactService.getContacts();
      setContacts(data);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    if (location.state?.openNew) {
      setShowAddModal(true);
    }
  }, [location.state]);

  // Search users by query for adding new trusted contact
  useEffect(() => {
    if (newTargetUser.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const results = await contactService.searchUsers(newTargetUser.trim());
          setUserSearchResults(results);
        } catch {
          setUserSearchResults([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setUserSearchResults([]);
    }
  }, [newTargetUser]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    setIsSubmitting(true);
    try {
      await contactService.addContact({
        displayName: newDisplayName.trim(),
        relationship: newRelationship,
        trustedUserId: newTargetUser.trim() || undefined,
      });
      showToast('success', 'Contact saved successfully.');
      setShowAddModal(false);
      setNewDisplayName('');
      setNewTargetUser('');
      fetchContacts();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCall = (target: string) => {
    navigate('/app/calls', { state: { autoDial: target } });
  };

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.relationship.toLowerCase().includes(q) ||
      (c.voxshieldId && c.voxshieldId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col p-5 overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Contacts</h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          aria-label="Add new contact"
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts by name or ID..."
          className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-850 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500">
          <Users className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-300">No contacts found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Add your contacts to protect incoming and outgoing voice calls with AI verification.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-800/80 transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {contact.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{contact.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {contact.relationship} {contact.voxshieldId && `• ${contact.voxshieldId}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartCall(contact.voxshieldId || contact.trustedUserId || contact.displayName);
                  }}
                  aria-label={`Call ${contact.displayName}`}
                  className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
                >
                  <Phone className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Details Sheet */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl text-slate-100 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Contact Details</h3>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center my-5">
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-3xl mb-3 shadow-lg shadow-cyan-500/10">
                {selectedContact.displayName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-slate-100">{selectedContact.displayName}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selectedContact.relationship}</p>
              {selectedContact.voxshieldId && (
                <span className="text-xs font-mono font-medium text-cyan-400 mt-1 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  {selectedContact.voxshieldId}
                </span>
              )}
            </div>

            {/* Trust Identity Status Badge */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-4 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Voice identity established</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Calls with this contact are verified against neural speaker similarity (ECAPA-TDNN) and acoustic liveness.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedContact.voxshieldId || selectedContact.trustedUserId || selectedContact.displayName;
                  setSelectedContact(null);
                  handleStartCall(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>Call Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-semibold text-slate-100">Add New Contact</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Contact Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Mom, Alice Vance"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Relationship Label
                </label>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Family">Family</option>
                  <option value="Parent">Parent</option>
                  <option value="Partner">Partner</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Friend">Friend</option>
                  <option value="Executive">Executive</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  VoxShield ID or Username (Optional)
                </label>
                <input
                  type="text"
                  value={newTargetUser}
                  onChange={(e) => setNewTargetUser(e.target.value)}
                  placeholder="e.g. VS-A1B2C3D4 or username"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />

                {/* Autocomplete dropdown */}
                {userSearchResults.length > 0 && (
                  <div className="mt-1 p-1 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setNewTargetUser(u.id);
                          if (!newDisplayName) setNewDisplayName(u.displayName);
                          setUserSearchResults([]);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs flex justify-between"
                      >
                        <span className="font-medium text-slate-200">{u.displayName}</span>
                        <span className="text-[10px] font-mono text-cyan-400">{u.voxshieldId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newDisplayName.trim()}
                  className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white shadow-sm"
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
