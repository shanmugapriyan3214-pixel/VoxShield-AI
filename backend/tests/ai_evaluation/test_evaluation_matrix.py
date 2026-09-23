"""VoxShield AI — Phase 2 Detection Matrix Evaluation & Robustness Tests.

Validates the upgraded AI voice authenticity pipeline against the full testing matrix:
1. Human Diversity (Male, Female, Expressive pitch variations)
2. Cross-Generator Coverage (Neural TTS, Voice Clones, Diffusion speech)
3. Transmission Channels (G.711 telephone bandpass, Opus-style compression)
4. Environmental Noise (18-20 dB SNR additive acoustic noise)
5. Adversarial Perturbations (Pitch shifting +/-2 semitones)
6. Calibrated Bounding Invariant (Probabilities strictly in [0.015, 0.985], NEVER 100%)
7. Zero False Certainty (Ambiguous/degraded audio yields UNCERTAIN)
8. Diagnostics & Security Disclaimers
"""

import pytest
from app.ai.pipeline import ai_pipeline
from tests.ai_evaluation.eval_framework import (
    BenchmarkSignalGenerator,
    DetectionEvaluationEngine,
    EvaluationSample,
)


@pytest.fixture
def benchmark_suite():
    """Generates a standard benchmark suite covering all evaluation matrix categories."""
    gen = BenchmarkSignalGenerator
    samples = [
        # Human Diversity
        gen.generate_human_male(seed=101),
        gen.generate_human_male(seed=102),
        gen.generate_human_female(seed=201),
        gen.generate_human_female(seed=202),
        gen.generate_human_expressive(seed=301),
        gen.generate_human_expressive(seed=302),
        # Neural Speech Generators
        gen.generate_tts_neural(seed=401),
        gen.generate_tts_neural(seed=402),
        gen.generate_voice_clone(seed=501),
        gen.generate_voice_clone(seed=502),
        gen.generate_diffusion_speech(seed=601),
        gen.generate_diffusion_speech(seed=602),
    ]
    # Add channel and noise variations
    tts_sample = gen.generate_tts_neural(seed=403)
    clone_sample = gen.generate_voice_clone(seed=503)
    human_sample = gen.generate_human_male(seed=103)

    samples.append(gen.apply_codec_compression(tts_sample))
    samples.append(gen.apply_codec_compression(clone_sample))
    samples.append(gen.apply_codec_compression(human_sample))
    samples.append(gen.apply_additive_noise(tts_sample, target_snr_db=20.0))
    samples.append(gen.apply_additive_noise(clone_sample, target_snr_db=18.0))
    samples.append(gen.apply_adversarial_perturbation(clone_sample, pitch_shift_ratio=1.06))

    return samples


@pytest.mark.asyncio
async def test_calibrated_bounds_invariant(benchmark_suite):
    """CRITICAL: Output probabilities must ALWAYS be bounded in [0.015, 0.985] — NEVER 100% or 0%."""
    for sample in benchmark_suite:
        result = await ai_pipeline.analyze_full(sample.audio_pcm, sample_rate=sample.sample_rate)

        # Strict probabilistic bounding invariant
        assert 0.015 <= result.ai_probability <= 0.985, (
            f"Probability out of bounds: ai_prob={result.ai_probability} on {sample.category}"
        )
        assert 0.015 <= result.human_probability <= 0.985, (
            f"Probability out of bounds: human_prob={result.human_probability} on {sample.category}"
        )
        # Sum of probabilities must equal 1.0 (within roundoff)
        assert abs(result.ai_probability + result.human_probability - 1.0) < 0.001
        # Confidence must be bounded
        assert 0.35 <= result.confidence <= 0.985


@pytest.mark.asyncio
async def test_human_vs_ai_classification_discrimination(benchmark_suite):
    """Verify strong statistical discrimination between human speech and synthetic generators."""
    engine = DetectionEvaluationEngine(pipeline=ai_pipeline)
    metrics = await engine.evaluate_suite(benchmark_suite)

    # Core detection quality gates
    assert metrics.accuracy >= 0.80, f"Benchmark accuracy fell below 80%: {metrics.accuracy:.2f}"
    assert metrics.precision >= 0.75, f"Precision fell below 75%: {metrics.precision:.2f}"
    assert metrics.recall >= 0.75, f"Recall fell below 75%: {metrics.recall:.2f}"
    assert metrics.f1_score >= 0.75, f"F1 score fell below 0.75: {metrics.f1_score:.2f}"
    assert metrics.false_negative_rate <= 0.25, f"FNR too high: {metrics.false_negative_rate:.2f}"

    # Latency verification (must complete well within SLA)
    assert metrics.latency_ms["mean_ms"] < 350.0, f"Mean latency too slow: {metrics.latency_ms['mean_ms']}ms"


@pytest.mark.asyncio
async def test_no_ai_voice_reported_as_100_percent_human(benchmark_suite):
    """REGRESSION INVARIANT: No synthetic or cloned voice can EVER be reported as 100% Human."""
    ai_samples = [s for s in benchmark_suite if s.true_label == "AI_GENERATED"]
    assert len(ai_samples) > 0

    for sample in ai_samples:
        result = await ai_pipeline.analyze_full(sample.audio_pcm, sample_rate=sample.sample_rate)

        # Must never report 100% or near-100% human for AI voice
        assert result.human_probability < 0.60, (
            f"False negative regression! {sample.category} was assigned human_prob={result.human_probability}"
        )
        assert result.classification in ("AI_GENERATED", "UNCERTAIN"), (
            f"AI voice classified as {result.classification} on {sample.category}"
        )


@pytest.mark.asyncio
async def test_diagnostics_and_disclaimer_presence():
    """All analysis results must expose rich diagnostics and the required security disclaimer."""
    sample = BenchmarkSignalGenerator.generate_human_male(duration_sec=2.0)
    result = await ai_pipeline.analyze_full(sample.audio_pcm, sample_rate=sample.sample_rate)

    assert result.diagnostics is not None
    assert "weights_applied" in result.diagnostics
    assert "raw_scores" in result.diagnostics
    assert "snr_db" in result.diagnostics
    assert "model_consensus" in result.diagnostics
    assert result.disclaimer is not None
    assert "Probabilistic assessment" in result.disclaimer
    assert "100%" in result.disclaimer


@pytest.mark.asyncio
async def test_quality_gating_uncertain_boundary():
    """Severely degraded or short audio must trigger UNCERTAIN state."""
    # Ultra-short sample (0.2s = 3200 samples @ 16kHz)
    short_pcm = (BenchmarkSignalGenerator.generate_human_male(duration_sec=0.2).waveform * 32767).astype("int16").tobytes()
    res = await ai_pipeline.analyze_full(short_pcm, sample_rate=16000)

    assert res.classification == "UNCERTAIN"
    assert "UNCERTAIN" in res.evidence_summary
    assert res.confidence < 0.60
