/**
 * VoxShield AI — Provider Factory
 *
 * Returns the correct provider implementation based on the current platform.
 * On web, returns the existing Web* providers (zero change to existing behavior).
 * On Android, returns Android* providers (which currently delegate to web).
 *
 * This factory is the single point where platform-switching happens.
 * All consumer code (pages, components, hooks) should use this factory
 * instead of directly importing Web* or Android* providers.
 */

import { isAndroid } from './capacitor';
import { CallProvider, CallCallbacks } from '../calls/CallProvider';
import { VoiceSecurityProvider, VoiceSecurityCallbacks } from '../security/VoiceSecurityProvider';
import { ContactProvider } from '../contacts/ContactProvider';
import { WebCallProvider } from '../calls/WebCallProvider';
import { WebVoiceSecurityProvider } from '../security/WebVoiceSecurityProvider';
import { WebContactProvider } from '../contacts/WebContactProvider';

/**
 * Create the appropriate CallProvider for the current platform.
 */
export function createCallProvider(callbacks: CallCallbacks = {}): CallProvider {
  if (isAndroid()) {
    // Lazy import to avoid bundling native code on web
    const { AndroidCallProvider } = require('./AndroidCallProvider');
    return new AndroidCallProvider(callbacks);
  }
  return new WebCallProvider(callbacks);
}

/**
 * Create the appropriate VoiceSecurityProvider for the current platform.
 */
export function createVoiceSecurityProvider(
  callbacks: VoiceSecurityCallbacks = {}
): VoiceSecurityProvider {
  if (isAndroid()) {
    const { AndroidVoiceSecurityProvider } = require('./AndroidVoiceSecurityProvider');
    return new AndroidVoiceSecurityProvider(callbacks);
  }
  return new WebVoiceSecurityProvider(callbacks);
}

/**
 * Create the appropriate ContactProvider for the current platform.
 */
export function createContactProvider(): ContactProvider {
  if (isAndroid()) {
    const { AndroidContactProvider } = require('./AndroidContactProvider');
    return new AndroidContactProvider();
  }
  return new WebContactProvider();
}
