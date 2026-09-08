"""VoxShield AI — Multi-Signal Threat Scoring Engine (Backwards-Compatible Façade)."""

from app.ai.fusion.threat_fusion import (
    ThreatAssessment,
    ThreatFusionEngine,
    threat_fusion_engine,
)

# Backwards compatible class alias
ThreatEngine = ThreatFusionEngine
threat_engine = threat_fusion_engine

__all__ = [
    "ThreatAssessment",
    "ThreatEngine",
    "ThreatFusionEngine",
    "threat_engine",
    "threat_fusion_engine",
]
