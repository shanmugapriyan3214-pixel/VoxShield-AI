"""VoxShield AI — Trusted Voice Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TrustedVoiceBase(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    relationship: str = Field(..., min_length=1, max_length=50, description="e.g. Father, Mother, Partner")
    trusted_user_id: Optional[str] = None
    voice_profile_id: Optional[str] = None


class TrustedVoiceCreate(TrustedVoiceBase):
    pass


class TrustedVoiceUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    relationship: Optional[str] = Field(None, min_length=1, max_length=50)
    voice_profile_id: Optional[str] = None
    status: Optional[str] = Field(None, max_length=30)


class TrustedVoiceResponse(BaseModel):
    """Trusted contact response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_user_id: str
    trusted_user_id: Optional[str] = None
    display_name: str
    relationship: str = Field(validation_alias="relationship_label")
    voice_profile_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
