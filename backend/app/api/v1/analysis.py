"""VoxShield AI — Audio Analysis & Comparison Endpoints."""

import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.pipeline import ai_pipeline
from app.ai.schemas import SpeakerComparisonResult
from app.api.deps import get_current_user, get_db, get_request_id
from app.core.config import settings
from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.db.models.analysis import VoiceAnalysis
from app.db.models.user import User
from app.db.models.voice_profile import VoiceProfile
from app.schemas.analysis import AudioAnalysisResponse, CompareRequest
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/analysis", tags=["Audio Analysis"])

ALLOWED_EXTENSIONS = {"wav", "mp3", "m4a", "ogg", "flac"}


@router.post(
    "/audio",
    response_model=ApiResponse[AudioAnalysisResponse],
    status_code=status.HTTP_200_OK,
    summary="Analyze uploaded audio file for AI deepfake artifacts (Optional Offline Mode)",
)
async def analyze_audio_file(
    file: UploadFile = File(...),
    demo_scenario: Optional[str] = Query(
        None,
        description="Optional simulation scenario for demo: 'normal' | 'suspicious' | 'voice_clone'"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[AudioAnalysisResponse]:
    # Validate file extension
    filename = file.filename or ""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationException(
            f"Unsupported audio format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read audio bytes with size limit guard
    contents = await file.read()
    max_bytes = settings.MAX_AUDIO_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise ValidationException(
            f"Audio file exceeds maximum size of {settings.MAX_AUDIO_UPLOAD_SIZE_MB}MB."
        )

    # Compute SHA-256 hash of audio content
    file_hash = hashlib.sha256(contents).hexdigest()

    # Run AI pipeline
    result = await ai_pipeline.analyze_full(contents)

    # Apply demo scenario overrides if requested
    if demo_scenario == "voice_clone":
        result.classification = "LIKELY_AI_GENERATED"
        result.ai_probability = 0.96
        result.human_probability = 0.04
        result.speaker_match_score = 0.28
        result.liveness_score = 0.22
    elif demo_scenario == "suspicious":
        result.classification = "SUSPICIOUS"
        result.ai_probability = 0.52
        result.human_probability = 0.48
        result.speaker_match_score = 0.65
        result.liveness_score = 0.58
    elif demo_scenario == "normal":
        result.classification = "LIKELY_HUMAN"
        result.ai_probability = 0.03
        result.human_probability = 0.97
        result.speaker_match_score = 0.94
        result.liveness_score = 0.92


    # Persist analysis job metadata
    db_analysis = VoiceAnalysis(
        id=result.analysis_id,
        user_id=current_user.id,
        audio_file_hash=file_hash,
        status="COMPLETED",
        classification=result.classification,
        ai_probability=result.ai_probability,
        human_probability=result.human_probability,
        speaker_match_score=result.speaker_match_score,
        liveness_score=result.liveness_score,
        model_version=result.model_version,
        is_mock=result.is_mock,
    )
    db.add(db_analysis)
    await db.commit()
    await db.refresh(db_analysis)

    warning_msg = "PRIVACY NOTICE: Server-side analysis processes uploaded audio. Real-time calls use on-device analysis."
    if demo_scenario:
        warning_msg = f"DEMO MODE — SIMULATED RESULT ({demo_scenario.upper()}). Does not reflect live cryptographic or neural guarantee."
        result.is_mock = True

    response_data = AudioAnalysisResponse(
        analysis_id=db_analysis.id,
        status=db_analysis.status,
        classification=db_analysis.classification,
        ai_probability=db_analysis.ai_probability,
        human_probability=db_analysis.human_probability,
        speaker_match_score=db_analysis.speaker_match_score,
        liveness_score=db_analysis.liveness_score,
        model_version=db_analysis.model_version,
        is_mock=db_analysis.is_mock,
        created_at=db_analysis.created_at,
        warning=warning_msg,
    )


    return ApiResponse.ok(data=response_data, request_id=req_id)


@router.get(
    "/{analysis_id}",
    response_model=ApiResponse[AudioAnalysisResponse],
    summary="Get status and results of a prior audio analysis job",
)
async def get_analysis_result(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[AudioAnalysisResponse]:
    stmt = select(VoiceAnalysis).where(VoiceAnalysis.id == analysis_id)
    analysis = (await db.execute(stmt)).scalars().first()
    if not analysis:
        raise ResourceNotFoundException(f"Analysis '{analysis_id}' not found.")

    response_data = AudioAnalysisResponse(
        analysis_id=analysis.id,
        status=analysis.status,
        classification=analysis.classification,
        ai_probability=analysis.ai_probability,
        human_probability=analysis.human_probability,
        speaker_match_score=analysis.speaker_match_score,
        liveness_score=analysis.liveness_score,
        model_version=analysis.model_version,
        is_mock=analysis.is_mock,
        created_at=analysis.created_at,
    )
    return ApiResponse.ok(data=response_data, request_id=req_id)


@router.post(
    "/compare",
    response_model=ApiResponse[SpeakerComparisonResult],
    summary="Compare reference and suspect speaker representations",
)
async def compare_voices(
    data: CompareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[SpeakerComparisonResult]:
    # Extract reference vector
    ref_vec = data.reference_embedding
    if not ref_vec and data.reference_profile_id:
        stmt = select(VoiceProfile).where(VoiceProfile.id == data.reference_profile_id)
        profile = (await db.execute(stmt)).scalars().first()
        if not profile:
            raise ResourceNotFoundException(f"Reference voice profile '{data.reference_profile_id}' not found.")
        # Generate representative mock vector from profile ID
        embed_result = await ai_pipeline.embedding_service.extract_embedding(profile.id.encode())
        ref_vec = embed_result.embedding

    # Extract suspect vector
    suspect_vec = data.suspect_embedding
    if not suspect_vec and data.suspect_analysis_id:
        stmt = select(VoiceAnalysis).where(VoiceAnalysis.id == data.suspect_analysis_id)
        analysis = (await db.execute(stmt)).scalars().first()
        if not analysis:
            raise ResourceNotFoundException(f"Suspect analysis '{data.suspect_analysis_id}' not found.")
        embed_result = await ai_pipeline.embedding_service.extract_embedding(analysis.id.encode())
        suspect_vec = embed_result.embedding

    # Fallback to demo vectors if none provided
    if not ref_vec:
        ref_vec = (await ai_pipeline.embedding_service.extract_embedding(b"reference_sample")).embedding
    if not suspect_vec:
        suspect_vec = (await ai_pipeline.embedding_service.extract_embedding(b"suspect_sample")).embedding

    comp_result = await ai_pipeline.comparison_service.compare_embeddings(ref_vec, suspect_vec)
    return ApiResponse.ok(data=comp_result, request_id=req_id)
