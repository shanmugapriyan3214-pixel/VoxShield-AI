"""VoxShield AI — Voice Profile Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class VoiceProfileBase(BaseModel):
    label: str = Field(..., min_length=1, max_length=100, description="Friendly profile label")
    model_version: str = Field(default="ecapa-tdnn-v2", max_length=50)


class VoiceProfileCreate(VoiceProfileBase):
    pass


class VoiceProfileUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[str] = Field(None, max_length=30)


class VoiceProfileResponse(BaseModel):
    """Safely formatted voice profile metadata (strictly NO raw embeddings)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    label: str
    status: str
    model_version: str
    embedding_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime
