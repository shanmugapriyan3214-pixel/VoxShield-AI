/**
 * VoxShield AI — Platform Module Index
 *
 * Central export point for all platform-related utilities, providers, and bridges.
 */

// Platform detection
export {
  isNativePlatform,
  isAndroid,
  isWeb,
  getPlatformName,
  getApiBaseUrl,
  getWsBaseUrl,
} from './capacitor';

// Provider factory (preferred entry point for consumer code)
export {
  createCallProvider,
  createVoiceSecurityProvider,
  createContactProvider,
} from './providerFactory';

// Native bridges
export {
  createAudioBridge,
  WebAudioBridge,
  DEFAULT_AUDIO_CONFIG,
} from './NativeAudioBridge';
export type {
  NativeAudioBridge,
  AudioCaptureConfig,
  AudioCaptureResult,
} from './NativeAudioBridge';

export {
  createOnnxBridge,
  StubOnnxBridge,
  AASIST_L_CONFIG,
  ECAPA_TDNN_CONFIG,
} from './OnnxBridge';
export type {
  OnnxBridge,
  OnnxModelConfig,
  InferenceResult,
} from './OnnxBridge';
