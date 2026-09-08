"""VoxShield AI — Audio Feature Extraction Test Suite."""

import numpy as np
import pytest
from app.ai.feature_extraction import audio_feature_extractor, AudioFeatureExtractor


def generate_synthetic_wav_bytes(duration_sec: float = 1.0, sr: int = 16000, freq: float = 440.0) -> bytes:
    """Helper to generate a valid PCM 16-bit mono WAV in bytes."""
    import struct
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)
    sine = (0.5 * np.sin(2 * np.pi * freq * t) * 32767.0).astype(np.int16)
    pcm_data = sine.tobytes()

    # WAV Header (44 bytes)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + len(pcm_data),
        b"WAVE",
        b"fmt ",
        16,
        1,  # PCM
        1,  # mono
        sr,
        sr * 2,  # byte rate
        2,  # block align
        16, # bits per sample
        b"data",
        len(pcm_data),
    )
    return header + pcm_data


def test_extract_waveform_from_valid_wav():
    wav_bytes = generate_synthetic_wav_bytes(duration_sec=0.5, sr=16000)
    waveform, sr = audio_feature_extractor.extract_waveform(wav_bytes, target_sr=16000)
    assert sr == 16000
    assert len(waveform) > 0
    assert np.all(waveform >= -1.0) and np.all(waveform <= 1.0)


def test_extract_waveform_from_raw_pcm():
    # Provide 800 16-bit PCM samples (1600 raw bytes) without WAV header
    raw_samples = (np.sin(np.linspace(0, 10, 800)) * 32767).astype(np.int16).tobytes()
    waveform, sr = audio_feature_extractor.extract_waveform(raw_samples, target_sr=16000)
    assert sr == 16000
    assert len(waveform) == 800



def test_spectral_features_computation():
    wav_bytes = generate_synthetic_wav_bytes(duration_sec=0.5, sr=16000, freq=800.0)
    waveform, sr = audio_feature_extractor.extract_waveform(wav_bytes)
    spec = audio_feature_extractor.extract_spectral_features(waveform, sr=sr)

    assert "spectral_centroid" in spec
    assert "spectral_flatness" in spec
    assert "spectral_rolloff" in spec
    assert "zero_crossing_rate" in spec
    assert "rms_energy" in spec

    # Pure sine wave at 800Hz should have spectral centroid close to 800Hz
    assert 500.0 <= spec["spectral_centroid"] <= 1200.0
    # Spectral flatness for pure tone is very low
    assert spec["spectral_flatness"] <= 0.15
    assert spec["rms_energy"] > 0.0


def test_log_mel_spectrogram_dimensions():
    wav_bytes = generate_synthetic_wav_bytes(duration_sec=1.0, sr=16000)
    waveform, sr = audio_feature_extractor.extract_waveform(wav_bytes)
    n_mels = 64
    mel_spec = audio_feature_extractor.extract_log_mel_spectrogram(waveform, sr=sr, n_mels=n_mels)

    assert mel_spec.shape[0] == n_mels
    assert mel_spec.shape[1] > 10  # Multiple time frames
    assert not np.isnan(mel_spec).any()
    assert not np.isinf(mel_spec).any()


def test_mfcc_dimensions_and_variance():
    wav_bytes = generate_synthetic_wav_bytes(duration_sec=1.0, sr=16000)
    waveform, sr = audio_feature_extractor.extract_waveform(wav_bytes)
    n_mfcc = 13
    mfcc = audio_feature_extractor.extract_mfcc(waveform, sr=sr, n_mfcc=n_mfcc)

    assert mfcc.shape[0] == n_mfcc
    assert mfcc.shape[1] > 10
    assert not np.isnan(mfcc).any()


def test_sliding_window_chunks():
    samples = np.random.randn(32000).astype(np.float32)  # 2.0s at 16kHz
    chunks = audio_feature_extractor.sliding_window_chunks(
        samples,
        window_size=16000,  # 1.0s
        hop_size=8000,      # 0.5s
    )
    # (32000 - 16000) / 8000 + 1 = 3 chunks
    assert len(chunks) == 3
    for chunk in chunks:
        assert len(chunk) == 16000
