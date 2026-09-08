"""VoxShield AI — User Profile Service."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, ResourceNotFoundException
from app.db.models.user import User
from app.schemas.user import UserUpdate


class UserService:
    """Business logic for user operations."""

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower().strip())
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username.strip())
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, update_data: UserUpdate) -> User:
        if update_data.display_name is not None:
            user.display_name = update_data.display_name
        if update_data.avatar_url is not None:
            user.avatar_url = update_data.avatar_url

        await db.commit()
        await db.refresh(user)
        return user
