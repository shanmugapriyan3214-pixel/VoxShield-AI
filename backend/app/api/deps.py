"""VoxShield AI — FastAPI Dependencies Provider."""

from typing import Optional
import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationException
from app.core.logging import request_id_ctx
from app.core.security import decode_token
from app.db.models.user import User
from app.db.session import get_db
from app.services.user_service import UserService

security_bearer = HTTPBearer(auto_error=False)


def get_request_id(x_request_id: Optional[str] = Header(default=None)) -> str:
    """Return current request correlation ID."""
    return x_request_id or request_id_ctx.get("-")


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> User:
    """Extract and validate JWT access token, returning authenticated User model."""
    if not credentials or not credentials.credentials:
        raise AuthenticationException("Authentication required. Missing Bearer token.")

    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if not user_id or token_type != "access":
            raise AuthenticationException("Invalid token claims or token type.")
    except jwt.ExpiredSignatureError:
        raise AuthenticationException("Access token has expired. Please refresh your session.")
    except (jwt.InvalidTokenError, Exception) as err:
        raise AuthenticationException(f"Invalid access token: {str(err)}")

    user = await UserService.get_by_id(db, user_id)
    if not user:
        raise AuthenticationException("User corresponding to this token does not exist.")

    if not user.is_active:
        raise AuthenticationException("User account has been disabled.")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Verify that current authenticated user is active."""
    if not current_user.is_active:
        raise AuthenticationException("Inactive user.")
    return current_user
