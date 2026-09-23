/**
 * VoxShield AI — DTMF Audio Feedback Generator
 *
 * Synthesizes standard ITU-T dual-tone multi-frequency (DTMF) acoustic tones
 * on the client using Web Audio API oscillators.
 */

const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

let audioCtx: AudioContext | null = null;

export function playDtmfTone(key: string, durationMs = 120): void {
  try {
    const freqs = DTMF_FREQUENCIES[key];
    if (!freqs) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    // Subtle gentle volume so it is pleasant and not loud
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();

    osc1.stop(audioCtx.currentTime + durationMs / 1000);
    osc2.stop(audioCtx.currentTime + durationMs / 1000);
  } catch {
    // Audio tone fails gracefully if browser audio is disabled
  }
}
