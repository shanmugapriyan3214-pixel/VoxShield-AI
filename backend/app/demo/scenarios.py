"""VoxShield AI — Attack Simulation Scenario Catalog & Definitions."""

from typing import Dict
from app.demo.demo_models import DemoScenarioInfo

SCENARIOS: Dict[str, DemoScenarioInfo] = {
    "NORMAL": DemoScenarioInfo(
        scenario_id="NORMAL",
        display_name="Normal Trusted Voice",
        description=(
            "Baseline legitimate human conversation. Verified trusted speaker with "
            "natural vocal tract resonances, normal fundamental frequency variation, and positive liveness."
        ),
        safety_label="Controlled Cybersecurity Demonstration — Benign Baseline",
        expected_behavior="Threat score remains low (8–15). Risk: LOW. Action: CONTINUE_NORMAL.",
        inference_type="REAL_PRETRAINED_MODEL",
        detection_subsystems=[
            "AASIST-L AntiSpoof ONNX (REAL_PRETRAINED_MODEL)",
            "ECAPA-TDNN VoxCeleb ONNX (REAL_PRETRAINED_MODEL)",
            "Deterministic DSP Liveness Analyzer (LOCAL_DSP_ANALYZER)",
        ],
        is_real_inference=True,
    ),
    "REPLAY_ATTACK": DemoScenarioInfo(
        scenario_id="REPLAY_ATTACK",
        display_name="Replay / Acoustic Impersonation",
        description=(
            "Prerecorded voice test sample subjected to acoustic room impulse, low-pass frequency damping, "
            "and phase smearing characteristic of acoustic loudspeaker playback."
        ),
        safety_label="Controlled Cybersecurity Demonstration — Anti-Replay Testing",
        expected_behavior=(
            "DSP liveness anomaly detected (< 0.40), AASIST-L elevated, speaker match degraded. "
            "Threat score escalates to HIGH (55–65). Action: REQUIRE_VERIFICATION."
        ),
        inference_type="REAL_PRETRAINED_MODEL",
        detection_subsystems=[
            "AASIST-L AntiSpoof ONNX (REAL_PRETRAINED_MODEL)",
            "ECAPA-TDNN VoxCeleb ONNX (REAL_PRETRAINED_MODEL)",
            "Deterministic DSP Liveness Analyzer (LOCAL_DSP_ANALYZER)",
        ],
        is_real_inference=True,
    ),
    "SYNTHETIC_SPOOF": DemoScenarioInfo(
        scenario_id="SYNTHETIC_SPOOF",
        display_name="Synthetic Speech / Vocoder Spoof",
        description=(
            "Synthetic speech waveform exhibiting neural vocoder phase discontinuities, "
            "spectral tilt anomalies, and artificial harmonic generation."
        ),
        safety_label="Synthetic Test Audio — Cybersecurity Demonstration",
        expected_behavior=(
            "AASIST-L detects synthetic speech artifacts, speaker embedding mismatch. "
            "Threat score escalates to CRITICAL (75–85). Action: RECOMMEND_TERMINATION."
        ),
        inference_type="REAL_PRETRAINED_MODEL",
        detection_subsystems=[
            "AASIST-L AntiSpoof ONNX (REAL_PRETRAINED_MODEL)",
            "ECAPA-TDNN VoxCeleb ONNX (REAL_PRETRAINED_MODEL)",
            "Deterministic DSP Liveness Analyzer (LOCAL_DSP_ANALYZER)",
        ],
        is_real_inference=True,
    ),
    "SIMULATED_CRITICAL": DemoScenarioInfo(
        scenario_id="SIMULATED_CRITICAL",
        display_name="Simulated Critical Attack (Telemetry Demonstration)",
        description=(
            "Controlled telemetry simulation of an advanced zero-day multi-vector voice cloning attack. "
            "Demonstrates platform defense response when model inputs produce maximum threat."
        ),
        safety_label="SIMULATED ATTACK TELEMETRY — NOT REAL MODEL OUTPUT",
        expected_behavior=(
            "Simulated telemetry progression leading to immediate threat score 88–95, "
            "Risk: CRITICAL, Action: RECOMMEND_TERMINATION."
        ),
        inference_type="SIMULATED_ATTACK_TELEMETRY",
        detection_subsystems=[
            "Simulated Threat Telemetry Layer (NOT REAL MODEL OUTPUT)",
        ],
        is_real_inference=False,
    ),
}
