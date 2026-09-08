# VoxShield AI — Blockchain Evidence & Tamper-Evident Ledger

## 1. Executive Purpose
When voice cloning and impersonation attacks occur (e.g. CEO fraud, urgent wire transfer extortion, kidnapping scams), enterprise risk officers, legal teams, and law enforcement require immutable, tamper-evident proof that:
1. The incident was recorded at a specific timestamp.
2. The indicators (threat scores, AI probabilities, timestamps) have not been modified post-facto.
3. The chain of custody is mathematically verifiable.

---

## 2. The Anchoring Lifecycle

```
[Security Incident Created]
           │
           ▼
[Canonical JSON Serialization] ──► RFC 8785 (Lexicographical sorting, strict floats)
           │
           ▼
[SHA-256 Digest Generation]   ──► 0x7f83b165... (bytes32 cryptographic hash)
           │
           ▼
[Database Record Updated]      ──► Stores canonical_hash in PostgreSQL
           │
           ▼
[Blockchain Adapter Invocation]
     │                    │
     ▼                    ▼
[Mock Adapter]     [EVM Adapter (Sepolia / Polygon)]
(Local Dev / CI)   (Calls recordIncidentProof(bytes32, uint256, string))
     │                    │
     └─────────┬──────────┘
               │
               ▼
[Receipt & Block Metadata Stored]
  - transaction_hash
  - block_number
  - contract_address
  - status: CONFIRMED
```

---

## 3. Strict Privacy Invariants: What Goes On-Chain

> [!CAUTION]
> **Zero PII on Distributed Ledgers**: Blockchains are permanent, public, and immutable. Storing personal information or biometric data on-chain violates GDPR, CCPA, and fundamental privacy laws.

### Forbidden from Blockchain:
- ❌ Raw or compressed voice audio
- ❌ Speaker embedding vectors or biometric profiles
- ❌ User real names, email addresses, phone numbers
- ❌ Call transcripts or message contents
- ❌ Private keys, passwords, or session tokens

### Permitted on Blockchain:
- ✅ Canonical `SHA-256` incident evidence hash (`bytes32`)
- ✅ Unix timestamp (`uint256`)
- ✅ Pseudonymous incident identifier string (`string incidentId`)
- ✅ Reporter cryptographic address (`address`)

---

## 4. Smart Contract Interface (Solidity / EVM)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVoxShieldRegistry {
    event IncidentAnchored(
        bytes32 indexed incidentHash,
        string incidentId,
        uint256 timestamp,
        address indexed reporter
    );

    function recordIncidentProof(
        bytes32 incidentHash,
        uint256 timestamp,
        string calldata incidentId
    ) external returns (bool);

    function verifyIncidentProof(
        bytes32 incidentHash
    ) external view returns (
        bool exists,
        uint256 timestamp,
        string memory incidentId,
        address reporter
    );
}
```

---

## 5. Verification Mechanism

When a consumer calls `GET /api/v1/incidents/{id}/verification`:
1. The backend retrieves the current incident record from the database.
2. The canonical JSON serializer recalculates the `SHA-256` hash of the current record.
3. The stored blockchain record is queried (or on-chain smart contract is inspected).
4. The system validates whether:
   - Recalculated Hash == Stored Canonical Hash == On-Chain Anchored Hash.
5. Status emitted:
   - `VERIFIED`: Exact cryptographic match. Proof is immutable and pristine.
   - `TAMPERED`: Hash mismatch detected! Database record has been altered after anchoring.
   - `UNANCHORED`: Incident exists in DB but has not yet been committed to a ledger.
