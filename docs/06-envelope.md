# 06 · Conversation State Envelope — field reference

> **Status:** Non-normative explanation. The authoritative schema is [`../schemas/ohp-envelope.schema.json`](../schemas/ohp-envelope.schema.json) and the normative requirements are in [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md) §4.

This document walks through every field in the OHP Conversation State Envelope (CSE). Field names are stable strings (not positional); v0.1 readers gracefully ignore v0.2 additions.

## Reference envelope

This is a complete OHP-Regulated envelope. Lower tiers omit the blocks they do not need.

```json
{
  "ohp": "0.1",
  "conformance": "regulated",
  "id": "cse_01HZX0R5N9V8W1QYK0XQM3R3K9",
  "issuedAt": "2026-05-28T13:42:11Z",
  "notBefore": "2026-05-28T13:42:11Z",
  "notAfter":  "2026-05-28T13:47:11Z",

  "issuer": {
    "vendor": "vendor-a",
    "agentId": "asst_b3",
    "region": "uk-west",
    "did": "did:web:agents.example.com:asst_b3",
    "federation": "did:web:federation.openhandoffprotocol.org",
    "aiRole": "deployer",
    "attestation": { "type": "tdx", "evidence": "ohp-eat:..." }
  },
  "audience": {
    "vendor": "vendor-b",
    "did": "did:web:cc.example.com",
    "aiRole": "deployer",
    "purpose": "ai-vendor-handoff",
    "minTier": "regulated",
    "recipientKeys": [
      { "kid": "gx_2026_05", "alg": "HPKE/X25519-SHA256-CHACHA20POLY1305" }
    ]
  },

  "aiSystem": {
    "id": "urn:vendor-a:asst:b3-2026-05",
    "version": "2026.05.27",
    "modelCardSha256": "sha256:...",
    "riskClass": "high",
    "annexIIIClause": "5(b)",
    "ceConformity": {
      "assessmentRoute": "self",
      "notifiedBodyId": null,
      "declarationUrl": "https://docs.example.com/doc/CE-2026-05.pdf",
      "validUntil": "2027-05-01"
    },
    "gpaiChain": [
      { "provider": "example-gpai", "model": "example-llm-2026-04", "systemicRisk": true,
        "policyUrl": "https://example.com/policies/gpai" },
      { "provider": "example-tts", "model": "example-voice-2026-01", "systemicRisk": false }
    ],
    "postMarketEndpoint": "https://api.example.com/v1/ohp/post-market"
  },

  "governance": {
    "aiia": { "id": "aiia:vendor-a:asst-b3:2026-04",
              "lastReviewedAt": "2026-04-12",
              "residualRisk": "low",
              "uri": "ohp://aiia/vendor-a/asst-b3" },
    "fria": { "id": "fria:vendor-c:asst-b3:2026-04",
              "completedAt": "2026-04-18",
              "uri": "ohp://fria/vendor-c/asst-b3" },
    "prohibited": {
      "subliminalManipulation": false,
      "socialScoring": false,
      "rtBiometricIdPublic": false,
      "emotionRecognitionWorkplace": false,
      "sensitiveBiometricCategorisation": false,
      "attestationJws": "eyJ..."
    },
    "art50Disclosure": {
      "disclosed": true,
      "at": "2026-05-28T13:38:05Z",
      "modality": "tts-preamble",
      "language": "en-GB",
      "transcript": "You're speaking with an AI assistant; a human can take over at any time.",
      "ack": "implicit-continuation",
      "proofJws": "eyJ..."
    },
    "art86Explanation": {
      "available": true,
      "endpoint": "https://api.example.com/v1/ohp/explain"
    }
  },

  "oversight": {
    "mode": "human-on-the-loop",
    "supervisor": { "presence": "live", "identity": "supervisor:9k...",
                    "channelRef": "ohp:supervisor-bus" },
    "escalation": { "triggers": ["intent.confidence<0.6","slot.amountGBP>500"],
                    "verb": "PROPOSE", "target": "human-queue:tier-2" },
    "lastReviewAt": "2026-05-28T13:40:00Z"
  },

  "session": {
    "callId": "callid_2026K9",
    "channel": "voice/pstn",
    "locale": "en-GB",
    "startedAt": "2026-05-28T13:38:02Z",
    "media": {
      "rtpFingerprint": "sha256:7a91...",
      "sdpHints": { "codecs": ["OPUS/48000/2", "PCMU/8000"] }
    }
  },

  "caller": {
    "assurance": {
      "method": "voice-biometric+hard-token",
      "ial": "IAL2", "aal": "AAL3", "fal": "FAL2",
      "lastStepUpAt": "2026-05-28T13:39:00Z",
      "idp": "did:web:idp.example.com",
      "proofJws": "eyJ..."
    },
    "identity": {
      "sdJwtVc": "eyJ...",
      "disclosures": ["WyJhYmM...", "WyJkZWY..."],
      "claimsRevealed": ["given_name","family_name","accountRef"]
    },
    "consent": [
      {
        "receiptId": "iso27560:rcpt_99x",
        "purpose": "ai-vendor-handoff",
        "scope":   ["transcript.summary","intent.slots:non-phi"],
        "lawfulBasis": "gdpr.art6.1.b",
        "specialCategoryBasis": null,
        "jurisdiction": "GB",
        "transferMechanism": "uk-adequacy"
      }
    ]
  },

  "intent": {
    "current": { "name": "dispute_charge", "confidence": 0.91 },
    "stack":   [ { "name": "authenticate", "status": "satisfied" } ],
    "slots":   {
      "chargeId": "ch_7781",
      "amountGBP": 42.50,
      "disputeReason": "unauthorised",
      "card": { "ref": "tokenex:tok_c4f2" }
    }
  },

  "sealed": {
    "alg": "HPKE/X25519-SHA256-CHACHA20POLY1305",
    "recipients": [ { "kid": "gx_2026_05", "enc": "..." } ],
    "ciphertext": "...",
    "fields": ["healthcare.fhirRef","caller.vulnerable"]
  },

  "transcript": {
    "format": "ohp.turns/v1",
    "redaction": { "policy": "pii-mask+pci-drop+phi-mask", "version": "1.1" },
    "turns": [
      { "t": "...", "role": "caller", "text": "I need to dispute a charge from yesterday." },
      { "t": "...", "role": "agent",  "text": "Was it a card payment?" },
      { "t": "...", "role": "caller", "text": "Yes, ending [REDACTED:pan-last4=2737]." }
    ],
    "summary": "Caller authenticated at AAL3; raising chargeback for ch_7781 (GBP 42.50)."
  },

  "memory": {
    "modelAllowlist": ["openai:gpt-4o","anthropic:claude-3.7"],
    "embeddings": [{ "model": "text-embedding-3-large", "vectorRef": "sealed:..." }],
    "facts": ["prefers email follow-up"]
  },

  "decisions": [
    { "id": "dec_01HZX...A1", "at": "2026-05-28T13:39:42Z",
      "type": "intent.classification",
      "input":  { "turnIds": ["t_07","t_08"] },
      "output": { "intent": "dispute_charge", "confidence": 0.91 },
      "model":  "urn:vendor-a:asst:b3-2026-05",
      "rationaleRef": "ohp:rationale:dec_01HZX...A1",
      "humanReviewed": false }
  ],

  "policy": {
    "retention":   { "transcript": "P30D", "audio": "P0D", "embeddings": "P7D" },
    "redaction":   { "pii": "mask", "pci": "drop", "phi": "mask" },
    "guardrails":  ["no-cross-sell","no-payment-collection"],
    "dataResidency": ["GB","EEA"]
  },

  "control": {
    "verb": "PROPOSE",
    "reason": "human-requested",
    "fallback": { "verb": "RETURN", "after": "PT60S" },
    "nonce": "9f3b1a"
  },

  "transparency": {
    "logId": "rekor.openhandoffprotocol.org",
    "leafHash": "sha256:..."
  },

  "signatures": [
    { "kid": "ck_vendor_a_2026_05_ed",  "alg": "EdDSA",   "jws": "eyJ..." },
    { "kid": "ck_vendor_a_2026_05_pq",  "alg": "ML-DSA-65","jws": "eyJ..." }
  ]
}
```

## Field reference

### Top-level metadata

| Field | Type | Tier | Description |
| --- | --- | --- | --- |
| `ohp` | string | All | Wire-format version. `"0.1"` for this spec. |
| `conformance` | enum | All | One of `core` \| `signed` \| `sealed` \| `regulated`. |
| `id` | string (ULID) | All | Idempotency key. ULID per Crockford spec. |
| `issuedAt` | RFC 3339 datetime | All | When the sender built the envelope. |
| `notBefore` | RFC 3339 datetime | Signed+ | Envelope MUST NOT be honoured before this. Defaults to `issuedAt`. |
| `notAfter` | RFC 3339 datetime | All | Envelope MUST NOT be honoured after this. MUST be ≤ `issuedAt + 5min`. |

### `issuer`

The party emitting the envelope.

| Field | Tier | Description |
| --- | --- | --- |
| `vendor` | All | Short vendor identifier (lowercase, alphanumeric + dash). |
| `agentId` | All | Sender's identifier for the originating agent / runtime. |
| `region` | All | Deployment region (e.g. `uk-west`, `eu-central-1`). |
| `did` | Signed+ | DID resolvable via `did:web` (or other supported method). |
| `federation` | Sealed+ | Federation entity statement DID. |
| `aiRole` | Regulated | One of `provider` \| `deployer` \| `importer` \| `distributor`. |
| `attestation` | Optional | TEE attestation object: `{ type, evidence }`. |

### `audience`

The intended receiver and the workload's tier floor.

| Field | Tier | Description |
| --- | --- | --- |
| `vendor` | All | Target vendor identifier. |
| `did` | Signed+ | Target DID. |
| `aiRole` | Regulated | Target's AI Act role. |
| `purpose` | All | RAR-style purpose string. Receivers reject if their declared scope < purpose. |
| `minTier` | All | Workload minimum tier. Receivers MUST refuse if `conformance < minTier`. |
| `recipientKeys` | Sealed+ | Array of `{ kid, alg }` — HPKE recipient keys for sealed fields. |

### `aiSystem` (Regulated only)

See [`05-ai-governance.md`](./05-ai-governance.md#aisystem) for full descriptions of `riskClass`, `annexIIIClause`, `ceConformity`, `gpaiChain`, `postMarketEndpoint`.

### `governance` (Regulated only)

Contains `aiia`, `fria`, `prohibited`, `art50Disclosure`, `art86Explanation`. See [`05-ai-governance.md`](./05-ai-governance.md).

### `oversight` (Regulated only, Required for high-risk)

See [`05-ai-governance.md`](./05-ai-governance.md#human-oversight-state-art-14).

### `session`

| Field | Tier | Description |
| --- | --- | --- |
| `callId` | All | Opaque call identifier. Stable across both sides of the hand-off. |
| `channel` | All | One of `voice/pstn` \| `voice/webrtc` \| `voice/sip` \| `chat/web` \| `chat/sms` \| `video/webrtc`. |
| `locale` | All | BCP-47 language tag. |
| `startedAt` | Signed+ | RFC 3339 datetime — when the call leg started. |
| `media.rtpFingerprint` | Sealed+ Required | SHA-256 fingerprint of the active RTP stream (deterministic sample). Receivers verify against the live leg. |
| `media.sdpHints` | Optional | `{ codecs }` — hints for receiver media path setup. |

### `caller`

| Field | Tier | Description |
| --- | --- | --- |
| `assurance.method` | Sealed+ | Method used (e.g. `voice-biometric+hard-token`). |
| `assurance.ial` / `aal` / `fal` | Sealed+ | NIST 800-63-3 / eIDAS LoA. |
| `assurance.lastStepUpAt` | Sealed+ | When the most recent step-up occurred. |
| `assurance.idp` | Sealed+ | DID of the IdP that signed the assurance proof. |
| `assurance.proofJws` | Sealed+ | Detached JWS by the IdP over the assurance claim. |
| `identity.sdJwtVc` | Sealed+ | The SD-JWT VC. |
| `identity.disclosures` | Sealed+ | Salted disclosures revealed for this purpose. |
| `identity.claimsRevealed` | Sealed+ | List of claim names that were disclosed. |
| `consent[]` | All | Array of consent receipts (see below). |

#### `caller.consent[]`

| Field | Description |
| --- | --- |
| `receiptId` | Resolvable ISO/IEC 27560 receipt identifier. The receipt body is NOT inlined. |
| `purpose` | Purpose string. Receivers MUST reject if their intended processing exceeds the receipt. |
| `scope` | RAR-style scope array. |
| `lawfulBasis` | GDPR basis identifier (e.g. `gdpr.art6.1.b`). |
| `specialCategoryBasis` | GDPR Art 9 basis if applicable (e.g. `gdpr.art9.2.a`), else `null`. |
| `jurisdiction` | ISO 3166-1 alpha-2 country code. |
| `transferMechanism` | One of `scc` \| `dpf` \| `adequacy` \| `uk-adequacy` \| `none`. |

### `intent`

| Field | Tier | Description |
| --- | --- | --- |
| `current.name` | All | Current intent name. |
| `current.confidence` | All | Float 0..1. |
| `stack[]` | All | Stack of prior intents with `status` (`satisfied` \| `pending` \| `failed`). |
| `slots` | All | Object of slot values. Card data MUST use opaque tokens via `card.ref`, never PAN. |

### `sealed` (Sealed+ only)

| Field | Description |
| --- | --- |
| `alg` | HPKE suite identifier. |
| `recipients[]` | Array of `{ kid, enc }` per recipient. |
| `ciphertext` | Base64url-encoded ciphertext. |
| `fields` | Field names being sealed (for receiver-side gating). Values stay sealed. |

### `transcript`

| Field | Tier | Description |
| --- | --- | --- |
| `format` | Signed+ | Always `"ohp.turns/v1"` in 0.1. |
| `redaction.policy` | Signed+ | Redaction policy applied (e.g. `pii-mask+pci-drop+phi-mask`). |
| `redaction.version` | Signed+ | Policy version. |
| `turns[]` | Optional | Redacted turn objects with `t`, `role`, `text`. Raw PII / PCI / PHI MUST be replaced with `[REDACTED:<tag>]`. |
| `summary` | All | Short redacted summary. Always present. |

### `memory` (optional)

| Field | Description |
| --- | --- |
| `modelAllowlist` | Array of model family identifiers permitted to consume embeddings. Receivers MUST drop hints not signed for their model family. |
| `embeddings[]` | Array of `{ model, vectorRef }` where vectorRef is sealed under HPKE. |
| `facts[]` | Generic non-PII facts (e.g. preference). PII-laden facts MUST go in `sealed`. |

### `decisions[]` (Regulated only)

See [`05-ai-governance.md`](./05-ai-governance.md#per-decision-provenance).

### `policy`

| Field | Description |
| --- | --- |
| `retention` | Object mapping `{ transcript, audio, embeddings }` to ISO 8601 durations. |
| `redaction` | `{ pii, pci, phi }` mapped to `mask` \| `drop` \| `none`. |
| `guardrails[]` | Array of guardrail identifiers (`no-cross-sell`, `no-payment-collection`, …). |
| `dataResidency[]` | ISO 3166-1 country codes where processing is permitted. |

### `control`

| Field | Description |
| --- | --- |
| `verb` | One of `PROPOSE` \| `ACCEPT` \| `REJECT` \| `ASSUME` \| `RETURN` \| `INCIDENT` (Regulated). |
| `reason` | Structured reason code (see [`02-architecture.md#structured-reject-reasons`](./02-architecture.md#structured-reject-reasons)). |
| `fallback` | Optional `{ verb, after, acceptableReasons }` describing fallback behaviour. |
| `nonce` | Random nonce; with `id` provides replay defence. |

### `transparency` (Regulated)

| Field | Description |
| --- | --- |
| `logId` | Identifier of the transparency log (e.g. `rekor.openhandoffprotocol.org`). |
| `leafHash` | SHA-256 of the canonical CBOR envelope, anchored before send. |

### `signatures[]` (Signed+)

Detached JWS objects over canonical CBOR.

| Field | Description |
| --- | --- |
| `kid` | Key identifier resolvable via JWKS. |
| `alg` | `EdDSA` (Signed+) and `ML-DSA-65` (Regulated). |
| `jws` | The detached JWS. |

For Regulated, both signatures MUST verify.

## Design rules baked into the schema

- **Core-tier mandatory fields:** `ohp`, `conformance`, `id`, `issuedAt`, `notAfter`, `issuer`, `audience`, `session.callId`, `control.verb`. Signed+ adds `signatures`. Sealed+ adds `caller.assurance`, `sealed`. Regulated adds `aiSystem`, `governance`, `oversight`, `decisions`, `transparency`.
- Sensitive values live under `sealed.ciphertext`, addressed by HPKE per-recipient — intermediaries see opaque bytes.
- Identity is a signed SD-JWT VC; the sender chooses which claims to disclose per audience purpose, the IdP signs the claim, the sender cannot inflate it.
- Transcripts carry a redaction policy reference, never raw PII / PCI / PHI. Receivers re-redact on display.
- `memory` hints are opaque, model-allowlisted, and sealed when they contain anything more specific than coarse preferences.
- Signatures are detached over canonical CBOR; re-serialisation in transit doesn't break verification, but any byte change in the canonical form does.
- Envelope hashes are anchored to a public transparency log before send — both parties hold a non-repudiable Signed Note.
