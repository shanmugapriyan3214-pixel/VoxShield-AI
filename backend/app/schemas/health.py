"""VoxShield AI — Health Probes Schemas."""

from datetime import datetime
from typing import Dict
from pydantic import BaseModel


class ComponentHealth(BaseModel):
    status: str  # UP, DOWN, DEGRADED, MOCK
    details: str


class DetailedHealthResponse(BaseModel):
    status: str  # HEALTHY, DEGRADED, UNHEALTHY
    version: str
    environment: str
    timestamp: datetime
    components: Dict[str, ComponentHealth]
