"""VoxShield AI — Algorithmic Acoustic Test Signal Generator for Controlled Demonstrations.

SAFETY & LEGAL COMPLIANCE INVARIANT:
- Does NOT clone or impersonate any real, identifiable, or protected human individual.
- Generates pure mathematical/synthetic acoustic waveforms (harmonics, formants, phase modulations)
  specifically tailored to demonstrate neural anti-spoofing and speaker verification architectures.
- All outputs are formatted as standard 16 kHz 16-bit mono PCM WAV bytes.
"""

import io
import math
import wave
import numpy as np


def _encode_wav(samples: np.ndarray, sample_rate: int = 16000) -> bytes:
    """Encode float32 numpy waveform [-1.0, 1.0] into standard 16-bit PCM WAV bytes."""
    clipped = np.clip(samples, -1.0, 1.0)
    int16_samples = (clipped * 32767.0).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int16_samples.tobytes())

    return buffer.getvalue()


def generate_normal_speech_signal(duration_s: float = 3.0, sample_rate: int = 16000) -> bytes:
    """Generate a clean, natural-sounding vocalic harmonic test signal.
    
    Acoustic Properties:
    - Fundamental frequency F0 ~ 125 Hz with subtle natural vibrato (5 Hz rate, 3 Hz depth)
    - Human-like formant resonances at F1=500 Hz, F2=1500 Hz, F3=2500 Hz
    - Smooth Hann envelope with natural syllable-like breathing pauses
    - Natural high-frequency roll-off (-6 dB/octave)
    """
    n_samples = int(duration_s * sample_rate)
    t = np.linspace(0, duration_s, n_samples, endpoint=False)

    # Fundamental with subtle pitch jitter
    f0 = 125.0 + 3.0 * np.sin(2.0 * np.pi * 5.0 * t)
    phase = 2.0 * np.pi * np.cumsum(f0) / sample_rate

    # Harmonic generation with formant shaping
    signal = np.zeros(n_samples, dtype=np.float32)
    for harmonic in range(1, 25):
        h_freq = harmonic * 125.0
        # Formant gains (resonances at 500, 1500, 2500 Hz)
        gain_f1 = np.exp(-((h_freq - 500.0) ** 2) / (2 * (100.0 ** 2)))
        gain_f2 = np.exp(-((h_freq - 1500.0) ** 2) / (2 * (150.0 ** 2)))
        gain_f3 = np.exp(-((h_freq - 2500.0) ** 2) / (2 * (200.0 ** 2)))
        amplitude = (1.0 / (harmonic ** 0.8)) * (0.3 + 0.6 * gain_f1 + 0.4 * gain_f2 + 0.2 * gain_f3)
        signal += amplitude * np.sin(harmonic * phase).astype(np.float32)

    # Apply speech-like syllable modulation (approx 3 syllables per second)
    syllable_envelope = 0.5 + 0.5 * np.sin(2.0 * np.pi * 3.0 * t)
    signal *= syllable_envelope

    # Gentle rise and fall
    window = np.hanning(n_samples)
    signal = signal * window

    # Normalize to -3 dB
    max_val = np.max(np.abs(signal)) or 1.0
    signal = (signal / max_val) * 0.7

    return _encode_wav(signal, sample_rate)


def generate_replay_attack_signal(duration_s: float = 3.0, sample_rate: int = 16000) -> bytes:
    """Generate a voice sample exhibiting physical acoustic replay artifacts.
    
    Acoustic Properties:
    - Early reflections and room impulse response convolution
    - Low-pass loudspeaker damping cutoff (~3.2 kHz)
    - Phase smearing and reverberant decay tail
    - Flat, static spectral profile characteristic of recording playback
    """
    n_samples = int(duration_s * sample_rate)
    t = np.linspace(0, duration_s, n_samples, endpoint=False)

    # Base harmonic carrier
    f0 = 130.0  # Slightly fixed, less dynamic pitch
    phase = 2.0 * np.pi * f0 * t
    base_signal = np.zeros(n_samples, dtype=np.float32)
    for h in range(1, 15):
        base_signal += (1.0 / h) * np.sin(h * phase).astype(np.float32)

    # Replay Room Impulse Simulation (Early reflections + reverberant tail)
    impulse_len = int(0.25 * sample_rate)  # 250 ms room impulse
    impulse = np.zeros(impulse_len, dtype=np.float32)
    impulse[0] = 1.0  # Direct sound
    impulse[int(0.015 * sample_rate)] = 0.6  # First reflection (wall)
    impulse[int(0.038 * sample_rate)] = 0.4  # Second reflection (desk)
    impulse[int(0.065 * sample_rate)] = 0.25  # Third reflection
    # Add decaying exponential noise tail
    decay = np.exp(-np.linspace(0, 5, impulse_len))
    noise = np.random.normal(0, 0.05, impulse_len).astype(np.float32) * decay
    impulse += noise

    # Convolve
    replayed = np.convolve(base_signal, impulse, mode="same")

    # Loudspeaker frequency response roll-off (simple low-pass filter)
    # Attenuate frequencies above 3200 Hz
    fft = np.fft.rfft(replayed)
    freqs = np.fft.rfftfreq(n_samples, 1.0 / sample_rate)
    filter_gain = 1.0 / (1.0 + (freqs / 3200.0) ** 4)
    fft_filtered = fft * filter_gain
    replayed = np.fft.irfft(fft_filtered, n=n_samples)

    # Normalize
    max_val = np.max(np.abs(replayed)) or 1.0
    replayed = (replayed / max_val) * 0.7

    return _encode_wav(replayed.astype(np.float32), sample_rate)


def generate_synthetic_spoof_signal(duration_s: float = 3.0, sample_rate: int = 16000) -> bytes:
    """Generate a synthetic test waveform exhibiting vocoder/TTS spoofing artifacts.
    
    Acoustic Properties:
    - Robotic, completely flat fundamental pitch (unnatural zero-variance F0)
    - Abrupt vocoder frame boundary phase discontinuities (100 Hz frame rate)
    - High-frequency metallic buzz / diffusion spectral noise (4 kHz - 7 kHz)
    - Phase incoherence typical of early-generation neural vocoders
    """
    n_samples = int(duration_s * sample_rate)
    t = np.linspace(0, duration_s, n_samples, endpoint=False)

    # Unnatural perfectly static pitch
    f0 = 160.0
    # Add vocoder frame phase discontinuities every 10 ms (160 samples)
    frame_size = int(0.010 * sample_rate)
    phase = np.zeros(n_samples, dtype=np.float32)
    current_phase = 0.0
    for i in range(n_samples):
        if i % frame_size == 0:
            # Artificially jump phase to simulate vocoder window stitching error
            current_phase += np.random.uniform(-math.pi / 2, math.pi / 2)
        current_phase += 2.0 * math.pi * f0 / sample_rate
        phase[i] = current_phase

    # Generate synthetic buzz
    signal = np.zeros(n_samples, dtype=np.float32)
    for h in range(1, 35):
        # Neural vocoder artifacts often have excessive energy in high harmonics
        amp = 1.0 / (h ** 0.5)
        signal += amp * np.sin(h * phase).astype(np.float32)

    # Add metallic high-frequency noise burst (synthetic diffusion artifact)
    high_noise = np.random.normal(0, 0.15, n_samples).astype(np.float32)
    fft_noise = np.fft.rfft(high_noise)
    freqs = np.fft.rfftfreq(n_samples, 1.0 / sample_rate)
    # Bandpass 4000 Hz to 7500 Hz
    bp_filter = np.exp(-((freqs - 5500.0) ** 2) / (2 * (1000.0 ** 2)))
    high_noise = np.fft.irfft(fft_noise * bp_filter, n=n_samples)
    signal += high_noise

    # Normalize
    max_val = np.max(np.abs(signal)) or 1.0
    signal = (signal / max_val) * 0.7

    return _encode_wav(signal.astype(np.float32), sample_rate)
