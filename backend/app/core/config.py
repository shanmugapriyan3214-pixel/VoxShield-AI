"""VoxShield AI — Application Configuration Module."""

from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # General
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "VoxShield AI"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Cryptography & JWT
    SECRET_KEY: str = "change-this-in-production-super-secret-hex-key-voxshield-0123456789abcdef"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # Database
    # Default to SQLite for zero-configuration local runs & tests; easily switched to PostgreSQL
    DATABASE_URL: str = "sqlite+aiosqlite:///./voxshield.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://10.0.2.2",
        "http://10.0.2.2:8000",
        "http://10.0.2.2:5173",
        "http://10.43.204.209",
        "http://10.43.204.209:8000",
        "http://10.43.204.209:5173",
        "http://172.16.216.27:5173",
        "http://10.217.194.209:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Rate Limiting & Abuse Prevention
    RATE_LIMIT_PER_MINUTE: int = 180
    AUTH_RATE_LIMIT_PER_MINUTE: int = 30
    CHALLENGE_RATE_LIMIT_PER_MINUTE: int = 20
    INCIDENT_RATE_LIMIT_PER_MINUTE: int = 30
    DEMO_RATE_LIMIT_PER_MINUTE: int = 60
    TELEMETRY_RATE_LIMIT_PER_MINUTE: int = 120

    # WebSocket Security & Frame Bounds
    WS_MAX_MESSAGE_BYTES: int = 65536  # 64 KB max frame size
    WS_MAX_MESSAGES_PER_SECOND: int = 30

    # AI Configuration
    AI_DETECTOR_PROVIDER: str = "mock"
    AI_EMBEDDING_PROVIDER: str = "mock"
    AI_LIVENESS_PROVIDER: str = "mock"
    AI_MODEL_VERSION: str = "voxguard-neural-v1.0-demo"

    # Blockchain Configuration
    BLOCKCHAIN_PROVIDER: str = "mock"
    BLOCKCHAIN_NETWORK: str = "mock-ledger"
    EVM_RPC_URL: str = ""
    EVM_CONTRACT_ADDRESS: str = ""
    EVM_PRIVATE_KEY: str = ""

    # Biometric / File Constraints
    ENABLE_LOCAL_STORAGE_EMBEDDINGS: bool = True
    MAX_AUDIO_UPLOAD_SIZE_MB: int = 25


settings = Settings()
