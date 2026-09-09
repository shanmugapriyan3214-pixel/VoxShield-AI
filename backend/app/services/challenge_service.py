"""VoxShield AI — Interactive Voice Verification Challenge Service."""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.ai.config import ai_settings
from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.core.security import utc_now

# Phonetically distinct words for real-time acoustic challenge-response
CHALLENGE_WORDS = [
    "Falcon", "Echo", "Crimson", "Orion", "Sierra", "Thunder", "Vanguard",
    "Delta", "Apollo", "Matrix", "Cipher", "Phoenix", "Obsidian", "Horizon",
    "Polaris", "Summit", "Nebula", "Specter", "Cobalt", "Timber", "Vortex"
]


class ActiveChallenge(BaseModel):
    challenge_id: str
    call_id: str
    issued_by_user_id: str
    issued_to_user_id: str
    passphrase: str
    prompt: str
    status: str = "PENDING"  # PENDING | PASSED | FAILED | EXPIRED
    attempts: int = 0
    max_attempts: int = 3
    created_at: datetime
    expires_at: datetime


class ChallengeVerificationResult(BaseModel):
    challenge_id: str
    call_id: str
    status: str
    verified: bool
    details: str
    threat_score_impact: float = 0.0
    timestamp: datetime


class ChallengeService:
    """Manages out-of-band acoustic liveness and trust challenge-response cycles."""

    def __init__(self):
        # In-memory session tracking keyed by call_id
        self._active_challenges: Dict[str, ActiveChallenge] = {}

    def issue_challenge(
        self,
        call_id: str,
        issued_by_user_id: str,
        issued_to_user_id: str,
        timeout_seconds: Optional[int] = None,
    ) -> ActiveChallenge:
        """Issue a new random multi-word acoustic verification challenge."""
        timeout = timeout_seconds or ai_settings.CHALLENGE_TIMEOUT_SECONDS
        selected_words = [secrets.choice(CHALLENGE_WORDS) for _ in range(3)]
        passphrase = " ".join(selected_words)
        challenge_id = str(uuid.uuid4())
        now = utc_now()

        challenge = ActiveChallenge(
            challenge_id=challenge_id,
            call_id=call_id,
            issued_by_user_id=issued_by_user_id,
            issued_to_user_id=issued_to_user_id,
            passphrase=passphrase,
            prompt=f"Please repeat the verification phrase clearly: '{passphrase}'",
            status="PENDING",
            attempts=0,
            max_attempts=3,
            created_at=now,
            expires_at=now + timedelta(seconds=timeout),
        )

        self._active_challenges[call_id] = challenge
        return challenge

    def get_active_challenge(self, call_id: str) -> Optional[ActiveChallenge]:
        """Retrieve active challenge for a call, marking expired if past deadline."""
        challenge = self._active_challenges.get(call_id)
        if not challenge:
            return None

        if challenge.status == "PENDING" and utc_now() > challenge.expires_at:
            challenge.status = "EXPIRED"

        return challenge

    def verify_challenge(
        self,
        call_id: str,
        challenge_id: str,
        spoken_phrase: str,
        liveness_score: Optional[float] = None,
    ) -> ChallengeVerificationResult:
        """Verify the user's response to an active challenge."""
        challenge = self._active_challenges.get(call_id)
        if not challenge or challenge.challenge_id != challenge_id:
            raise ResourceNotFoundException(f"No active challenge '{challenge_id}' found for call '{call_id}'.")

        now = utc_now()
        if now > challenge.expires_at:
            challenge.status = "EXPIRED"
            return ChallengeVerificationResult(
                challenge_id=challenge_id,
                call_id=call_id,
                status="EXPIRED",
                verified=False,
                details="Verification challenge expired. A new challenge must be requested.",
                threat_score_impact=15.0,
                timestamp=now,
            )

        if challenge.status != "PENDING":
            return ChallengeVerificationResult(
                challenge_id=challenge_id,
                call_id=call_id,
                status=challenge.status,
                verified=(challenge.status == "PASSED"),
                details=f"Challenge already finalized with status: {challenge.status}.",
                threat_score_impact=0.0,
                timestamp=now,
            )

        challenge.attempts += 1

        # Normalize strings for acoustic comparison
        expected_norm = " ".join(challenge.passphrase.lower().split())
        received_norm = " ".join(spoken_phrase.lower().split())

        # Exact or near-exact token matching
        expected_tokens = set(expected_norm.split())
        received_tokens = set(received_norm.split())
        overlap = len(expected_tokens.intersection(received_tokens)) / max(len(expected_tokens), 1)

        is_phrase_valid = (expected_norm == received_norm) or (overlap >= 0.67)
        is_liveness_acceptable = (liveness_score is None) or (liveness_score >= 0.40)

        if is_phrase_valid and is_liveness_acceptable:
            challenge.status = "PASSED"
            return ChallengeVerificationResult(
                challenge_id=challenge_id,
                call_id=call_id,
                status="PASSED",
                verified=True,
                details="Voice verification challenge passed successfully.",
                threat_score_impact=-30.0,  # Mitigates threat score
                timestamp=now,
            )
        else:
            if challenge.attempts >= challenge.max_attempts:
                challenge.status = "FAILED"
                details = f"Challenge failed: Maximum attempts exceeded ({challenge.attempts}/{challenge.max_attempts})."
            else:
                details = f"Phrase mismatch or liveness failure (Attempt {challenge.attempts}/{challenge.max_attempts})."

            return ChallengeVerificationResult(
                challenge_id=challenge_id,
                call_id=call_id,
                status=challenge.status if challenge.status == "FAILED" else "PENDING",
                verified=False,
                details=details,
                threat_score_impact=20.0,  # Escalates threat score
                timestamp=now,
            )

    def cleanup_call(self, call_id: str) -> bool:
        """Purge challenge state for a call upon termination or reset to prevent memory leaks."""
        if call_id in self._active_challenges:
            del self._active_challenges[call_id]
            return True
        return False

    def purge_expired(self, max_age_seconds: int = 600) -> int:
        """Periodic sweep to purge stale challenges older than max_age_seconds."""
        now = utc_now()
        to_delete = [
            cid for cid, ch in self._active_challenges.items()
            if (now - ch.created_at).total_seconds() > max_age_seconds
        ]
        for cid in to_delete:
            del self._active_challenges[cid]
        return len(to_delete)


challenge_service = ChallengeService()
