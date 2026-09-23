/**
 * VoxShield AI — Web Implementation of ContactProvider
 */

import { api } from '../api/client';
import { Contact, User } from '../types/domain';
import { ContactProvider } from './ContactProvider';
import { TrustedVoiceResponse } from '../types/voice';

export class WebContactProvider implements ContactProvider {
  public async getContacts(): Promise<Contact[]> {
    const raw = await api.get<TrustedVoiceResponse[]>('/contacts');
    return raw.map((c) => this.mapToDomainContact(c));
  }

  public async getContact(id: string): Promise<Contact> {
    const raw = await api.get<TrustedVoiceResponse>(`/contacts/${id}`);
    return this.mapToDomainContact(raw);
  }

  public async addContact(data: {
    displayName: string;
    relationship: string;
    trustedUserId?: string;
    voxshieldId?: string;
  }): Promise<Contact> {
    const raw = await api.post<TrustedVoiceResponse>('/contacts', {
      display_name: data.displayName,
      relationship: data.relationship,
      trusted_user_id: data.trustedUserId,
    });
    return this.mapToDomainContact(raw);
  }

  public async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    const raw = await api.patch<TrustedVoiceResponse>(`/contacts/${id}`, {
      display_name: data.displayName,
      relationship: data.relationship,
      status: data.status,
    });
    return this.mapToDomainContact(raw);
  }

  public async deleteContact(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  }

  public async searchUsers(query: string): Promise<User[]> {
    if (!query || query.trim().length === 0) return [];
    try {
      const results = await api.get<any[]>(`/users/lookup?q=${encodeURIComponent(query.trim())}`);
      return results.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        voxshieldId: u.voxshield_id || `VS-${u.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`,
        isVerified: u.is_verified || false,
        isActive: true,
      }));
    } catch {
      return [];
    }
  }

  private mapToDomainContact(raw: TrustedVoiceResponse): Contact {
    return {
      id: raw.id,
      ownerUserId: raw.owner_user_id,
      trustedUserId: raw.trusted_user_id,
      displayName: raw.display_name,
      relationship: raw.relationship,
      status: (raw.status as any) || 'VERIFIED',
      voxshieldId: raw.trusted_user_id ? `VS-${raw.trusted_user_id.replace(/-/g, '').substring(0, 8).toUpperCase()}` : null,
      voiceProfileId: raw.voice_profile_id,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}

export const contactService = new WebContactProvider();
