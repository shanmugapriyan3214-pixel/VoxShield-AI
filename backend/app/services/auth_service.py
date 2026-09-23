"""VoxShield AI — Authentication & Token Management Service."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationException, ConflictException, ValidationException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    hash_token,
    utc_now,
    verify_password,
)
from app.db.models.refresh_token import RefreshToken
from app.db.models.user import User
from app.schemas.auth import RegisterRequest, TokenResponse


class AuthService:
    """Manages identity, credential verification, and cryptographic token rotation."""

    @staticmethod
    async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
        # Check email conflict
        stmt = select(User).where(User.email == data.email.lower().strip())
        existing_email = (await db.execute(stmt)).scalars().first()
        if existing_email:
            raise ConflictException(f"A user with email '{data.email}' already exists.")

        # Check username conflict
        stmt = select(User).where(User.username == data.username.strip())
        existing_username = (await db.execute(stmt)).scalars().first()
        if existing_username:
            raise ConflictException(f"Username '{data.username}' is already taken.")

        # Hash password with Argon2id
        password_hash = get_password_hash(data.password)
        voxshield_id = f"VS-{uuid.uuid4().hex[:8].upper()}"

        new_user = User(
            email=data.email.lower().strip(),
            username=data.username.strip(),
            display_name=data.display_name.strip(),
            voxshield_id=voxshield_id,
            password_hash=password_hash,
            is_verified=False,
            is_active=True,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
        stmt = select(User).where(User.email == email.lower().strip())
        user = (await db.execute(stmt)).scalars().first()
        if not user or not verify_password(password, user.password_hash):
            raise AuthenticationException("Invalid email or password.")

        if not user.is_active:
            raise AuthenticationException("Account is disabled. Please contact security support.")

        # Update last login
        user.last_login_at = utc_now()
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def create_tokens_for_user(
        db: AsyncSession,
        user: User,
        family_id: Optional[str] = None,
    ) -> TokenResponse:
        """Create an access token and rotate/create a refresh token."""
        # Access token
        access_token = create_access_token(
            subject=user.id,
            extra_claims={"username": user.username, "email": user.email},
        )

        # Refresh token
        raw_refresh_token = create_refresh_token()
        token_hash = hash_token(raw_refresh_token)
        actual_family_id = family_id or str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        db_token = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            family_id=actual_family_id,
            is_revoked=False,
            expires_at=expires_at,
        )
        db.add(db_token)
        await db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    @staticmethod
    async def refresh_tokens(db: AsyncSession, raw_refresh_token: str) -> Tuple[User, TokenResponse]:
        """Validate refresh token, enforce single-use rotation, and revoke family on reuse."""
        t_hash = hash_token(raw_refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == t_hash)
        token_record = (await db.execute(stmt)).scalars().first()

        if not token_record:
            raise AuthenticationException("Invalid refresh token.")

        # Check if already revoked -> potential token theft reuse!
        if token_record.is_revoked:
            # Revoke entire token family
            stmt_revoke_family = (
                update(RefreshToken)
                .where(RefreshToken.family_id == token_record.family_id)
                .values(is_revoked=True)
            )
            await db.execute(stmt_revoke_family)
            await db.commit()
            raise AuthenticationException("Refresh token reuse detected. All sessions in family revoked.")

        # Check expiration
        now = datetime.now(timezone.utc)
        if token_record.expires_at.tzinfo is None:
            token_record_exp = token_record.expires_at.replace(tzinfo=timezone.utc)
        else:
            token_record_exp = token_record.expires_at

        if token_record_exp < now:
            token_record.is_revoked = True
            await db.commit()
            raise AuthenticationException("Refresh token has expired. Please log in again.")

        # Invalidate current token
        token_record.is_revoked = True

        # Fetch associated user
        stmt_user = select(User).where(User.id == token_record.user_id)
        user = (await db.execute(stmt_user)).scalars().first()
        if not user or not user.is_active:
            raise AuthenticationException("Associated user account is inactive or deleted.")

        # Issue new token pair preserving family_id
        new_tokens = await AuthService.create_tokens_for_user(
            db=db,
            user=user,
            family_id=token_record.family_id,
        )
        return user, new_tokens

    @staticmethod
    async def revoke_refresh_token(db: AsyncSession, raw_refresh_token: str) -> None:
        t_hash = hash_token(raw_refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == t_hash)
        token_record = (await db.execute(stmt)).scalars().first()
        if token_record:
            token_record.is_revoked = True
            await db.commit()

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(current_password, user.password_hash):
            raise ValidationException("Current password does not match.")

        if current_password == new_password:
            raise ValidationException("New password must be different from current password.")

        user.password_hash = get_password_hash(new_password)
        # Invalidate all active refresh tokens on password change
        stmt_revoke = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id)
            .values(is_revoked=True)
        )
        await db.execute(stmt_revoke)
        await db.commit()
