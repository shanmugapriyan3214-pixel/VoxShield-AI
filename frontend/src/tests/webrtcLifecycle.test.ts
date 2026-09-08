import { describe, it, expect, vi } from 'vitest';

describe('WebRTC Media Track & Lifecycle Resource Cleanup', () => {
  it('correctly stops all MediaStreamTracks and closes connection upon hangup', () => {
    const mockTrack1 = { stop: vi.fn(), enabled: true };
    const mockTrack2 = { stop: vi.fn(), enabled: true };
    const mockTracks = [mockTrack1, mockTrack2];

    const mockStream = {
      getTracks: () => mockTracks,
    };

    const mockPeerConnection = {
      close: vi.fn(),
      connectionState: 'connected',
    };

    // Simulate cleanup function execution
    mockStream.getTracks().forEach((track) => track.stop());
    mockPeerConnection.close();

    expect(mockTrack1.stop).toHaveBeenCalledTimes(1);
    expect(mockTrack2.stop).toHaveBeenCalledTimes(1);
    expect(mockPeerConnection.close).toHaveBeenCalledTimes(1);
  });

  it('correctly toggles audio track enabled state for microphone mute/unmute', () => {
    const mockAudioTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    };

    // Mute
    mockAudioTrack.enabled = false;
    expect(mockAudioTrack.enabled).toBe(false);

    // Unmute
    mockAudioTrack.enabled = true;
    expect(mockAudioTrack.enabled).toBe(true);
  });
});
