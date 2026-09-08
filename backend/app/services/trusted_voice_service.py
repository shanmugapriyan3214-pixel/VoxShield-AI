"""VoxShield AI — Trusted Voice Service."""

from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedException, ResourceNotFoundException
from app.db.models.trusted_voice import TrustedVoice
from app.schemas.trusted_voice import TrustedVoiceCreate, TrustedVoiceUpdate


class TrustedVoiceService:
    """Manages trusted contacts and relationship verification."""

    @staticmethod
    async def create_contact(
        db: AsyncSession,
        user_id: str,
        data: TrustedVoiceCreate,
    ) -> TrustedVoice:
        contact = TrustedVoice(
            owner_user_id=user_id,
            trusted_user_id=data.trusted_user_id,
            display_name=data.display_name.strip(),
            relationship_label=data.relationship.strip(),
            voice_profile_id=data.voice_profile_id,
            status="VERIFIED",
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def list_contacts(db: AsyncSession, user_id: str) -> List[TrustedVoice]:
        stmt = (
            select(TrustedVoice)
            .where(TrustedVoice.owner_user_id == user_id)
            .order_by(TrustedVoice.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_contact(
        db: AsyncSession,
        contact_id: str,
        user_id: str,
    ) -> TrustedVoice:
        stmt = select(TrustedVoice).where(TrustedVoice.id == contact_id)
        contact = (await db.execute(stmt)).scalars().first()
        if not contact:
            raise ResourceNotFoundException(f"Trusted contact '{contact_id}' not found.")

        if contact.owner_user_id != user_id:
            raise PermissionDeniedException("You do not have permission to access this contact.")

        return contact

    @staticmethod
    async def update_contact(
        db: AsyncSession,
        contact_id: str,
        user_id: str,
        data: TrustedVoiceUpdate,
    ) -> TrustedVoice:
        contact = await TrustedVoiceService.get_contact(db, contact_id, user_id)

        if data.display_name is not None:
            contact.display_name = data.display_name.strip()
        if data.relationship is not None:
            contact.relationship_label = data.relationship.strip()
        if data.voice_profile_id is not None:
            contact.voice_profile_id = data.voice_profile_id
        if data.status is not None:
            contact.status = data.status.strip()

        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def delete_contact(
        db: AsyncSession,
        contact_id: str,
        user_id: str,
    ) -> None:
        contact = await TrustedVoiceService.get_contact(db, contact_id, user_id)
        await db.delete(contact)
        await db.commit()
