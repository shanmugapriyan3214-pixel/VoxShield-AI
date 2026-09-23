/**
 * VoxShield AI — Platform-Neutral Contact Provider Abstraction
 */

import { Contact, User } from '../types/domain';

export interface ContactProvider {
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact>;
  addContact(data: {
    displayName: string;
    relationship: string;
    trustedUserId?: string;
    voxshieldId?: string;
  }): Promise<Contact>;
  updateContact(id: string, data: Partial<Contact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  searchUsers(query: string): Promise<User[]>;
}
