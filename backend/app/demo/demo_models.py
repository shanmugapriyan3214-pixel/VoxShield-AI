"""VoxShield AI — Pydantic Schemas for Controlled Attack Simulation & Demonstration."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DemoScenarioInfo(BaseModel):
    """Metadata describing a controlled attack simulation scenario."""
    scenario_id: str
    display_name: str
    description: str
    safety_label: str
    expected_behavior: str
    inference_type: str  # REAL_PRETRAINED_MODEL | SIMULATED_ATTACK_TELEMETRY
    detection_subsystems: List[str]
    is_real_inference: bool


class DemoExecuteRequest(BaseModel):
    """Request to execute a simulation step or attack escalation for a call session."""
    call_id: Optional[str] = Field(None, description="Optional active call session ID to bind telemetry to")
    scenario_id: str = Field(..., description="NORMAL | REPLAY_ATTACK | SYNTHETIC_SPOOF | SIMULATED_CRITICAL")
    step_index: int = Field(0, ge=0, le=10, description="Progression step within scenario (0: Baseline -> 3: Full Attack)")
    simulate_challenge_failure: bool = Field(False, description="Whether to simulate attacker failing verification challenge")


class DemoExecuteResponse(BaseModel):
    """Response containing live threat assessment and strict model provenance labeling."""
    scenario_id: str
    display_name: str
    threat_score: float
    severity: str  # LOW | MEDIUM | HIGH | CRITICAL
    ai_probability: float
    speaker_match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    detected_artifacts: List[str] = Field(default_factory=list)
    recommended_action: str
    inference_type: str  # REAL_PRETRAINED_MODEL | SIMULATED_ATTACK_TELEMETRY
    provenance_label: str
    is_real_inference: bool
    latencies_ms: Dict[str, float] = Field(default_factory=dict)
    safety_disclaimer: str
    event_id: Optional[str] = None
    incident_created: bool = False
    incident_id: Optional[str] = None
    incident_number: Optional[str] = None
    canonical_hash: Optional[str] = None
    timestamp: datetime


class TamperTestRequest(BaseModel):
    """Request to perform a non-destructive cryptographic evidence tamper demonstration."""
    incident_id: str = Field(..., description="ID of incident record to demonstrate tamper detection on")
    tamper_field: str = Field("threat_score", description="Field to artificially modify in memory (e.g. threat_score)")
    tampered_value: Any = Field(12.0, description="Artificially altered value for verification check")


class TamperTestResponse(BaseModel):
    """Cryptographic tamper verification result comparing canonical digests."""
    incident_id: str
    incident_number: str
    original_canonical_hash: str
    tampered_field: str
    original_value: Any
    tampered_value: Any
    tampered_canonical_hash: str
    on_chain_hash: Optional[str] = None
    is_valid: bool
    verification_status: str  # TAMPER_DETECTED | VERIFIED
    details: str
    proof_explanation: str


class DemoResetRequest(BaseModel):
    """Request to reset demo state for a call session."""
    call_id: Optional[str] = None


class DemoResetResponse(BaseModel):
    """Result of demo reset action."""
    status: str
    message: str
    call_id: Optional[str] = None
