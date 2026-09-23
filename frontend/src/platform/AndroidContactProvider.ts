/**
 * VoxShield AI — Android Contact Provider
 *
 * Android-native implementation of the ContactProvider interface.
 * Currently delegates to WebContactProvider which fetches contacts from
 * the VoxShield backend API. This works identically in Android WebView.
 *
 * Architecture:
 *   ContactProvider (interface) ← WebContactProvider (web)
 *                               ← AndroidContactProvider (this, delegates for now)
 *
 * Future native enhancements (do NOT implement yet):
 *   - Android ContactsContract ContentResolver for device contacts
 *   - Merging local device contacts with VoxShield trusted voices
 *   - Contact photo sync from device to VoxShield
 */

import { Contact, User } from '../types/domain';
import { ContactProvider } from '../contacts/ContactProvider';
import { WebContactProvider } from '../contacts/WebContactProvider';

export class AndroidContactProvider implements ContactProvider {
  private delegate: WebContactProvider;

  constructor() {
    this.delegate = new WebContactProvider();
  }

  async getContacts(): Promise<Contact[]> {
    return this.delegate.getContacts();
  }

  async getContact(id: string): Promise<Contact> {
    return this.delegate.getContact(id);
  }

  async addContact(data: {
    displayName: string;
    relationship: string;
    trustedUserId?: string;
    voxshieldId?: string;
  }): Promise<Contact> {
    return this.delegate.addContact(data);
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    return this.delegate.updateContact(id, data);
  }

  async deleteContact(id: string): Promise<void> {
    return this.delegate.deleteContact(id);
  }

  async searchUsers(query: string): Promise<User[]> {
    return this.delegate.searchUsers(query);
  }
}
