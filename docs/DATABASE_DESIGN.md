# VoxShield AI — Database Schema & Entity Design

## 1. Schema Overview
The VoxShield AI persistence tier utilizes **PostgreSQL** with strict referential integrity, UUIDv4 primary keys, UTC timestamp indexing, and encrypted storage for sensitive fields. For local development and continuous integration environments, the SQLAlchemy model layer seamlessly adapts to SQLite.

---

## 2. Entity-Relationship Diagram (Conceptual)

```
        +-------------------+
        |       users       |
        +---------┬---------+
                  │
     ┌────────────┼─────────────┬─────────────┬─────────────┐
     ▼            ▼             ▼             ▼             ▼
+-----------+ +------------+ +------------+ +-----------+ +-----------+
|refresh_   | |voice_      | |trusted_    | |calls      | |incidents  |
|tokens     | |profiles    | |voices      | |(caller/   | |           |
+-----------+ +------------+ +------------+ |receiver)  | +-----┬-----+
                                            +-----┬-----+       │
                                                  │             │
                                            ┌─────┴─────┐       ▼
                                            ▼           ▼ +-----------+
                                     +-----------+ +----+ |blockchain_|
                                     |call_      | |call| |records    |
                                     |security_  | |part| +-----------+
                                     |events     | +----+
                                     +-----┬-----+
                                           │
                                           ▼
                                    +-----------+
                                    |threat_    |
                                    |events     |
                                    +-----------+
```

---

## 3. Database Entity Definitions

### 3.1 `users`
Represents platform user accounts.
- `id` (UUID, Primary Key, default: `gen_random_uuid()`)
- `email` (VARCHAR(255), Unique, Not Null, Index)
- `username` (VARCHAR(50), Unique, Not Null, Index)
- `display_name` (VARCHAR(100), Not Null)
- `password_hash` (VARCHAR(255), Not Null) — Argon2id hash.
- `avatar_url` (VARCHAR(512), Nullable)
- `is_verified` (BOOLEAN, Default: `false`)
- `is_active` (BOOLEAN, Default: `true`)
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)
- `updated_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`, on update: current timestamp)
- `last_login_at` (TIMESTAMPTZ, Nullable)

### 3.2 `refresh_tokens`
Stores cryptographically hashed refresh tokens for multi-device session management and token rotation.
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `token_hash` (VARCHAR(64), Unique, Not Null) — SHA-256 hash of token.
- `family_id` (UUID, Not Null, Index) — Used for reuse detection & token family revocation.
- `is_revoked` (BOOLEAN, Default: `false`)
- `expires_at` (TIMESTAMPTZ, Not Null, Index)
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)

### 3.3 `voice_profiles`
Stores metadata and descriptors for reference speaker verification.
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `label` (VARCHAR(100), Not Null) — e.g. "Primary Device Profile"
- `status` (VARCHAR(30), Default: `'ACTIVE'`) — `ACTIVE`, `PENDING_CALIBRATION`, `REVOKED`
- `model_version` (VARCHAR(50), Not Null) — Model used to generate embeddings (e.g. `ecapa-tdnn-v2`)
- `embedding_hash` (VARCHAR(64), Nullable) — Cryptographic fingerprint of vector.
- `encrypted_embedding` (TEXT, Nullable) — AES-256-GCM encrypted feature vector.
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)
- `updated_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)

### 3.4 `trusted_voices`
User contact relationships for real-time contact impersonation defense.
- `id` (UUID, Primary Key)
- `owner_user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `trusted_user_id` (UUID, FK -> `users.id` ON DELETE SET NULL, Nullable)
- `display_name` (VARCHAR(100), Not Null)
- `relationship` (VARCHAR(50), Not Null) — e.g. `FATHER`, `MOTHER`, `PARTNER`, `COLLEAGUE`
- `voice_profile_id` (UUID, FK -> `voice_profiles.id` ON DELETE SET NULL, Nullable)
- `status` (VARCHAR(30), Default: `'VERIFIED'`) — `VERIFIED`, `PENDING`, `SUSPENDED`
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)
- `updated_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)

### 3.5 `calls`
Call session metadata and cryptographic state.
- `id` (UUID, Primary Key)
- `caller_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `receiver_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `status` (VARCHAR(30), Default: `'RINGING'`, Index) — `RINGING`, `ACCEPTED`, `ACTIVE`, `ENDED`, `REJECTED`, `MISSED`
- `encryption_algorithm` (VARCHAR(50), Default: `'DTLS-SRTP-AES-GCM-128'`)
- `termination_reason` (VARCHAR(100), Nullable)
- `started_at` (TIMESTAMPTZ, Nullable)
- `ended_at` (TIMESTAMPTZ, Nullable)
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)

### 3.6 `call_participants`
Tracks participant presence and SDP session identifiers.
- `id` (UUID, Primary Key)
- `call_id` (UUID, FK -> `calls.id` ON DELETE CASCADE, Index)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `role` (VARCHAR(20), Not Null) — `CALLER`, `RECEIVER`
- `joined_at` (TIMESTAMPTZ, Nullable)
- `left_at` (TIMESTAMPTZ, Nullable)

### 3.7 `call_security_events`
Client-reported security telemetry generated during calls.
- `id` (UUID, Primary Key)
- `call_id` (UUID, FK -> `calls.id` ON DELETE CASCADE, Index)
- `reported_by_user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `event_type` (VARCHAR(50), Not Null, Index) — `AI_VOICE_DETECTED`, `SPEAKER_MISMATCH`, `LIVENESS_FAILURE`, `HIGH_THREAT`, `CALL_VERIFIED`
- `severity` (VARCHAR(20), Not Null, Index) — `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `threat_score` (FLOAT, Not Null) — 0.0 to 100.0
- `ai_probability` (FLOAT, Not Null) — 0.0 to 1.0
- `speaker_match_score` (FLOAT, Nullable) — 0.0 to 1.0
- `liveness_score` (FLOAT, Nullable) — 0.0 to 1.0
- `metadata_json` (JSONB / JSON, Default: `{}`)
- `timestamp` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`, Index)

### 3.8 `voice_analyses`
Optional user-initiated offline audio file analysis jobs.
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `audio_file_hash` (VARCHAR(64), Not Null, Index) — SHA-256 of file.
- `status` (VARCHAR(30), Default: `'COMPLETED'`) — `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`
- `classification` (VARCHAR(50), Not Null) — `LIKELY_HUMAN`, `LIKELY_AI_GENERATED`, `SUSPICIOUS`, `UNKNOWN`
- `ai_probability` (FLOAT, Not Null)
- `human_probability` (FLOAT, Not Null)
- `speaker_match_score` (FLOAT, Nullable)
- `liveness_score` (FLOAT, Nullable)
- `model_version` (VARCHAR(50), Not Null)
- `is_mock` (BOOLEAN, Default: `true`)
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)

### 3.9 `threat_events`
Aggregated threat intelligence entries for audit, timeline, and reporting.
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `call_id` (UUID, FK -> `calls.id` ON DELETE SET NULL, Nullable, Index)
- `event_type` (VARCHAR(50), Not Null, Index)
- `severity` (VARCHAR(20), Not Null, Index)
- `threat_score` (FLOAT, Not Null, Index)
- `ai_probability` (FLOAT, Not Null)
- `speaker_match_score` (FLOAT, Nullable)
- `liveness_score` (FLOAT, Nullable)
- `timestamp` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`, Index)
- `metadata_json` (JSONB / JSON, Default: `{}`)

### 3.10 `incidents`
Formal security incident records generated automatically or reported by users.
- `id` (UUID, Primary Key)
- `incident_number` (VARCHAR(50), Unique, Not Null, Index) — e.g. `VOX-2026-0001`
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE, Index)
- `call_id` (UUID, FK -> `calls.id` ON DELETE SET NULL, Nullable)
- `incident_type` (VARCHAR(50), Not Null) — e.g. `VOICE_CLONING_ATTEMPT`, `IMPERSONATION`
- `severity` (VARCHAR(20), Not Null, Index)
- `threat_score` (FLOAT, Not Null)
- `ai_probability` (FLOAT, Not Null)
- `speaker_match_score` (FLOAT, Nullable)
- `liveness_score` (FLOAT, Nullable)
- `summary` (TEXT, Not Null)
- `indicators_json` (JSONB / JSON, Default: `[]`)
- `recommendations_json` (JSONB / JSON, Default: `[]`)
- `canonical_hash` (VARCHAR(64), Nullable, Index) — RFC 8785 SHA-256
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`, Index)
- `updated_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)

### 3.11 `blockchain_records`
Audit trail of cryptographic anchors committed to distributed ledgers.
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK -> `incidents.id` ON DELETE CASCADE, Unique, Index)
- `canonical_hash` (VARCHAR(66), Not Null) — 0x prefixed hex
- `network` (VARCHAR(50), Not Null) — `mock-ledger`, `ethereum-sepolia`, `polygon`
- `contract_address` (VARCHAR(42), Nullable)
- `transaction_hash` (VARCHAR(66), Not Null, Index)
- `block_number` (BIGINT, Not Null)
- `status` (VARCHAR(30), Default: `'CONFIRMED'`) — `PENDING`, `CONFIRMED`, `FAILED`
- `anchored_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`)

### 3.12 `audit_logs`
Immutable compliance and access log.
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `users.id` ON DELETE SET NULL, Nullable, Index)
- `action` (VARCHAR(100), Not Null, Index) — e.g. `USER_LOGIN`, `PASSWORD_CHANGE`, `INCIDENT_ANCHORED`
- `ip_address` (VARCHAR(45), Nullable)
- `user_agent` (VARCHAR(255), Nullable)
- `details_json` (JSONB / JSON, Default: `{}`)
- `created_at` (TIMESTAMPTZ, Default: `CURRENT_TIMESTAMP`, Index)
