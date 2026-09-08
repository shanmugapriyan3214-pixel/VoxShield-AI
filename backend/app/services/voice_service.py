"""VoxShield AI — Voice Profile Service."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedException, ResourceNotFoundException
from app.db.models.voice_profile import VoiceProfile
from app.schemas.voice import VoiceProfileCreate, VoiceProfileUpdate


class VoiceService:
    """Manages voice profile metadata and speaker representations."""

    @staticmethod
    async def create_profile(
        db: AsyncSession,
        user_id: str,
        data: VoiceProfileCreate,
    ) -> VoiceProfile:
        profile = VoiceProfile(
            user_id=user_id,
            label=data.label.strip(),
            model_version=data.model_version.strip(),
            status="ACTIVE",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def list_profiles(db: AsyncSession, user_id: str) -> List[VoiceProfile]:
        stmt = (
            select(VoiceProfile)
            .where(VoiceProfile.user_id == user_id)
            .order_by(VoiceProfile.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_profile(
        db: AsyncSession,
        profile_id: str,
        user_id: Optional[str] = None,
    ) -> VoiceProfile:
        stmt = select(VoiceProfile).where(VoiceProfile.id == profile_id)
        profile = (await db.execute(stmt)).scalars().first()
        if not profile:
            raise ResourceNotFoundException(f"Voice profile '{profile_id}' not found.")

        if user_id and profile.user_id != user_id:
            raise PermissionDeniedException("You do not have permission to access this voice profile.")

        return profile

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        profile_id: str,
        user_id: str,
        data: VoiceProfileUpdate,
    ) -> VoiceProfile:
        profile = await VoiceService.get_profile(db, profile_id, user_id)

        if data.label is not None:
            profile.label = data.label.strip()
        if data.status is not None:
            profile.status = data.status.strip()

        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def delete_profile(
        db: AsyncSession,
        profile_id: str,
        user_id: str,
    ) -> None:
        profile = await VoiceService.get_profile(db, profile_id, user_id)
        await db.delete(profile)
        await db.commit()
