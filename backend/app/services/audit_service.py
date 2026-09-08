"""VoxShield AI — Audit Logging Service."""

import json
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.db.models.audit import AuditLog


class AuditService:
    """Records immutable compliance and security audit logs."""

    @staticmethod
    async def log_action(
        db: AsyncSession,
        action: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                ip_address=ip_address,
                user_agent=user_agent,
                details_json=json.dumps(details or {}),
            )
            db.add(log_entry)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to persist audit log for action '{action}': {e}")
