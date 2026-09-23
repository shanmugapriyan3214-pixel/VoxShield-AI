"""VoxShield AI — User Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    display_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=512)


class UserPublic(BaseModel):
    """Safely exposed public view of another user."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    voxshield_id: Optional[str] = None

    @model_validator(mode="after")
    def ensure_voxshield_id(self) -> "UserPublic":
        if not self.voxshield_id and self.id:
            clean = self.id.replace("-", "").upper()
            self.voxshield_id = f"VS-{clean[:8]}"
        return self


class UserPrivate(UserBase):
    """Full view of the authenticated user's own profile."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    voxshield_id: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    @model_validator(mode="after")
    def ensure_voxshield_id(self) -> "UserPrivate":
        if not self.voxshield_id and self.id:
            clean = self.id.replace("-", "").upper()
            self.voxshield_id = f"VS-{clean[:8]}"
        return self
